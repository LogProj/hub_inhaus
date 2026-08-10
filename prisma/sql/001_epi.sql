-- Migração ADITIVA do módulo de EPI (tabelas epi_*).
--
-- POR QUE SQL MANUAL, E NÃO `prisma db push`:
-- O banco (db_inhaus) é COMPARTILHADO: além das tabelas do hub (auth_users, epi_*),
-- ele guarda as tabelas da SRA alimentadas pela RPA (ft_colaboradores_sra,
-- ft_colaboradores_sra_diario, ft_ponto_smartcontrol, cfg_cargos_excluidos). O
-- `prisma db push` assume ser dono de TODO o schema `public` e tentaria DROPAR
-- essas tabelas (elas não estão no schema.prisma). Por isso o schema das tabelas
-- do hub é aplicado por este SQL idempotente, nunca por push/migrate.
--
-- Idempotente: pode rodar mais de uma vez sem erro. Mantém-se em sincronia com
-- prisma/schema.prisma (models Cliente..ValidacaoSessao). `auth_users` já existe
-- e não é tocada aqui.

CREATE TABLE IF NOT EXISTS "epi_cliente" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "epi_cliente_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "epi_cliente_cr" (
    "id" SERIAL NOT NULL,
    "cliente_id" INTEGER NOT NULL,
    "cr" TEXT NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "epi_cliente_cr_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "epi_turno" (
    "id" SERIAL NOT NULL,
    "cliente_id" INTEGER NOT NULL,
    "cr" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "dias_semana" INTEGER[],
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "epi_turno_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "epi_checklist_template" (
    "id" SERIAL NOT NULL,
    "cliente_id" INTEGER NOT NULL,
    "cr" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "epi_checklist_template_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "epi_checklist_versao" (
    "id" SERIAL NOT NULL,
    "template_id" INTEGER NOT NULL,
    "versao" INTEGER NOT NULL,
    "publicado_em" TIMESTAMP(3),
    "itens" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "epi_checklist_versao_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "epi_membro" (
    "id" SERIAL NOT NULL,
    "auth_user_id" TEXT NOT NULL,
    "papel" TEXT NOT NULL,
    "cliente_id" INTEGER,
    "cr" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "epi_membro_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "epi_atribuicao_turno" (
    "id" SERIAL NOT NULL,
    "turno_id" INTEGER NOT NULL,
    "cr" TEXT NOT NULL,
    "cpf_hash" TEXT NOT NULL,
    "matricula" TEXT,
    "inicio_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fim_em" TIMESTAMP(3),
    CONSTRAINT "epi_atribuicao_turno_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "epi_responsavel_turno" (
    "id" SERIAL NOT NULL,
    "turno_id" INTEGER NOT NULL,
    "auth_user_id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "inicio_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fim_em" TIMESTAMP(3),
    CONSTRAINT "epi_responsavel_turno_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "epi_sessao_turno" (
    "id" SERIAL NOT NULL,
    "turno_id" INTEGER NOT NULL,
    "checklist_versao_id" INTEGER NOT NULL,
    "data" DATE NOT NULL,
    "token" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ABERTA',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "epi_sessao_turno_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "epi_resposta" (
    "id" SERIAL NOT NULL,
    "sessao_id" INTEGER NOT NULL,
    "cpf_hash" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "cargo" TEXT,
    "cr" TEXT NOT NULL,
    "respostas" JSONB NOT NULL,
    "conforme" BOOLEAN NOT NULL,
    "respondido_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "epi_resposta_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "epi_validacao_sessao" (
    "id" SERIAL NOT NULL,
    "sessao_id" INTEGER NOT NULL,
    "auth_user_id" TEXT NOT NULL,
    "nome_lider" TEXT NOT NULL,
    "validado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "hash_conteudo" TEXT NOT NULL,
    "assinatura" TEXT,
    CONSTRAINT "epi_validacao_sessao_pkey" PRIMARY KEY ("id")
);

