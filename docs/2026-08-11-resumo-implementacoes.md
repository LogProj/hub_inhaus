# Resumo das implementações — sessão de 2026-08

Documento-mãe do que foi construído nesta sessão, cobrindo **hub_inhaus** e a
integração no **hub_amyris**. Serve de índice; cada bloco aponta para os arquivos e
docs específicos.

---

## Parte 1 — hub_inhaus

### 1. Dimensão `dm_cr` (Centro de Resultado) + "o CR resolve o cliente"
- Tabela **`dm_cr`** importada da planilha do ERP (só as 16 colunas de cabeçalho verde),
  chave `cr` **sempre com 5 caracteres** (zero-pad; há alfanuméricos → texto).
  - SQL: `prisma/sql/006_dm_cr.sql` · model `DmCr` no `schema.prisma` · importador
    reutilizável `scripts/importar_dm_cr.py` (openpyxl + psycopg2, upsert por CR).
- **Cada CR já tem seu cliente na base** (`NOME GRP CLIENTE`). Ponte em
  `src/lib/epi/dmcr.ts` (`codigoCrSra`, `clienteDoCr`, `grupoClientePorCrs`).
- No **EPI**, escolher o CR passou a **resolver o cliente automaticamente** (não se digita
  mais cliente): `vincularSetorPorCr` (config.ts) + `POST /api/epi/setor`. A listagem de CRs
  (`listarCrsDisponiveis`) foi enriquecida com o cliente via JOIN em `dm_cr`.

### 2. Sidebar só com telas reais
- `src/lib/domains.ts`: telas não construídas marcadas com `emBreve`; a `DashboardSidebar`
  passou a **ocultar** as `emBreve` e grupos vazios. Sobrou: Geral, RH · Controle de Quadro,
  EPI e Administração.

### 3. Gestão de usuários (global_auth) + papel Segurança + navegação por papel
- Tela **`/dashboards/usuarios`** (admin): listar (paginado) + criar identidade
  (`createGlobalAuthUser` — nome/e-mail/CPF/senha) + conceder **acesso** e **telas visíveis**
  + papel **Segurança**. Anti-lockout. Arquivos: `src/lib/usuarios-admin.ts`,
  `src/lib/admin-guard.ts`, `src/app/api/admin/usuarios/route.ts`,
  `src/components/admin/UsuariosAdmin.tsx`.
- **Papel `SEGURANCA`** (config do EPI sem ser admin do hub), guardado em `epi_membro`
  (papel é texto — sem migração). `podeConfigurar = admin || Segurança`; escopo do
  Segurança = vê tudo.
- **Navegação por papel:** o grupo EPI deixou de depender de `isAdmin`. Admin/Segurança
  veem Configurar/Checklists/Líderes/Acompanhamento + Utilização; **líder vê só Utilização**.
  O layout resolve os sinais (`escopoDoUsuario`) e passa à sidebar.

### 4. Módulo EPI — a virada v1 → v2 (**mudança estrutural**)
- **v1 (marco `v1-epi-liderado`, tag no git):** o **liderado** preenchia o checklist por
  QR + CPF; o líder validava. Documentado em
  `docs/versoes/2026-08-11-v1-epi-preenchimento-liderado.md`.
- **v2 (atual):** quem preenche é o **líder**. Tela **"Utilização de EPIs"** (substitui
  "Validações"): o líder vê os colaboradores do seu CR+turno e, por colaborador, marca cada
  EPI **Conforme / Não conforme** ou o colaborador **Ausente**. 1 registro por turno/dia.
  - Spec: `docs/superpowers/specs/2026-08-11-v2-utilizacao-epis-design.md`.
  - Backend `src/lib/epi/utilizacao.ts` + `POST /api/epi/utilizacao`. Coluna **`ausente`**
    em `epi_resposta` (SQL `007`). Checklists passaram a **parametrizar EPIs**.
  - **Removido:** fluxo público (rotas `/p`, QR/CPF, `PreenchimentoPublico`, `QrLinkPublico`,
    liberação de `/p` no middleware) — preservado na tag v1.

### 5. Painel gerencial de Acompanhamento (mensal)
- `/dashboards/epi/acompanhamento` (Segurança): aderência (donut + tendência), conformidade,
  aderência por CR, pendências por líder (**Recharts**, paleta In-Haus) + tabelas de alerta.
  Métricas em `src/lib/epi/acompanhamento.ts`. *(Adaptação fina ao modelo v2 = próxima fase.)*

### 6. Correções relevantes
- **Build na Vercel:** `postinstall: prisma generate` (o `prisma generate` só gera o Client,
  não toca no banco — não viola a regra de nunca dropar a SRA).
