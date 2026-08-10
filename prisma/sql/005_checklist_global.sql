-- Migração ADITIVA: checklist vira BIBLIOTECA GLOBAL (não preso a cliente/CR) e o
-- CR passa a apontar para o checklist que usa. Idempotente.
-- Ver regra em CLAUDE.md: NUNCA usar prisma db push neste banco.

-- 1) checklist template global: cliente_id e cr deixam de ser obrigatórios.
ALTER TABLE "epi_checklist_template" ALTER COLUMN "cliente_id" DROP NOT NULL;
ALTER TABLE "epi_checklist_template" ALTER COLUMN "cr" DROP NOT NULL;

-- 2) CR aponta para o checklist que usa.
ALTER TABLE "epi_cliente_cr" ADD COLUMN IF NOT EXISTS "checklist_template_id" INTEGER;

DO $$ BEGIN
    ALTER TABLE "epi_cliente_cr" ADD CONSTRAINT "epi_cliente_cr_checklist_template_id_fkey"
      FOREIGN KEY ("checklist_template_id") REFERENCES "epi_checklist_template"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 3) migra os vínculos existentes: cada CR aponta para o checklist que já tinha
--    (o template legado com o mesmo cliente_id + cr, o mais recente).
UPDATE "epi_cliente_cr" cc
   SET "checklist_template_id" = (
       SELECT t."id" FROM "epi_checklist_template" t
        WHERE t."cr" = cc."cr" AND t."cliente_id" = cc."cliente_id"
        ORDER BY t."id" DESC LIMIT 1
   )
 WHERE cc."checklist_template_id" IS NULL;
