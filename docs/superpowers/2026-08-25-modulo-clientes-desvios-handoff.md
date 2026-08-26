# Handoff — Módulo Clientes / Desvios (Atlas Copco) + Modelo de Visibilidade

Data: 2026-08-25/26 · Branch: `main` (deploy de produção via Vercel no push da main).
Este documento resume TUDO que foi construído nesta frente, para continuar em outra sessão.

---

## 1. Visão geral

Foi criado o **primeiro módulo de cliente do hub** (Atlas Copco) — um controle de
**Desvios (ocorrências)** — e, junto, o **modelo de governança de visibilidade** que
padroniza "quem vê o quê". Origem dos dados: planilha
`C:\Users\fernando.c.souza\Documents\Projetos\0.1 ATLAS COPCO\0.1 CONTROLE DE ADERÊNCIA\Controle de Aderência.xlsx`,
aba **Ocorrências LOG** (importadas só as 40 linhas com Responsável Interno = "GPS").

Specs/planos:
- `docs/superpowers/specs/2026-08-24-visibilidade-e-desvios-atlas-design.md`
- `docs/superpowers/plans/2026-08-24-visibilidade-e-desvios-atlas.md`
- `docs/superpowers/specs/2026-08-25-padronizacao-visibilidade-clientes-design.md`

---

## 2. Modelo de governança (dois eixos + portal do cliente)

- **Eixo 1 — QUAIS TELAS** (visibilidade de funcionalidade): `AuthUser.visibleScreens[]`
  (chaves de `src/lib/domains.ts`) + `isAdmin`. A sidebar e as páginas honram isso.
- **Eixo 2 — QUAIS DADOS** (recorte de linhas): para os desvios, o escopo é **derivado
  das telas concedidas** — quem tem as telas de um cliente vê os dados daquele cliente
  (`src/lib/desvios/escopo-usuario.ts`). Admin interno vê tudo; cliente nunca vê tudo;
  sem tela de cliente ⇒ nada (fail-closed). (Existe também o isolamento por CR da SRA —
  `src/lib/seguranca/escopo-dados.ts` — para o Controle de Quadro; ver §8.)
- **Classificação** `INTERNO | CLIENTE` (`auth_users.classificacao`). CLIENTE dispara o
  **portal enxuto** (só as telas dele, com a logo do cliente) e nunca recebe escopo total.

### Camadas de segurança do cliente (defesa em profundidade)
1. **Sidebar em modo portal** (CLIENTE): só as telas do cliente.
2. **Trava central no layout** (`src/app/dashboards/layout.tsx`): um CLIENTE que tente
   abrir QUALQUER rota fora das telas concedidas (mesmo via URL) é redirecionado à tela
   dele. O caminho vem do header `x-pathname` setado no `middleware.ts`.
3. **Guarda por página** `assertTelaVisivel(telaKey)` (`src/lib/dashboard-acesso.ts`) nas
   telas de desvios.
4. **Escopo de dados fail-closed** nas queries de desvio (2 travas, §5).

---

## 3. Banco de dados (SQL manual idempotente — NUNCA `prisma db push`)

Aplicado no mesmo Postgres compartilhado (DATABASE_URL). Arquivos:
- `prisma/sql/009_desvios.sql` — `cliente_contratante`, `auth_user_contratante`, `desvio`
  (+ FKs; semeia o contratante **Atlas Copco** slug `atlas`).
- `prisma/sql/010_desvio_opcao.sql` — `desvio_opcao` (opções extras das listas por cliente).

Models Prisma: `ClienteContratante`, `AuthUserContratante`, `Desvio`, `DesvioOpcao`
(fim de `prisma/schema.prisma`). Após aplicar SQL: `npm run db:generate` (parar o dev
server antes, pois ele trava a DLL do query engine no Windows).

**Estado atual dos dados:** 40 desvios GPS importados na Atlas — status
`EM_TRATATIVA` 30 · `PENDENTE` 6 · `CONCLUIDA` 4 (`criado_por='seed:gps'`).

### Import / seed (reversível e idempotente)
- `scripts/extrair_desvios_gps.py` — lê a planilha (openpyxl), filtra GPS, gera
  `scripts/desvios_gps.json`.
