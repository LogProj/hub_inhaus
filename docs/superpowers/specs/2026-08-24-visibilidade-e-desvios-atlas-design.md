# Design — Governança de visibilidade + Módulo de Desvios (Atlas Copco / GPS)

Data: 2026-08-24
Branch de origem: `feat/isolamento-cr-cliente`

## Contexto e problema

O hub vai concentrar coisas de públicos diferentes: dashboards internos da equipe,
visão macro da liderança (vê tudo), painéis operacionais restritos a um grupo, e
**ferramentas/telas de clientes contratantes** que, ao acessarem o hub, só podem ver o
que é deles. Falta um modelo **central** de "quem vê o quê" — sem ele, cada tela nova
vira uma regra de permissão diferente.

O caso concreto que dispara este trabalho é o cliente **Atlas Copco**: um controle de
**desvios (ocorrências)** hoje mantido em planilha (`Controle de Aderência.xlsx`, aba
*Ocorrências LOG*). Queremos duas telas — **Formulário de Desvios** (cadastro) e
**Acompanhamento de Desvios** (tabela paginada com status/detalhe) — visíveis só para
quem for da Atlas.

## Modelo de governança — os três conceitos

A visibilidade no hub se resolve por **eixos independentes**. Este spec formaliza dois
deles como o modelo oficial e liga o primeiro à interface (hoje ele existe só na lógica).

- **Eixo 1 — QUAIS TELAS** o usuário enxerga (visibilidade de funcionalidade).
  Já modelado: `AuthUser.visibleScreens[]` (chaves de `src/lib/domains.ts`) + `isAdmin`
  (vê tudo). A função `telasVisiveis()` já resolve a regra. **O que falta: a sidebar e as
  rotas ainda NÃO honram isso** (a sidebar monta todos os domínios estaticamente).
- **Eixo 2 — QUAIS DADOS** dentro de uma tela (recorte de linhas).
  Já existe para dados da SRA (recorte por **CR**): `AuthUserCliente`/`AuthUserCr` +
  gateway `src/lib/seguranca/escopo-dados.ts`. **Peça nova: o conceito de
  Cliente Contratante (tenant)** para módulos transacionais próprios do hub (os desvios
  hoje), com isolamento análogo ao de CR.
- Níveis de acesso "ver × editar" ficam **fora deste spec** (decisão do usuário) — pode
  entrar depois como uma terceira dimensão sem quebrar este desenho.

Este spec tem, portanto, **duas frentes**:
- **Frente A — Visibilidade:** ligar sidebar + guarda de rota ao `visibleScreens`.
- **Frente B — Desvios da Atlas:** contratante (tenant) + 2 telas + import das 40 linhas GPS.

---

## Frente A — Governança de visibilidade

### A.1 Sidebar honra `visibleScreens`

Hoje `DashboardSidebar.tsx` (linha ~46) monta `GRUPOS_DOMINIO` a partir de **todos** os
`DOMINIOS`, ignorando o usuário. Mudança:

- `resolverPapeisDashboard()` (`src/lib/dashboard-acesso.ts`) passa a resolver também as
  **telas visíveis** do usuário. Para não-admin, carrega `AuthUser.visibleScreens`; admin
  recebe todas. No **acesso livre de dev**, todas (admin fictício).
- O layout (`src/app/dashboards/layout.tsx`) repassa essas telas ao `DashboardShell` →
  `DashboardSidebar`.
- A sidebar monta os grupos de domínio a partir dessa lista (via `telasVisiveis()` /
  filtragem por `key`), não mais do const estático. **Domínio sem nenhuma tela concedida
  é omitido** — exatamente como o grupo Admin já se comporta.
- Telas `emBreve` continuam fora da sidebar (regra atual preservada).

Resultado: admin/liderança vê tudo; um usuário só com as telas de Desvios concedidas vê
**apenas o domínio Logística com essas 2 telas**.

### A.2 Guarda de rota (defesa real)

Esconder do menu não basta: URL direta precisa bloquear. Padrão a introduzir:

