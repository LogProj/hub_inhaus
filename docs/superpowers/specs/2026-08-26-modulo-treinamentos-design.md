# Módulo de Treinamentos — design

**Data:** 2026-08-26
**Domínio:** RH (área interna In-Haus)
**Status:** aprovado para plano de implementação

---

## 1. Objetivo

Registrar **presença em treinamentos** via QR Code. A pessoa autorizada cria um
treinamento (nome, data, duração, responsável), gera um QR; quem escaneia abre um
formulário público, digita **só o CPF** e confirma; o sistema resolve quem é o
colaborador na SRA e grava a presença. A entrega é a **lista de presença por
treinamento**, com a base de dados já pronta para virar **indicador** (horas de
treinamento) numa fase futura.

---

## 2. Decisões de negócio (fechadas com o cliente)

- **Entrega (C):** lista de presença por treinamento agora; base pronta para indicador depois.
- **Escopo (2-B):** módulo **interno In-Haus**. Nenhum cliente externo enxerga a tela.
  Não-admin só vê se a tela for concedida (`visibleScreens`).
- **CPF não encontrado na SRA (3a-A):** **registra mesmo assim**, marcando
  `localizadoNaSra = false`. Nunca se perde um check-in.
- **Sem amarra por CR:** qualquer CPF válido confirma presença. O CR real do
  colaborador é capturado **no snapshot da presença**, só para distinguir de onde a
  pessoa é — não bloqueia.
- **QR aberto até encerrar (4a-B):** o link/QR aceita check-in enquanto o treinamento
  estiver `ABERTO`; a pessoa autorizada **encerra** quando quiser.
- **Idempotência (4b):** 1 presença por pessoa por treinamento (`unique(treinamentoId, cpfHash)`).
  Confirmar o mesmo CPF de novo não duplica.
- **Responsável (3-A):** cada treinamento tem um responsável escolhido num **dropdown**,
  alimentado por uma **lista própria do módulo** (`treinamento_responsavel`), gerenciada
  por um botão de configuração — **não** precisa ser usuário do hub.

---

## 3. Abordagem

Reaproveitar o encanamento do módulo de **EPI**, que já resolve este formato:
QR → rota pública fora do `/dashboards` → CPF verificado por **HMAC** (`src/lib/epi/cpf.ts`,
`EPI_CPF_SECRET`) → resolução do colaborador no quadro ativo da SRA
(`src/lib/epi/colaboradores.ts`, `ft_colaboradores_sra` com `dt_demissao IS NULL`) →
snapshot congelado. Mesmo padrão de **token público estável** e de tabelas criadas por
**SQL manual idempotente** (nunca `prisma db push`).

Alternativas descartadas: fluxo público do zero (retrabalho + risco de divergir das
travas de LGPD já revisadas); formulário externo tipo Google Forms (quebra o isolamento
e não resolve na SRA).

---

## 4. Modelo de dados

`prisma/schema.prisma` + `prisma/sql/011_treinamentos.sql` (idempotente). Nomes mantidos
com prefixo `treinamento_` (padrão herdado dos Desvios). **Regra dos próximos módulos**:
tabelas novas usam prefixo `dm_`/`ft_` (documentada no CLAUDE.md); estas ficam como estão.

### `treinamento` (model `Treinamento`)
| Campo | Tipo | Nota |
|---|---|---|
| `id` | uuid PK | |
| `nome` | text | |
| `data` | date | dia do treinamento |
| `duracaoHoras` | decimal(4,2) | ex.: 2.50 |
| `responsavelId` | uuid FK → `treinamento_responsavel` | |
| `status` | enum `ABERTO \| ENCERRADO` | default `ABERTO` |
| `tokenPublico` | text unique | estável, usado no QR/link |
| `criadoPorId` | uuid | authUserId de quem criou |
| `criadoEm` / `atualizadoEm` | timestamptz | |

### `treinamento_responsavel` (model `TreinamentoResponsavel`)
Lista própria do módulo; alimenta o dropdown.
| Campo | Tipo | Nota |
|---|---|---|
| `id` | uuid PK | |
| `nome` | text | |
| `ativo` | bool | soft-delete (default true) |
| `criadoEm` | timestamptz | |