- `scripts/seed_desvios_gps.mjs` — insere via `pg` (lê `.env.local`); `--limpar` remove.

---

## 4. Status do desvio

Antes: "Caso Resolvido?" (Em tratativa / Não / Sim). **Agora:** `EM_TRATATIVA` (Em
tratativa), `PENDENTE` (Pendente), `CONCLUIDA` (Concluída). Mapeamento no import:
Não→Pendente, Sim→Concluída. Fonte: `src/lib/desvios/opcoes.ts` (`STATUS_DESVIO` com
`cor`, `rotuloStatus`, `statusDoTextoPlanilha`). Badges coloridos:
`src/components/desvios/StatusBadge.tsx` (âmbar/vermelho/verde).

---

## 5. Regras de negócio + gateway (server-only)

- `src/lib/seguranca/escopo-contratante.ts` — `EscopoContratante` (`todos` | `lista`),
  **Trava 1** `predicadoContratante`, **Trava 2** `assertDesviosNoEscopo` (lança se vazar
  contratante fora do escopo). Testes: `escopo-contratante.test.ts` (6, passam).
- `src/lib/desvios/index.ts` — `listarDesvios` (paginada, filtros incl. `mes`),
  `contarPorStatus`, `criarDesvio`, `atualizarDesvio`, `contratanteAtlasId`,
  `mesesDisponiveis`, `rangeDoMes`, e as **agregações do painel** `indicadoresDesvios`
  (total, porStatus, valorTotal/valorPendente, porMotivo/CausaRaiz/Cliente/Tipo, porMes).
  Filtro por mês: aplica-se a tudo, EXCETO `porMes` (que mostra o histórico completo).
- `src/lib/desvios/escopo-usuario.ts` — `escopoContratanteAtual()`: resolve o escopo do
  usuário atual **a partir das telas concedidas** (não usa mais vínculo manual de
  contratante).
- `src/lib/desvios/opcoes-cliente.ts` — opções EFETIVAS (padrão + extras) por cliente;
  `opcoesEfetivas`, `opcoesCustom`, `adicionarOpcao`, `removerOpcao`, `CAMPOS_LISTA`
  (responsavelInterno, tipo, divisao, motivo, causaRaiz).
- Schemas zod: `src/lib/desvios/schemas.ts`.

---

## 6. Rotas / APIs

Telas (server, com guard) sob `src/app/dashboards/clientes/atlas/`:
- `layout.tsx` — cabeçalho com a **logo Atlas Copco** (`public/logo_atlas_copco.svg`) + nome.
- `desvios/painel/page.tsx` → **Painel de Desvios** (indicadores).
- `desvios/page.tsx` → **Acompanhamento** (tabela paginada, filtros).
- `desvios/novo/page.tsx` → **Formulário** de cadastro.

APIs (`src/app/api/desvios/…`):
- `GET/POST /api/desvios` (lista+contadores+`meses`+`mes`; criar). `PATCH /api/desvios/[id]`.
- `GET /api/desvios/indicadores?mes=` — indicadores + meses + mês efetivo.
- `GET/POST/DELETE /api/desvios/opcoes` — opções das listas (POST/DELETE só admin).

Componentes client (`src/components/desvios/`): `PainelDesvios` (KPIs reordenados:
Aderência, Total, Valor total, Valor pendente; donut de status à esquerda + evolução por
mês à direita; motivo/causa/top-clientes lado a lado com rótulos; filtro de mês default =
mês mais recente; **fullscreen**; tabela `TabelaResumoDesvios` com botão **Ver** →
detalhe em diálogo), `TabelaDesvios` (Acompanhamento: filtros status/mes/busca, badge de
status editável, detalhe), `FormularioDesvio` (usa opções efetivas via API),
`ConfiguradorListas` (diálogo admin p/ editar as listas), `InfoDesvios`/`InfoPainelDesvios`.

---

## 7. Navegação / Sidebar (`src/lib/domains.ts` + `DashboardSidebar.tsx`)