- Um helper server, ex. `assertTelaVisivel(telaKey)` em `src/lib/dashboard-acesso.ts`
  (ou `src/lib/seguranca/`), que resolve a sessão e **redireciona/nega** se a tela não
  estiver em `visibleScreens` (admin passa sempre). Reaproveita a resolução de sessão já
  existente.
- Cada `page.tsx` de dashboard protegido chama esse guard no topo (server component)
  com a sua `key` de `domains.ts`. As telas de Desvios já nascem com o guard.
- Menu e acesso real ficam sempre em sincronia (mesma fonte: `visibleScreens`).

### A.3 Fora de escopo (Frente A)

- Não retrofitamos o guard em **todas** as telas antigas neste spec (a maioria é
  `emBreve`); o guard entra como padrão e é aplicado nas telas reais (Controle de Quadro,
  EPI conforme já protegidas, e as novas de Desvios). Retrofit amplo pode ser tarefa
  posterior. *(Confirmar na revisão do plano se o usuário quer retrofit imediato do
  Controle de Quadro.)*

---

## Frente B — Módulo de Desvios (Atlas Copco / GPS)

### B.1 Cliente Contratante (tenant) — Eixo 2 generalizado

Novo cadastro e vínculo (autorização **local** do hub, nunca vai ao global_auth; padrão
igual a `AuthUserCliente`):

- `ClienteContratante` — `{ id, nome, slug, ativo, criadoEm }`. Semente inicial:
  **Atlas Copco**.
- `AuthUserContratante` — vínculo `{ authUserId, contratanteId }` (`@@unique`).
- Gateway de isolamento do tenant (espelha `escopo-dados.ts`, filosofia fail-closed):
  - `resolverEscopoContratante(usuario)` → `{ todos }` (admin interno) | `{ lista: ids }`
    (contratantes vinculados) | lista vazia (sem vínculo e não-admin ⇒ **não vê nada**).
  - **Trava 1**: filtro `contratanteId IN (...)` injetado em toda query de desvio.
  - **Trava 2**: `assertDesviosNoEscopo()` confere a saída e **lança** se vazar tenant
    fora do escopo.
  - Classificação `CLIENTE` (já existente) nunca recebe `todos`.

### B.2 Dado do Desvio

Tabela `desvio` (SQL manual idempotente em `prisma/sql/00X_desvios.sql`; **NUNCA
`prisma db push`/`migrate`** — regra crítica do projeto). Model `Desvio` no
`schema.prisma`. Campos (da aba *Ocorrências LOG*):

| Campo | Origem planilha | Tipo |
|---|---|---|
| `contratanteId` | (chave de isolamento) | FK |
| `responsavelInterno` | Responsável Interno | texto (GPS/ACTA/CP…) |
| `numeroOtbWbs` | Número da OTB/WBS | texto |
| `tipo` | Tipo | enum-texto (Pedido de Venda, ACS/CS - Kit Conjunto, Pedido TMC) |
| `divisao` | Divisão | texto (BR31, BR41) |
| `solicitante` | Solicitante | texto |
| `dataOcorrencia` | Data ocorrência | data |
| `clienteFinal` | Cliente | texto (ex.: Volvo, Mercedes) |
| `motivo` | Motivo | texto (Falta de Material, Envio Divergente…) |
| `causaRaiz` | Causa Raiz | texto (Divergência de Estoque…) |
| `resumoCaso` | Resumo do Caso | texto longo |
| `solucao` | Solução | texto longo |
| `status` | Caso Resolvido? | enum-texto: `EM_TRATATIVA` / `NAO` / `SIM` |
| `dataFaturamento` | Data de faturamento | data? |
| `dataSeparacao` | Data de separação | data? |
| `valor` | Valor | decimal? |
| trilha | — | `criadoEm`, `atualizadoEm`, `criadoPor`, `atualizadoPor` |

Listas de dropdown (Tipo, Motivo, Causa Raiz, Divisão, Responsável, Solicitante) saem dos
valores distintos extraídos da planilha (aba *Formato Lista* + distintos da *Ocorrências
LOG*), centralizadas numa constante do módulo (`src/lib/desvios/`).