- **Configurar:** passou a mostrar **todos os CRs da base** (nomear líder cria vínculo; o
  filtro antigo escondia esses CRs).
- **Líder não via Utilização:** `escopoDoUsuario` só resolvia turnos com papel "LIDER" em
  `epi_membro`, mas líder é definido por **`LiderCr`** — agora resolve sempre pelo LiderCr.
- **Pool de conexões (Prisma):** limpeza de conexões `idle` acumuladas + `connection_limit=5`
  no `DATABASE_URL` (dev). **Em produção (Vercel), fazer o mesmo no env.**

### Commits (após `fc18174`)
```
efe321c fix(epi): lider enxerga Utilizacao; telas visiveis so as reais
d5b0774 feat(v2): Utilizacao de EPIs — o lider preenche por colaborador
bd17bc8 docs: spec da v2
a376dfb docs: documenta a versao v1
81cf7cc feat: painel gerencial de Acompanhamento de EPI
e42cedb fix: Configurar mostra todos os CRs da base
64de3d6 feat: dm_cr, autosservico do EPI e gestao de usuarios
a14f732 fix: prisma generate no build (Vercel)
```
Tag: **`v1-epi-liderado`** (restaurar: `git switch -c reviver-v1 v1-epi-liderado`).

---

## Parte 2 — hub_amyris (painel de EPI read-only)

O painel de EPI foi replicado no **hub_amyris**, mostrando **apenas o CR da AMYRIS**
(`96735 · AMYRIS - BARRA BONITA`), **lendo** os dados do mesmo `db_inhaus`.

- **Só leitura, sem risco:** usa o pool `pg` `inhausPool` já existente (padrão do
  `turnover.ts`), **nunca** Prisma, **nunca** escrita — só `SELECT`.
- CR definido pela env **`EPI_CR_FIXO`**.
- Arquivos: `src/lib/epi.ts`, `src/components/dashboard/EpiCharts.tsx` (Recharts, roxo
  `#4B0085`), `src/app/dashboards/epi/page.tsx`, registro em `src/lib/screens.ts` e item EPI
  na sidebar (grupo Gestão). Doc: `hub_amyris/docs/dashboard-epi.md`.
- Verificado: aderência 79% (61/77), 2 não conformes, 2 ausências — batendo com o seed.
- Commit no hub_amyris: `187371f` (**só os arquivos de EPI**; o resto do sistema ficou
  intocado). Sem push (deploy é decisão do dono).

---

## Ambiente (variáveis)

**hub_inhaus (`.env.local` / Vercel):** `DATABASE_URL` (+ `?connection_limit=5&pool_timeout=20`),
`DATABASE_URL_INHAUS`, `AUTH_BASE_URL`, `AUTH_API_KEY`, `EPI_CPF_SECRET`,
`BOOTSTRAP_ADMIN_EMAILS` (default já inclui `fernando.c.souza@gpssa.com.br` = admin).
Nunca setar `HUB_ACESSO_LIVRE` em produção.

**hub_amyris (`.env.local` / Vercel):** `DATABASE_URL_INHAUS` (mesmo `db_inhaus`) e a nova
**`EPI_CR_FIXO`**.

> ⚠️ O `.env.example` **não** guarda segredos (a `AUTH_API_KEY` real foi removida dele nesta
> sessão). Valores reais só no `.env.local` (git-ignored) e no host.

---

## Estado de deploy

- **hub_inhaus:** `efe321c` **enviado** à `main` (Vercel builda). Pendências no host:
  confirmar envs + adicionar `connection_limit` ao `DATABASE_URL` da Vercel.
- **hub_amyris:** painel EPI **commitado localmente** (`187371f`), **sem push**. Para deploy:
  setar `EPI_CR_FIXO` + `DATABASE_URL_INHAUS` na Vercel do amyris.

## Dados de teste (reversíveis)
- `scripts/seed_epi_demo.mjs` (v1) e `scripts/seed_v2_amyris.mjs` (v2, AMYRIS) — ambos com
  `--limpar`. Nesta sessão os dados transacionais de EPI foram zerados e recriados só para o
  AMYRIS (poucas não conformidades/ausências). Só o checklist **"Teste"** (Capacete, Luva,
  Bota, Óculos) permaneceu; todos os CRs foram religados a ele.

## Próximos passos sugeridos
- **Fase B** do Acompanhamento (hub_inhaus): adaptar as métricas ao modelo v2 (ausência como
  métrica própria; "pendência do líder" = turno/dia sem registro).
- Deploy do amyris (com as envs) quando desejado.
- Considerar um **pooler (PgBouncer)** na frente do `db_inhaus` (banco compartilhado, muitos
  consumidores serverless).
