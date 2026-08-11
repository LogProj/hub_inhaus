# Versão v1 — EPI com preenchimento pelo liderado (marco reutilizável)

**Data:** 2026-08-11 · **Tag git:** `v1-epi-liderado` · **Commit:** `81cf7cc`

Snapshot da versão do hub **antes** da mudança para "o líder responde o checklist
por colaborador". Guardado para reutilização futura. Para voltar a esta versão:

```bash
git checkout v1-epi-liderado          # inspecionar
git switch -c reviver-v1 v1-epi-liderado   # ramo a partir dela
```

---

## O que esta versão faz

### Fundação e navegação
- Hub In-Haus (Next.js 14, Prisma, Postgres compartilhado `db_inhaus`), login via
  **global_auth**, sidebar mostrando **só as telas existentes**.
- **Navegação por papel** no EPI: admin/**Segurança** veem tudo; **líder** vê só
  Validações + Acompanhamento é da Segurança.

### Dimensão `dm_cr` + CR resolve o cliente
- Tabela `dm_cr` (importada do ERP, `scripts/importar_dm_cr.py`): cada CR já tem seu
  cliente (`NOME GRP CLIENTE`). CR **sempre vem da base** — nunca é cadastrado à mão.
- Assistente **Configurar** por CR: escolher o CR resolve o cliente; turno padronizado
  (Turno 1/2/3/Administrativo); checklist só da biblioteca; mostra os líderes do CR.
- **Líderes por CR**: escolher o CR (da base) e nomear os líderes.

### Gestão de usuários (global_auth)
- Tela **Usuários** (admin): listar/criar identidade + conceder acesso + **telas
  visíveis** + papel **Segurança**. Bootstrap admin: `fernando.c.souza@gpssa.com.br`.

### Módulo de EPI — MODELO DESTA VERSÃO (o que vai mudar)
- **Preenchimento pelo LIDERADO**: rota pública `/p/<token>` (QR). O colaborador
  escolhe o nome, digita CPF (conferido por HMAC) e marca cada item Conforme/Não
  conforme **para si mesmo**.
- **Validação pelo LÍDER**: `/dashboards/epi/validacoes` — o líder revisa, marca
  presença (Presente/Ausente, resolve 12x36) e fecha a sessão.
- **Checklist** = biblioteca global versionada de itens/perguntas (não é lista de EPIs
  por colaborador).

### Painel gerencial de Acompanhamento (mensal)
- `/dashboards/epi/acompanhamento` (Segurança): aderência do mês (donut + tendência),
  conformidade, aderência por CR, pendências por líder (Recharts) + tabelas de alerta:
  sem preenchimento, não conformidade, líder com validações pendentes, turno sem sessão.
- Regra de aderência: **preenchimentos ÷ esperados** (dias esperados × pessoas alocadas).

---

## Modelo de dados (tabelas `epi_*`)
`epi_cliente`, `epi_cliente_cr`, `epi_turno`, `epi_lider_cr`, `epi_membro`,
`epi_atribuicao_turno`, `epi_checklist_template`, `epi_checklist_versao`,
`epi_sessao_turno`, `epi_resposta`, `epi_presenca_sessao`, `epi_validacao_sessao`.
Criadas por SQL manual idempotente em `prisma/sql/*.sql` (NUNCA `prisma db push`).

## Dados de demonstração
`node scripts/seed_epi_demo.mjs` cria um mês de sessões (reversível, tokens `seed-*`);
`--limpar` remove. Usado para exercitar o painel de acompanhamento.

## Verificação desta versão
`npx tsc --noEmit` limpo · `npm run build` verde · Playwright 17/17 nas telas.

---

## Próxima versão (v2) — o que muda
O preenchimento deixa de ser feito pelo **liderado** e passa a ser feito pelo **líder**,
que responde o checklist **por colaborador do seu turno**, marcando por EPI
**Conforme / Não Conforme / Ausente**. Os **EPIs** passam a ser parametrizados pela
Segurança. Ver o design da v2 em `docs/superpowers/specs/`.
