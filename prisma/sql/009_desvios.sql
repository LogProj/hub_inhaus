-- Módulo Clientes: Cliente Contratante (tenant) + Desvios.
-- SQL MANUAL idempotente (o banco é compartilhado com a SRA; NUNCA prisma db push).

CREATE TABLE IF NOT EXISTS cliente_contratante (
  id        serial PRIMARY KEY,
  nome      text NOT NULL UNIQUE,
  slug      text NOT NULL UNIQUE,
  ativo     boolean NOT NULL DEFAULT true,
  criado_em timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS auth_user_contratante (
  id             serial PRIMARY KEY,
  auth_user_id   text NOT NULL,
  contratante_id integer NOT NULL,
  criado_em      timestamp NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS auth_user_contratante_uq
  ON auth_user_contratante (auth_user_id, contratante_id);
CREATE INDEX IF NOT EXISTS auth_user_contratante_user_idx
  ON auth_user_contratante (auth_user_id);

CREATE TABLE IF NOT EXISTS desvio (
  id                  serial PRIMARY KEY,
  contratante_id      integer NOT NULL,
  responsavel_interno text,
  numero_otb_wbs      text,
  tipo                text,
  divisao             text,
  solicitante         text,
  data_ocorrencia     date,
  cliente_final       text,
  motivo              text,
  causa_raiz          text,
  resumo_caso         text,
  solucao             text,
  status              text NOT NULL DEFAULT 'EM_TRATATIVA',
  data_faturamento    date,
  data_separacao      date,
  valor               numeric(14,2),
  criado_por          text,
  atualizado_por      text,
  criado_em           timestamp NOT NULL DEFAULT now(),
  atualizado_em       timestamp NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS desvio_contratante_idx ON desvio (contratante_id);
CREATE INDEX IF NOT EXISTS desvio_status_idx ON desvio (status);

DO $$ BEGIN
  ALTER TABLE auth_user_contratante
    ADD CONSTRAINT auth_user_contratante_contratante_fk
    FOREIGN KEY (contratante_id) REFERENCES cliente_contratante (id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE desvio
    ADD CONSTRAINT desvio_contratante_fk
    FOREIGN KEY (contratante_id) REFERENCES cliente_contratante (id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

INSERT INTO cliente_contratante (nome, slug)
VALUES ('Atlas Copco', 'atlas')
ON CONFLICT (nome) DO NOTHING;
