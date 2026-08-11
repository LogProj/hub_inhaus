-- v2 — Utilização de EPIs (o líder preenche por colaborador).
-- Aditivo e idempotente. Ver regra em CLAUDE.md: NUNCA usar prisma db push.
--
-- A resposta passa a ser preenchida pelo LÍDER, por colaborador. "ausente" marca
-- que o colaborador não estava presente (não preenche EPI). Presente → respostas
-- guarda [{ epiId, epi, conforme }].

ALTER TABLE "epi_resposta" ADD COLUMN IF NOT EXISTS "ausente" BOOLEAN NOT NULL DEFAULT false;
