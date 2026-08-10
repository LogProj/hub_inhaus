-- Migração ADITIVA: presença por liderado numa sessão (marcada pelo líder na
-- validação). Resolve escalas de revezamento como 12x36. Idempotente.
-- Ver regra em CLAUDE.md: NUNCA usar prisma db push neste banco.

CREATE TABLE IF NOT EXISTS "epi_presenca_sessao" (
    "id" SERIAL NOT NULL,
    "sessao_id" INTEGER NOT NULL,
    "cpf_hash" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "presente" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "epi_presenca_sessao_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "epi_presenca_sessao_sessao_id_cpf_hash_key"
  ON "epi_presenca_sessao"("sessao_id", "cpf_hash");

DO $$ BEGIN
    ALTER TABLE "epi_presenca_sessao" ADD CONSTRAINT "epi_presenca_sessao_sessao_id_fkey"
      FOREIGN KEY ("sessao_id") REFERENCES "epi_sessao_turno"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
