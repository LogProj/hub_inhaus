-- Treinamentos — CPF em claro APENAS dos não localizados na SRA.
-- Para localizados a coluna fica NULL (identidade continua só no hash).
-- SQL MANUAL idempotente (banco compartilhado com a SRA; NUNCA prisma db push).

ALTER TABLE treinamento_presenca
  ADD COLUMN IF NOT EXISTS cpf_texto varchar(11);
