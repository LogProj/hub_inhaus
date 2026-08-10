-- Dimensão de Centro de Resultado (CR) — dm_cr.
-- Fonte: planilha "Centro_de_Custo" do ERP (apenas as colunas de cabeçalho VERDE).
-- Serve para COMPLEMENTAR o contrato: pelo CR chega-se ao NOME GRP CLIENTE (o
-- cliente do contrato), evitando redigitar o nome do cliente no sistema.
-- Idempotente. Ver regra em CLAUDE.md: NUNCA usar prisma db push neste banco.
--
-- Regra do CR: SEMPRE 5 caracteres. CRs numéricos com menos de 5 dígitos são
-- preenchidos com zeros à esquerda na importação (ex.: "1489" -> "01489"). Há CRs
-- alfanuméricos (ex.: "C95DR"), por isso a coluna é TEXTO, nunca inteiro.

CREATE TABLE IF NOT EXISTS "dm_cr" (
  "cr"                VARCHAR(5) PRIMARY KEY,
  "data_inicio_cr"    DATE,
  "bloqueio"          TEXT,
  "descri_cr"         TEXT,
  "regional"          TEXT,
  "conq_perd"         TEXT,
  "descri_negocio"    TEXT,
  "descri_solucao"    TEXT,
  "nome_cliente"      TEXT,
  "nome_grp_cliente"  TEXT,
  "pec"               TEXT,
  "diretor_executivo" TEXT,
  "diretor_regional"  TEXT,
  "gerente_regional"  TEXT,
  "gerente"           TEXT,
  "supervisor"        TEXT,
  "atualizado_em"     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Consultas comuns: por grupo de cliente e por regional.
CREATE INDEX IF NOT EXISTS "dm_cr_nome_grp_cliente_idx" ON "dm_cr" ("nome_grp_cliente");
CREATE INDEX IF NOT EXISTS "dm_cr_regional_idx" ON "dm_cr" ("regional");
