-- Opções customizadas das listas do formulário de desvio, por contratante.
-- SQL MANUAL idempotente (banco compartilhado com a SRA; NUNCA prisma db push).

CREATE TABLE IF NOT EXISTS desvio_opcao (
  id             serial PRIMARY KEY,
  contratante_id integer NOT NULL,
  campo          text NOT NULL,
  valor          text NOT NULL,
  criado_em      timestamp NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS desvio_opcao_uq
  ON desvio_opcao (contratante_id, campo, valor);
CREATE INDEX IF NOT EXISTS desvio_opcao_campo_idx
  ON desvio_opcao (contratante_id, campo);

DO $$ BEGIN
  ALTER TABLE desvio_opcao
    ADD CONSTRAINT desvio_opcao_contratante_fk
    FOREIGN KEY (contratante_id) REFERENCES cliente_contratante (id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
