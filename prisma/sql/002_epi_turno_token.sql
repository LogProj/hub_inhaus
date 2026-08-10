-- Migração ADITIVA: token público estável do turno (usado no QR/link).
-- Idempotente. Ver regra em CLAUDE.md: NUNCA usar prisma db push neste banco.

ALTER TABLE "epi_turno" ADD COLUMN IF NOT EXISTS "token_publico" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "epi_turno_token_publico_key"
  ON "epi_turno"("token_publico");
