-- Cadastra o contratante Enjoei (portal de cliente). Idempotente.
-- A tabela cliente_contratante já foi criada em 009_desvios.sql.

INSERT INTO cliente_contratante (nome, slug)
VALUES ('Enjoei', 'enjoei')
ON CONFLICT (nome) DO NOTHING;
