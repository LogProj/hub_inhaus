-- 008_isolamento_cr.sql — Isolamento de dados por CR/cliente.
-- Idempotente. NUNCA usar prisma db push neste banco compartilhado (ver CLAUDE.md).
-- Aplica: classificacao em auth_users; tabelas de vínculo; coluna cr_cod nas
-- tabelas de DADOS de EPI (+ backfill); e as policies RLS DORMENTES.

-- 1) Classificação local do usuário (INTERNO | CLIENTE). Default INTERNO.
ALTER TABLE "auth_users"
  ADD COLUMN IF NOT EXISTS "classificacao" TEXT NOT NULL DEFAULT 'INTERNO';

-- 2) Vínculos de escopo.
CREATE TABLE IF NOT EXISTS "auth_user_cliente" (
  "id"               SERIAL PRIMARY KEY,
  "auth_user_id"     TEXT NOT NULL,
  "nome_grp_cliente" TEXT NOT NULL,
  "criado_em"        TIMESTAMP NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS "auth_user_cliente_uq"
  ON "auth_user_cliente" ("auth_user_id", "nome_grp_cliente");
CREATE INDEX IF NOT EXISTS "auth_user_cliente_user_idx"
  ON "auth_user_cliente" ("auth_user_id");

CREATE TABLE IF NOT EXISTS "auth_user_cr" (
  "id"           SERIAL PRIMARY KEY,
  "auth_user_id" TEXT NOT NULL,
  "cr"           VARCHAR(5) NOT NULL,
  "criado_em"    TIMESTAMP NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS "auth_user_cr_uq"
  ON "auth_user_cr" ("auth_user_id", "cr");
CREATE INDEX IF NOT EXISTS "auth_user_cr_user_idx"
  ON "auth_user_cr" ("auth_user_id");

-- 3) cr_cod (código 5 chars) nas tabelas de DADOS de EPI. Desnormalizado onde o
--    CR não está na própria linha (sessão/presença/validação).
ALTER TABLE "epi_turno"             ADD COLUMN IF NOT EXISTS "cr_cod" VARCHAR(5);
ALTER TABLE "epi_atribuicao_turno"  ADD COLUMN IF NOT EXISTS "cr_cod" VARCHAR(5);
ALTER TABLE "epi_resposta"          ADD COLUMN IF NOT EXISTS "cr_cod" VARCHAR(5);
ALTER TABLE "epi_sessao_turno"      ADD COLUMN IF NOT EXISTS "cr_cod" VARCHAR(5);
ALTER TABLE "epi_presenca_sessao"   ADD COLUMN IF NOT EXISTS "cr_cod" VARCHAR(5);
ALTER TABLE "epi_validacao_sessao"  ADD COLUMN IF NOT EXISTS "cr_cod" VARCHAR(5);

-- Função local de derivação (espelha codigoCr). CREATE OR REPLACE é idempotente.
CREATE OR REPLACE FUNCTION "cr_codigo"(bruto TEXT) RETURNS VARCHAR(5) AS $$
  SELECT CASE
    WHEN bruto IS NULL OR btrim(bruto) = '' THEN NULL
    WHEN length(split_part(btrim(bruto),' - ',1)) < 5
      THEN lpad(split_part(btrim(bruto),' - ',1),5,'0')
    ELSE left(split_part(btrim(bruto),' - ',1),5)
  END;
$$ LANGUAGE sql IMMUTABLE;

-- 4) Backfill do cr_cod a partir do CR bruto existente / da origem.
UPDATE "epi_turno"            SET "cr_cod" = "cr_codigo"("cr") WHERE "cr_cod" IS NULL;
UPDATE "epi_atribuicao_turno" SET "cr_cod" = "cr_codigo"("cr") WHERE "cr_cod" IS NULL;
UPDATE "epi_resposta"         SET "cr_cod" = "cr_codigo"("cr") WHERE "cr_cod" IS NULL;

UPDATE "epi_sessao_turno" s
   SET "cr_cod" = t."cr_cod"
  FROM "epi_turno" t
 WHERE s."turno_id" = t."id" AND s."cr_cod" IS NULL;

UPDATE "epi_presenca_sessao" p
   SET "cr_cod" = s."cr_cod"
  FROM "epi_sessao_turno" s
 WHERE p."sessao_id" = s."id" AND p."cr_cod" IS NULL;

UPDATE "epi_validacao_sessao" v
   SET "cr_cod" = s."cr_cod"
  FROM "epi_sessao_turno" s
 WHERE v."sessao_id" = s."id" AND v."cr_cod" IS NULL;

CREATE INDEX IF NOT EXISTS "epi_resposta_crcod_idx"     ON "epi_resposta" ("cr_cod");
CREATE INDEX IF NOT EXISTS "epi_atribuicao_crcod_idx"   ON "epi_atribuicao_turno" ("cr_cod");
CREATE INDEX IF NOT EXISTS "epi_sessao_crcod_idx"       ON "epi_sessao_turno" ("cr_cod");

-- 5) RLS — DORMENTE. A conexão do hub é superusuário (postgres), que IGNORA RLS
--    mesmo com FORCE. Estas policies SÓ passam a valer se o hub, no futuro, usar um
--    role NÃO-superusuário. Deixadas prontas e comentadas de propósito; a trava
--    efetiva HOJE é a aplicação (Trava 1 + Trava 2). NÃO descomentar sem antes
--    criar o role dedicado e trocar a connection string (fora do escopo atual).
--
-- ALTER TABLE "epi_resposta" ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE "epi_resposta" FORCE  ROW LEVEL SECURITY;
-- CREATE POLICY "epi_resposta_por_cr" ON "epi_resposta"
--   USING (
--     current_setting('app.bypass_rls', true) = 'on'
--     OR "cr_cod" = ANY (string_to_array(current_setting('app.crs_permitidos', true), ','))
--   );
-- (repetir o mesmo padrão para epi_atribuicao_turno, epi_sessao_turno,
--  epi_presenca_sessao, epi_validacao_sessao e para a leitura da SRA.)
