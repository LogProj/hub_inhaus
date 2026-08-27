# Spec — Portal Enjoei: Turnover + Absenteísmo (CR 68732)

Data: 2026-08-27 · Branch: `main` (deploy Vercel no push da main).

Cliente novo **Enjoei** no hub, como **portal de cliente** (modelo Atlas Copco), com dois
indicadores de RH — **Turnover** e **Absenteísmo** — espelhados dos painéis do
`hub_amyris`, recoloridos para a marca Enjoei e travados ao **CR 68732 - SP - LOG -
ENJOEI - CABREUVA**.

---

## 1. Objetivo e escopo

- Expor ao Enjoei dois painéis gerenciais (Turnover e Absenteísmo) da sua operação
  logística em Cabreúva, alimentados pela base interna da In-Haus (SRA + ponto).
- Todo dado é recortado ao **CR 68732**; o cliente nunca vê outro CR (fail-closed).
- Reaproveitar a estrutura visual e de cálculo dos painéis equivalentes do
  `hub_amyris`, recolorindo para a identidade Enjoei (**recolorir, não redesenhar**).

**Fora de escopo:** meta de absenteísmo (fica sem linha de meta e sem badge por ora);
exclusão de cargos administrativos (todos os cargos entram no cálculo); qualquer outra
tela do Enjoei além das duas.

---

## 2. Acesso, disponibilidade e governança

Herdando integralmente o modelo de dois eixos do hub (ver
`docs/superpowers/2026-08-25-modulo-clientes-desvios-handoff.md`).

### 2.1 Cadastro do cliente
- **Contratante** `enjoei` em `cliente_contratante` (SQL manual **idempotente** em
  `prisma/sql/`, no padrão do Atlas — `CREATE TABLE IF NOT EXISTS` já existe; aqui só o
  `INSERT ... ON CONFLICT DO NOTHING` do contratante). **NUNCA `prisma db push`.**
- **Marca** em `src/lib/clientes-branding.ts`:
  `enjoei → { slug: "enjoei", nome: "Enjoei", logo: "/logo_enjoei.svg" }`.
- Mover `logo_enjoei.svg` da raiz do repo para `public/logo_enjoei.svg`.

### 2.2 Fonte de verdade de navegação (`src/lib/domains.ts`)
Novo `ClienteHub` `enjoei` dentro do domínio `clientes`, com duas telas (`key` estável,
nunca renomear):

| key | label | href | ícone |
|-----|-------|------|-------|
| `enjoei-turnover` | Turnover | `/dashboards/clientes/enjoei/turnover` | `Repeat` |
| `enjoei-absenteismo` | Absenteísmo | `/dashboards/clientes/enjoei/absenteismo` | `CalendarX` |

`palavrasChave` p/ command palette: turnover (rotatividade, desligamento, admissão,
headcount, enjoei); absenteísmo (falta, presença, ponto, aderência, enjoei).

### 2.3 Camadas de segurança (defesa em profundidade — já existentes, herdadas)
1. Usuário Enjoei = `classificacao=CLIENTE` + `visibleScreens` com as 2 telas → **portal
   enxuto** (só telas dele, logo Enjoei), sem In-Haus/Clientes/Admin.
2. **Trava central por URL** no `src/app/dashboards/layout.tsx` (header `x-pathname`):
   CLIENTE que tente abrir rota fora das telas concedidas é redirecionado.
3. **Guard por página** `assertTelaVisivel("enjoei-turnover" | "enjoei-absenteismo")`.
4. **Escopo de dados fail-closed** no CR 68732 (§2.4).

### 2.4 Recorte de dados por CR (diferente dos Desvios)
Os Desvios (Atlas) derivam o escopo do **contratante**. Aqui a fonte é a **SRA/ponto
interna, que é indexada por CR**, então o recorte usa o **gateway de CR**
(`src/lib/seguranca/escopo-dados.ts`):

- Constante `CR_ENJOEI = "68732 - SP - LOG - ENJOEI - CABREUVA"` (valor bruto da coluna
  `cr`, confirmado no banco em ambas as fontes).
