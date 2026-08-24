# Design — Isolamento de dados por CR / Cliente (multi-tenant)

Data: 2026-08-24
Status: aprovado (brainstorming)

## Problema

Hoje qualquer usuário com a tela de um indicador enxerga **todos** os dados dele. O
Controle de Quadro (RH real, lido da SRA) não filtra nada por usuário. Precisamos que:

1. Usuários possam ter **visualização recortada por CR**.
2. As tabelas que guardam **dados de operação** carreguem o CR (ligado à `dm_cr`).
3. Um usuário com escopo de CRs dedicados **só veja dados desses CRs**.
4. **Clientes vão acessar o hub e, em hipótese alguma, podem ver dados de outros
   clientes** — garantido por módulo de segurança (defesa em profundidade).

## Restrições não negociáveis

- **`global_auth` intocado.** Toda classificação e todo recorte por CR vivem **só na
  autorização local do hub** (`auth_users` + tabelas novas), ligados pelo `authUserId`.
  Nada é escrito/alterado/exigido no `global_auth` — ele segue só como provedor de
  identidade (login/senha/2FA).
- **Nunca `prisma db push`/`migrate`.** O banco é compartilhado com a RPA/SRA. Todo
  schema do hub é aplicado por SQL manual idempotente em `prisma/sql/*.sql`.
- A conexão e o schema da **RPA/SRA** ficam intocados; a RPA continua escrevendo normal.
- A **classificação `CLIENTE`|`INTERNO` é ortogonal às permissões**: não restringe quais
  telas (`visibleScreens`) ou papéis o admin pode conceder. Quem filtra o dado é o
  **escopo de CR/cliente**, não a classificação.

## Decisões aprovadas

- Modelo de escopo **híbrido**: vínculo por **cliente** (herda todos os CRs, inclusive
  futuros) **e/ou** por **CR avulso**.
- Coluna de CR **só nas tabelas de dados** (não em biblioteca de checklist nem `dm_cr`).
- Enforcement em **duas travas independentes na aplicação** (guarda de escopo +
  verificação pós-consulta). **Sem trocar connection strings** (decisão do cliente): como o
  hub conecta como `postgres` (superusuário ignora RLS), a RLS fica **dormente** no SQL —
  pronta para ativar se um dia houver role não-superusuário, mas não é a trava de hoje.
- Existe classificação **`CLIENTE`|`INTERNO`** (campo local), sem impactar permissões.
- Chave de isolamento = **`cr_cod`** (código 5-char que casa com `dm_cr.cr`), não o texto
  bruto do CR.
- RLS também nas tabelas de **leitura da SRA** (não só nas do hub).

---

## 1. Modelo de dados (escopo local do hub)

Tudo em `schema.prisma` + SQL aditivo em `prisma/sql/008_isolamento_cr.sql`.

### 1.1 `auth_users` — novo campo
- `classificacao String @default("INTERNO")` → `'INTERNO' | 'CLIENTE'`. Campo **local**.
  Não vai ao global_auth. **Não** restringe permissões.

### 1.2 `auth_user_cliente` (vínculo usuário → cliente/grupo)
- `id`, `authUserId` (FK lógica ao global_auth), `nomeGrpCliente` (valor bruto da
  `dm_cr.nome_grp_cliente`), `criadoEm`.
- `@@unique([authUserId, nomeGrpCliente])`, índice por `authUserId`.
- Semântica: herda **todos** os CRs cujo `dm_cr.nome_grp_cliente` bate — inclusive CRs
  que entrarem na `dm_cr` depois.

### 1.3 `auth_user_cr` (vínculo usuário → CR avulso)
- `id`, `authUserId`, `cr` (código 5-char = `dm_cr.cr`), `criadoEm`.
- `@@unique([authUserId, cr])`, índice por `authUserId`.

### 1.4 Resolução — `escopoDeDados(usuario)` (server-only)
Único ponto que decide QUE CRs o usuário alcança:
- **admin** e `classificacao='INTERNO'` → `{ tipo: 'todos' }` (sem filtro).
- **admin** mas `classificacao='CLIENTE'` → nunca `todos`; resolve pelos vínculos (trava
  o "em hipótese alguma", mesmo com admin marcado por engano).
- senão → `{ tipo: 'lista', crs: Set<cr_cod> }` =
  (CRs de todos os clientes vinculados, expandidos via `dm_cr.nome_grp_cliente`)
  ∪ (CRs avulsos de `auth_user_cr`).
- Lista **vazia** ⇒ fail-closed: `crs = []` ⇒ nenhuma linha.

---

## 2. Coluna de CR nas tabelas de dados (`cr_cod`)

Chave de isolamento = **`cr_cod VarChar(5)`** = código que casa com `dm_cr.cr`. Deriva do
CR bruto da SRA por: pegar o trecho antes do primeiro `" - "`, `btrim`, e `lpad(...,5,'0')`
se tiver menos de 5 chars (mesma regra já usada em `listarCrsDisponiveis`).

### Tabelas que recebem/formalizam `cr_cod`
- **EPI com CR próprio** (`epi_turno`, `epi_atribuicao_turno`, `epi_resposta`): adicionar
  `cr_cod` derivado do `cr` textual existente (coluna nova + backfill).
