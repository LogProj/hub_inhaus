-- Migração ADITIVA: líder por CR (setor) de um cliente. Um líder pode responder
-- por vários CRs; um CR pode ter mais de um líder. Idempotente.
-- Ver regra em CLAUDE.md: NUNCA usar prisma db push neste banco.

CREATE TABLE IF NOT EXISTS "epi_lider_cr" (
    "id" SERIAL NOT NULL,
    "cliente_id" INTEGER NOT NULL,
    "cr" TEXT NOT NULL,
    "auth_user_id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "inicio_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fim_em" TIMESTAMP(3),
    CONSTRAINT "epi_lider_cr_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "epi_lider_cr_cliente_id_idx" ON "epi_lider_cr"("cliente_id");
CREATE INDEX IF NOT EXISTS "epi_lider_cr_auth_user_id_idx" ON "epi_lider_cr"("auth_user_id");
CREATE INDEX IF NOT EXISTS "epi_lider_cr_cr_idx" ON "epi_lider_cr"("cr");

DO $$ BEGIN
    ALTER TABLE "epi_lider_cr" ADD CONSTRAINT "epi_lider_cr_cliente_id_fkey"
      FOREIGN KEY ("cliente_id") REFERENCES "epi_cliente"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