### `treinamento_presenca` (model `TreinamentoPresenca`)
1 por pessoa por treinamento. Snapshot congelado no momento da confirmação.
| Campo | Tipo | Nota |
|---|---|---|
| `id` | uuid PK | |
| `treinamentoId` | uuid FK → `treinamento` | |
| `cpfHash` | text | HMAC-SHA256 do CPF (nunca CPF em claro) |
| `nomeColab` | text null | snapshot |
| `crCod` | varchar(5) null | snapshot — só para distinguir origem |
| `crNome` | text null | snapshot |
| `cargo` | text null | snapshot |
| `matricula` | text null | snapshot (informativo) |
| `localizadoNaSra` | bool | false quando o CPF não bate na SRA (3a-A) |
| `confirmadoEm` | timestamptz | |

`@@unique(treinamentoId, cpfHash)` → idempotência (4b).

---

## 5. Rotas e telas

### Área interna (RH)
- **`/dashboards/rh/treinamentos`** — tela protegida (shell). Botão **Novo treinamento**
  (nome, data, duração, responsável no dropdown); botão de **configuração** (⚙) para
  gerenciar a lista de responsáveis (padrão `ConfiguradorListas` dos Desvios); **lista de
  treinamentos** (nome, data, duração, responsável, nº de presenças, status).
- **`/dashboards/rh/treinamentos/[id]`** — detalhe: dados + **QR do link público**
  (copiar / abrir / imprimir, padrão `QrLinkPublico` do EPI) + botão **Encerrar** +
  **lista de presença** (nome, CR, cargo, matrícula, horário; badge "não localizado na
  SRA" quando `localizadoNaSra = false`). Botão **info** (`InfoIndicador`) preenchido.

### Rota pública (fora do `/dashboards`, liberada no `middleware.ts`)
- **`/t/[token]`** — formulário público: nome/data do treinamento + campo **CPF** +
  botão **Confirmar**.
- **`POST /t/[token]/confirmar`** — valida formato do CPF → HMAC → resolve na SRA (quadro
  ativo) → grava `treinamento_presenca` com snapshot + `localizadoNaSra`. Idempotente.
  Recusa se o treinamento estiver `ENCERRADO`. Tela de sucesso ("Presença confirmada, {nome}").

### API interna
`/api/treinamentos/*` (route handlers) com validação **zod** e guardas que **honram o
acesso livre de dev** (senão dariam 401 em dev). Padrão de erro `{ error }`.
- `POST /api/treinamentos` — cria treinamento.
- `PATCH /api/treinamentos/[id]` — encerrar.
- `GET/POST/PATCH/DELETE` responsáveis (config da lista).

---

## 6. `domains.ts` e permissões

- Nova tela `treinamentos-registro` (label **"Treinamentos"**, ícone `ClipboardCheck`)
  no domínio **RH**, sem `emBreve`.
- Interno (2-B): entra no `SeletorTelas` só na área interna; cliente externo nunca recebe.
  Não-admin só vê se a tela for concedida.

---

## 7. Camada de código

`src/lib/treinamentos/` — regras de negócio no topo do `index.ts`:
- **reuso** de `src/lib/epi/cpf.ts` (HMAC do CPF, `EPI_CPF_SECRET`).
- **reuso** de `src/lib/epi/colaboradores.ts` (resolução no quadro ativo da SRA).
- token público estável (mesmo padrão do EPI).
- resolução idempotente da presença.

`src/components/treinamentos/` — formulário de criação, diálogo de responsáveis,
tabela de presença, formulário público. QR via `qrcode.react` (`QrLinkPublico`).

---

## 8. Botão info (obrigatório)

`InfoIndicador` no detalhe do treinamento e na lista, em **linguagem de negócio**:
o que é uma presença, como o CPF vira colaborador, o que significa "não localizado na
SRA", o que "encerrar" faz. Zero termo técnico (sem tabela, coluna, SQL, HMAC, SRA como
sistema). Público: operação e gestão.

---

## 9. Fora de escopo (base pronta, não construído agora)

- **Indicador de horas de treinamento** (horas per capita, treinamentos por CR/mês) na
  tela "Horas de treinamento". O modelo já guarda `duracaoHoras` + presenças com CR/cargo.
- Assinatura/comprovante do participante.
- Campos extras (instrutor, tipo/NR) — podem entrar depois sem quebrar o modelo.

---

## 10. Verificação

`npx tsc --noEmit`, `npm run build`, e conferência dos números no banco. Nunca
`prisma db push`/`migrate` — só SQL idempotente + `prisma generate`.