### B.3 Import inicial (só GPS)

Seed/one-shot que lê a aba *Ocorrências LOG* e importa **apenas as linhas com
Responsável Interno = "GPS"** (40 linhas verificadas; ACTA=14 e CP=3 ficam de fora),
todas com `contratanteId` = Atlas Copco. Mapeia "Caso Resolvido?" → `status`. Idempotente
(rodar de novo não duplica — chave natural por Nº OTB/WBS + data, a definir no plano).

### B.4 Navegação e telas

- Novo domínio em `src/lib/domains.ts`: **`logistica`** ("Logística"), com telas:
  - `desvios-formulario` → `/dashboards/logistica/desvios/novo` (Formulário de Desvios).
  - `desvios-acompanhamento` → `/dashboards/logistica/desvios` (Acompanhamento).
- **Formulário de Desvios:** formulário de cadastro (campos B.2), dropdowns pesquisáveis
  no padrão `Combobox`/`MultiCombobox`. Botão **info** (`InfoIndicador`) obrigatório com
  as regras de negócio. Grava via route handler `POST /api/desvios` (validação zod, guard
  de tela + escopo de contratante).
- **Acompanhamento de Desvios:** tabela **paginada** (server-side), filtros (status,
  período, cliente final, tipo), busca. Linha expande para o **detalhe completo**. Botão
  para **atualizar status** e editar tratativa/solução (`PATCH /api/desvios/[id]`).
  Cabeçalho com contadores (Em tratativa / Não resolvidos / Resolvidos). Botão **info**.
- Todas as leituras/escritas passam pelas **duas travas** do tenant (B.1).

### B.5 Concessão na tela de Usuários

- A tela de Usuários (`/dashboards/usuarios`) ganha a seção de **Cliente Contratante**
  (multi-select), análoga à de clientes/CRs já existente. Endpoint para listar
  contratantes alimenta o seletor.
- Fluxo do admin p/ um usuário da Atlas: concede as 2 telas de Desvios (Eixo 1) + vincula
  ao contratante Atlas (Eixo 2). O usuário passa a ver só isso — no menu e no acesso.

---

## Arquitetura / arquivos (visão)

```
src/lib/domains.ts                     # + domínio "logistica" (2 telas)
src/lib/dashboard-acesso.ts            # + telas visíveis + assertTelaVisivel()
src/components/dashboard/DashboardSidebar.tsx  # monta grupos por visibleScreens
src/app/dashboards/layout.tsx          # repassa telas visíveis à shell

prisma/schema.prisma                   # + ClienteContratante, AuthUserContratante, Desvio
prisma/sql/00X_desvios.sql             # DDL idempotente (tabelas + FKs)

src/lib/seguranca/escopo-contratante.ts  # gateway de isolamento do tenant (2 travas)
src/lib/desvios/index.ts               # regras de negócio + listas de dropdown
src/lib/desvios/schemas.ts             # zod

src/app/dashboards/logistica/desvios/page.tsx        # Acompanhamento
src/app/dashboards/logistica/desvios/novo/page.tsx   # Formulário
src/app/api/desvios/route.ts           # POST (criar)
src/app/api/desvios/[id]/route.ts      # PATCH (status/tratativa)
src/components/desvios/*               # formulário, tabela paginada, detalhe, info

scripts/seed_desvios_gps.mjs           # import das 40 linhas GPS
```

## Fora de escopo

- Abas Outbounds / Separações CS/ACS/Chicago (indicadores de OTIF, lead time) — outro spec.
- Níveis de acesso ver × editar / papéis por tenant.
- Retrofit do guard de rota em todas as telas antigas.
- Assinatura, anexos, notificações.

## Riscos / atenções

- **`prisma db push` é proibido** neste banco compartilhado (dropa tabelas da SRA). DDL só
  por SQL manual idempotente.
- Trava 2 do tenant é a defesa efetiva (conexão é superusuário; RLS dorme).
- Botão **info** deve refletir a regra real (obrigatório em todo dashboard).
- Import: garantir idempotência e o mapeamento de status.
