-- Módulo de Treinamentos — registro de presença por QR.
-- SQL MANUAL idempotente (banco compartilhado com a SRA; NUNCA prisma db push).

CREATE TABLE IF NOT EXISTS treinamento_responsavel (
  id        text PRIMARY KEY,
  nome      text NOT NULL,
  ativo     boolean NOT NULL DEFAULT true,
  criado_em timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS treinamento (
  id             text PRIMARY KEY,
  nome           text NOT NULL,
  data           date NOT NULL,
  duracao_horas  numeric(4,2) NOT NULL,
  responsavel_id text NOT NULL,
  status         text NOT NULL DEFAULT 'ABERTO',
  token_publico  text NOT NULL,
  criado_por_id  text,
  criado_em      timestamp NOT NULL DEFAULT now(),
  atualizado_em  timestamp NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS treinamento_token_uq ON treinamento (token_publico);

CREATE TABLE IF NOT EXISTS treinamento_presenca (
  id                text PRIMARY KEY,
  treinamento_id    text NOT NULL,
  cpf_hash          text NOT NULL,
  nome_colab        text,
  cr_cod            varchar(5),
  cr_nome           text,
  cargo             text,
  matricula         text,
  localizado_na_sra boolean NOT NULL,
  confirmado_em     timestamp NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS treinamento_presenca_uq
  ON treinamento_presenca (treinamento_id, cpf_hash);

DO $$ BEGIN
  ALTER TABLE treinamento
    ADD CONSTRAINT treinamento_responsavel_fk
    FOREIGN KEY (responsavel_id) REFERENCES treinamento_responsavel (id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE treinamento_presenca
    ADD CONSTRAINT treinamento_presenca_treino_fk
    FOREIGN KEY (treinamento_id) REFERENCES treinamento (id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