- **Trava 1** — toda query dos módulos Enjoei filtra `cr = CR_ENJOEI` (equivalente ao
  `predicadoSraCr` com escopo `[CR_ENJOEI]`).
- **Trava 2** — `assertLinhasNoEscopo` confere a saída e **lança** se aparecer qualquer
  CR fora de `[CR_ENJOEI]`.
- O portal do Enjoei é, por construção, mono-CR: o escopo é fixo, não depende de vínculo
  manual do usuário. (Ainda assim as duas travas ficam explícitas no código.)

---

## 3. Indicador: Turnover

**Módulo de dados:** `src/lib/clientes/enjoei/turnover.ts` (regras de negócio no topo,
em sincronia com o texto do botão info). Espelha `src/lib/turnover.ts` do `hub_amyris`,
trocando a view `vw_sra_amyris_diario` por `vw_sra_geral` filtrada em `cr = CR_ENJOEI`.

**Fonte:** `public.vw_sra_geral` — fotografias diárias por `data_referencia`
(colunas usadas: `cpf`, `matricula`, `dt_admissao`, `dt_demissao`, `situacao`,
`descricao_funcao`, `cr`, `data_referencia`). Confirmado no CR 68732: 28 fotografias,
73 pessoas, `dt_demissao` **preenchida** (106 registros) → turnover com números reais.

**Regras de cálculo:**
- Quadro ativo de um dia = CPFs distintos na fotografia do dia com `dt_demissao IS NULL`.
  Dias sem fotografia = lacuna (`null`), nunca número inventado.
- Admissões/desligamentos = CPFs distintos por `dt_admissao` / `dt_demissao`,
  varrendo **todas** as fotografias (quem entrou e saiu no período ainda conta).
- **Taxa de turnover (mês)** = `desligamentos do mês ÷ quadro médio do mês × 100`
  (1 casa). Quadro médio = média do quadro ativo **apenas nos dias com fotografia** no
  mês. Mês sem fotografia → "—" (não 0%).
- `situacao` (NORMAL/FÉRIAS/AFASTADO/DEMITIDO) não define desligamento; desligado =
  `dt_demissao IS NOT NULL`.

**Filtro:** mês (`?mes=YYYY-MM`), padrão = mês mais recente com dado.

**Cards:** Quadro ativo atual · Admissões no mês · Desligamentos no mês · Taxa de
turnover (mês).

**Gráficos:** Admissões × Desligamentos (mensal) · Taxa de turnover (mensal) ·
Headcount diário (lacunas preservadas) · Movimentação diária · Tempo de casa (faixas
`< 3m`, `3–6m`, `6–12m`, `1–2a`, `2+a`, sobre os ativos no último dia registrado) ·
tabela de desligados recentes.

**Página:** `src/app/dashboards/clientes/enjoei/turnover/page.tsx` (server, `dynamic`),
guard `assertTelaVisivel("enjoei-turnover")`. Botão **info** (`InfoIndicador`) com todas
as regras em linguagem de negócio.

---

## 4. Indicador: Absenteísmo

**Módulo de dados:** `src/lib/clientes/enjoei/absenteismo.ts`. Espelha
`src/lib/headcount.ts` do `hub_amyris`, trocando `vw_ponto_amyris` por
`ft_ponto_smartcontrol` filtrado em `cr = CR_ENJOEI`.

**Fonte:** `public.ft_ponto_smartcontrol` (colunas usadas: `colaborador`, `data`,
`entrada`, `h_contratual`, `motivo_abono_dispensa`, `categoria_profissional`, `cr`).
Confirmado no CR 68732: 19 dias (ago/2026), `entrada` com HORA (presença), `FALTA`
(160) e outros estados (folga/férias/atestado).

**Regras de cálculo:**
- **Todos os cargos** entram (sem exclusão de categorias).
- **D-1:** toda query exclui o dia de hoje. Ontem calculado em America/Sao_Paulo no
  Node (não `CURRENT_DATE`), porque o ponto do dia ainda está aberto.
- **Classificação do dia** (`classificar`): presença se `entrada` casa `^\d{1,2}:\d{2}`;
  falta se `upper(trim(entrada)) = 'FALTA'`; férias se `h_contratual`/motivo contém
  FERIA/FÉRIA; folga se `h_contratual` contém FOLGA ou `entrada` vazia; senão folga.