- Domínios em `domains.ts`: 5 internos + **`epi`** (aparece só no seletor/command palette —
  a sidebar do EPI é por papel, então o domínio `epi` é OMITIDO da sidebar) + **`clientes`**
  (com `clientes[]`, cada cliente com suas telas; hoje só **Atlas Copco**).
- **Interno (INTERNO):** menu raiz = Visão Geral · **In-Haus** (abre lista de todas as
  áreas internas + EPI/Checklists) · **Clientes** (drill-down: Clientes → cliente → telas) ·
  **Administração**. Marca do cliente em `src/lib/clientes-branding.ts` (slug→logo/nome).
- **Cliente (CLIENTE):** **portal enxuto** — só as telas dele, flat, com a logo do cliente;
  sem In-Haus/Clientes/domínios/Admin/Visão Geral. `/dashboards` redireciona o cliente
  para a 1ª tela dele; sem telas ⇒ "Acesso em configuração".

---

## 8. Tela de Usuários (admin) — enxuta

`src/components/admin/UsuariosAdmin.tsx` + `SeletorTelas.tsx`:
- **Seletor de telas agrupado** (`SeletorTelas`): seção "Áreas internas" (por domínio,
  inclui **EPI**) + uma seção **"Cliente: <nome>"** por cliente, com **"Selecionar todas"**.
- Campos do form: nome/email/CPF/senha (criar), Acesso, Admin, **Segurança**, **Telas
  visíveis**, e um único toggle **"É cliente?"** (→ `classificacao`, trava admin).
- **REMOVIDOS** do form: seletores de Clientes (escopo SRA), CRs avulsos e Contratantes,
  e o dropdown de classificação. A API tornou esses arrays **opcionais** e só substitui os
  vínculos quando enviados (não apaga os existentes ao editar).
- APIs admin ainda existentes: `/api/admin/usuarios`, `/api/admin/contratantes`,
  `/api/admin/clientes-crs` (o back-end de escopo por CR/contratante continua íntegro,
  apenas sem UI).

---

## 9. Deploy / operação

- Remoto: `github.com/LogProj/hub_inhaus`. Produção = **Vercel** no push da `main`.
- **O assistente NÃO consegue dar `git push` (bloqueado pela política do ambiente).** O
  usuário publica com `!git push origin main` no chat. Último deploy: commit `446392a`.
- Dev server: `.claude/launch.json` (`hub-inhaus-dev`, porta 3000). `HUB_ACESSO_LIVRE=1`
  entra como **admin/INTERNO** — por isso o **portal do cliente e a trava do CLIENTE só
  dá para testar em produção com um usuário CLIENTE real**.
- Verificação: `npx tsc --noEmit`, `npx vitest run` (50 testes), `npm run build`.

---

## 10. Pendências / próximos passos

- **Isolamento por URL para INTERNOS não-admin**: a trava central hoje só vale para
  CLIENTE. Internos não-admin ainda podem alcançar outras áreas por URL. (Não estender a
  regra a internos de forma ingênua: o EPI é por papel e telas de EPI não estão em
  `visibleScreens`, então uma trava por telas quebraria o acesso do líder ao EPI.)
- **CR/SRA sem UI**: o seletor de CR foi removido do form. Não há mais como conceder
  recorte de CR para o Controle de Quadro a usuários internos não-admin (mecanismo existe
  no back-end). Readicionar um seletor de CR "conforme a necessidade".
- **EPI x telas visíveis**: as telas do EPI aparecem no seletor, mas o acesso ao EPI ainda
  é por **papel** (líder/Segurança), não por `visibleScreens`. Marcar a tela não concede
  EPI. Decidir se o EPI migra para o modelo de telas visíveis.
- **Segundo cliente**: validar portal + recorte com mais de um cliente (cadastrar em
  `cliente_contratante`, adicionar em `domains.ts` `clientes[]`, mapear logo em
  `clientes-branding.ts`).
- **Remover default de lista** (hoje só extras são removíveis) e **assinatura**, se preciso.
- **Abas não importadas** da planilha (Outbounds, Separações CS/ACS/Chicago) — futura
  frente de indicadores (OTIF, lead time).