- **EPI dependente de sessão** (`epi_sessao_turno`, `epi_presenca_sessao`,
  `epi_validacao_sessao`): `cr_cod` **desnormalizado** — copiado do turno/atribuição na
  escrita (RLS precisa da coluna na própria linha, sem join). Backfill via join à origem.
- **EPI `epi_lider_cr`, `epi_membro`, `epi_cliente_cr`**: já têm `cr` textual; adicionar
  `cr_cod` derivado (são escopo/config, mas entram no filtro por consistência).
- **SRA (leitura)**: `vw_sra_geral` / `ft_colaboradores_sra` já têm `cr` textual. **Não
  altero o schema da RPA.** O `cr_cod` é derivado on-the-fly na policy/consulta pela mesma
  expressão. (Se a view não permitir RLS diretamente, aplico a policy na tabela base
  `ft_colaboradores_sra` e derivo o código na expressão da policy.)

### Fora de escopo (globais, sem CR)
- `epi_checklist_template`, `epi_checklist_versao` (biblioteca reaproveitável), `dm_cr`,
  `auth_users` e as tabelas de vínculo do §1.

---

## 3. Enforcement — defesa em profundidade (toda na aplicação)

**Restrição do cliente:** NÃO trocar connection strings. O hub conecta como `postgres`
(superusuário), que **ignora RLS sempre** — logo RLS não pode ser a trava efetiva hoje. A
defesa em profundidade vive em **duas travas independentes na aplicação**, mais o SQL de
RLS deixado **dormente** para o dia em que houver role não-superusuário.

### Trava 1 — Guarda de escopo obrigatória (`src/lib/seguranca/escopo-dados.ts`)
- Server-only. Único gateway por onde TODO acesso a dado passa (pool da SRA e Prisma).
- Resolve o escopo e injeta o predicado `cr_cod = ANY($crs)` (SRA: código derivado do `cr`
  bruto). Escopo `todos` (admin interno) ⇒ sem predicado. Lista vazia ⇒ `1=0` (nada).
- Nenhuma query de dado é escrita sem passar por aqui. Padrão único e revisável.

### Trava 2 — Verificação pós-consulta independente (mesmo módulo)
- Depois de buscar, `assertLinhasNoEscopo(rows, escopo)` confere que **toda** linha
  retornada tem `cr_cod` (ou código derivado) dentro do escopo. Se aparecer linha fora do
  escopo (ex.: filtro esquecido em alguma query) ⇒ **lança erro e não retorna nada**.
- Independe da Trava 1: é a rede que garante o "em hipótese alguma" mesmo com bug de query.
- Só roda quando o escopo é `lista` (usuário recortado); admin `todos` a ignora.

### Camada dormente — RLS no Postgres (não protege hoje; pronta para o futuro)
- O `008_isolamento_cr.sql` inclui as policies (`ENABLE`/`FORCE ROW LEVEL SECURITY`,
  compara `cr_cod` com `app.crs_permitidos`) **comentadas/dormentes**, com um cabeçalho
  explicando que só passam a valer se o hub conectar com um role não-superusuário. Assim o
  trabalho não é perdido, mas o spec não finge que RLS protege enquanto a conexão for
  `postgres`.

---

## 4. Concessão / admin (`/dashboards/usuarios`)

- Ao criar/editar usuário: definir `classificacao` (INTERNO/CLIENTE), multiseleção de
  **clientes** (`nome_grp_cliente` distintos da `dm_cr`) e/ou **CRs avulsos**.
- **Preview dos CRs efetivos** resolvidos (clientes expandidos + avulsos).
- Alertas: sem vínculo e sem admin ⇒ "não verá dados"; `CLIENTE` com >1 cliente ⇒ aviso
  (permitido tecnicamente, mas sinalizado).
- Continua sendo possível conceder **qualquer** tela/papel independentemente da
  classificação (ortogonalidade).

---

## 5. Rollout / verificação

1. `008_isolamento_cr.sql`: colunas (`classificacao`, `cr_cod`), tabelas de vínculo,
   backfill de `cr_cod`, policies RLS **dormentes** (comentadas com cabeçalho explicativo).
2. Guarda de escopo + verificação pós-consulta aplicadas primeiro no **Controle de Quadro**
   e no **EPI** (dados existentes hoje).
3. Verificação (testes automatizados + conferência):
   - usuário-cliente retorna **apenas** linhas do(s) seu(s) CR(s) — no quadro e no EPI;
   - usuário interno/admin retorna tudo;
   - a verificação pós-consulta **lança** se uma query for injetada sem o filtro;
   - fail-closed: usuário sem vínculo não retorna nenhuma linha.
4. `npx tsc --noEmit`, `npm run build`.

## Riscos / mitigações

- **RLS inerte sob superusuário**: reconhecido; a trava efetiva é a aplicação (2 travas
  independentes). RLS fica dormente e documentada para ativação futura com role dedicado.
- **Query esquecida sem filtro**: mitigada pela Trava 2 (verificação pós-consulta que
  lança), independente da Trava 1.
- **Backfill de `cr_cod`**: CRs sem match na `dm_cr` ficam com `cr_cod` nulo → tratados
  como "não pertencem a nenhum cliente" (só admin/interno vê) — sinalizado no plano.

## Fora de escopo (agora)

- Assinatura digital (fase 4 do EPI).
- Migrar indicadores ainda em `EmConstrucao` (aplicam a mesma guarda quando ganharem
  dados).