- **Por dia:** `escalados = presentes + faltas`; `aderência = presentes ÷ escalados`
  (`null` se escalados = 0 → sem barra); `absenteísmo = faltas ÷ escalados` (1 casa).
- **Mês:** `média absenteísmo` = média das taxas diárias **só nos dias com operação**
  (escalados > 0); `aderência média` = média das aderências diárias com valor.
- **Sem meta:** não há linha de meta nos gráficos nem badge de status verde/vermelho.
- Domingos sinalizados (sem operação) e ocultos nos gráficos de presença.

**Filtro:** mês (`?mes=YYYY-MM`), padrão = mês mais recente com dado.

**Cards:** Colaboradores no mês · Aderência (mês) · Média de absenteísmo (mês) · Total
de faltas (mês).

**Gráficos:** Aderência/dia · Absenteísmo/dia (**sem** linha de meta) · Faltas/dia ·
Grid de presença (heatmap pessoa×dia: presença=roxo Enjoei, falta=vermelho,
férias=âmbar, folga=cinza; tooltip com motivo).

**Página:** `src/app/dashboards/clientes/enjoei/absenteismo/page.tsx` (server,
`dynamic`), guard `assertTelaVisivel("enjoei-absenteismo")`. Botão **info**
(`InfoIndicador`).

---

## 5. Visual e cor da marca

Recolorir, não redesenhar. Shell/layout continuam os do hub.
- **Paleta Enjoei** derivada do logo: primária **`#61005D`** (roxo) para séries de
  gráfico e acento; um tom claro derivado para superfícies/segundo plano.
- **Estados semânticos** mantêm o padrão do hub: falta=vermelho, férias=âmbar,
  folga=cinza.
- Componentes recoloridos em `src/components/clientes/enjoei/` (gráficos Recharts, KPIs,
  filtro de mês, grid de presença), espelhando os do Amyris.
- Cores da paleta definidas num único ponto (constante de paleta Enjoei) para não
  espalhar hex solto pelos componentes.

---

## 6. Renderização e componentes

- **Páginas server-side** (`dynamic = "force-dynamic"`), lendo os módulos de dados
  diretamente — **sem novas rotas de API** (como no Amyris).
- `src/app/dashboards/clientes/enjoei/layout.tsx` — cabeçalho com a logo Enjoei
  (`marcaDoCliente("enjoei")`).
- Componentes em `src/components/clientes/enjoei/`: KPIs de turnover; gráficos de
  turnover (admissões×desligamentos, taxa, headcount diário, movimentação, tempo de
  casa); KPIs de absenteísmo; gráficos de absenteísmo (aderência, absenteísmo, faltas);
  grid de presença; filtro de mês reaproveitado.
- Botão **info**: componente padrão do hub `src/components/dashboard/InfoIndicador.tsx`
  (obrigatório em todo dashboard; texto só em regras de negócio, sem termo técnico).

---

## 7. Verificação

- `npx tsc --noEmit`, `npm run build`.
- Conferência dos números direto no banco (CR 68732) antes de considerar pronto:
  quadro ativo, admissões/desligamentos, taxa de turnover, escalados/faltas/aderência
  por dia.
- **Isolamento:** garantir que nenhuma query retorna CR ≠ 68732 (Trava 2 ativa).
- Portal do cliente e trava por URL só testáveis em **produção** com usuário CLIENTE
  real (dev = admin via `HUB_ACESSO_LIVRE=1`).

---

## 8. Riscos / limitações conhecidas

- **Ponto com poucos dias** (ago/2026): os gráficos diários crescem conforme novas
  coletas entram. Não é bug.
- **Fotografias da SRA** limitadas (28): linha do tempo e quadro médio evoluem com novas
  coletas.
- **Formato do `cr`**: o filtro usa o valor bruto `"68732 - SP - LOG - ENJOEI -
  CABREUVA"`. Se a RPA mudar o texto do CR, a constante precisa acompanhar (ponto único
  de manutenção).