-- Índices e uniques
CREATE UNIQUE INDEX IF NOT EXISTS "epi_cliente_cr_cr_key" ON "epi_cliente_cr"("cr");
CREATE INDEX IF NOT EXISTS "epi_turno_cliente_id_idx" ON "epi_turno"("cliente_id");
CREATE INDEX IF NOT EXISTS "epi_turno_cr_idx" ON "epi_turno"("cr");
CREATE INDEX IF NOT EXISTS "epi_checklist_template_cliente_id_idx" ON "epi_checklist_template"("cliente_id");
CREATE INDEX IF NOT EXISTS "epi_checklist_template_cr_idx" ON "epi_checklist_template"("cr");
CREATE UNIQUE INDEX IF NOT EXISTS "epi_checklist_versao_template_id_versao_key" ON "epi_checklist_versao"("template_id", "versao");
CREATE INDEX IF NOT EXISTS "epi_membro_auth_user_id_idx" ON "epi_membro"("auth_user_id");
CREATE INDEX IF NOT EXISTS "epi_atribuicao_turno_turno_id_idx" ON "epi_atribuicao_turno"("turno_id");
CREATE INDEX IF NOT EXISTS "epi_atribuicao_turno_cr_cpf_hash_idx" ON "epi_atribuicao_turno"("cr", "cpf_hash");
CREATE INDEX IF NOT EXISTS "epi_responsavel_turno_turno_id_idx" ON "epi_responsavel_turno"("turno_id");
CREATE INDEX IF NOT EXISTS "epi_responsavel_turno_auth_user_id_idx" ON "epi_responsavel_turno"("auth_user_id");
CREATE UNIQUE INDEX IF NOT EXISTS "epi_sessao_turno_token_key" ON "epi_sessao_turno"("token");
CREATE UNIQUE INDEX IF NOT EXISTS "epi_sessao_turno_turno_id_data_key" ON "epi_sessao_turno"("turno_id", "data");
CREATE UNIQUE INDEX IF NOT EXISTS "epi_resposta_sessao_id_cpf_hash_key" ON "epi_resposta"("sessao_id", "cpf_hash");
CREATE UNIQUE INDEX IF NOT EXISTS "epi_validacao_sessao_sessao_id_key" ON "epi_validacao_sessao"("sessao_id");

-- Foreign keys (idempotentes via DO block: ignora se já existir)
DO $$ BEGIN
    ALTER TABLE "epi_cliente_cr" ADD CONSTRAINT "epi_cliente_cr_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "epi_cliente"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
    ALTER TABLE "epi_turno" ADD CONSTRAINT "epi_turno_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "epi_cliente"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
    ALTER TABLE "epi_checklist_template" ADD CONSTRAINT "epi_checklist_template_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "epi_cliente"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
    ALTER TABLE "epi_checklist_versao" ADD CONSTRAINT "epi_checklist_versao_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "epi_checklist_template"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
    ALTER TABLE "epi_atribuicao_turno" ADD CONSTRAINT "epi_atribuicao_turno_turno_id_fkey" FOREIGN KEY ("turno_id") REFERENCES "epi_turno"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
    ALTER TABLE "epi_responsavel_turno" ADD CONSTRAINT "epi_responsavel_turno_turno_id_fkey" FOREIGN KEY ("turno_id") REFERENCES "epi_turno"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
    ALTER TABLE "epi_sessao_turno" ADD CONSTRAINT "epi_sessao_turno_turno_id_fkey" FOREIGN KEY ("turno_id") REFERENCES "epi_turno"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
    ALTER TABLE "epi_sessao_turno" ADD CONSTRAINT "epi_sessao_turno_checklist_versao_id_fkey" FOREIGN KEY ("checklist_versao_id") REFERENCES "epi_checklist_versao"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
    ALTER TABLE "epi_resposta" ADD CONSTRAINT "epi_resposta_sessao_id_fkey" FOREIGN KEY ("sessao_id") REFERENCES "epi_sessao_turno"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
    ALTER TABLE "epi_validacao_sessao" ADD CONSTRAINT "epi_validacao_sessao_sessao_id_fkey" FOREIGN KEY ("sessao_id") REFERENCES "epi_sessao_turno"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
