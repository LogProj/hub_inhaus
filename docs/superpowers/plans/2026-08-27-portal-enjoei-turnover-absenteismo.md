# Portal Enjoei — Turnover + Absenteísmo — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Publicar, no hub_inhaus, um portal de cliente para o **Enjoei** com dois painéis de RH — **Turnover** e **Absenteísmo** — espelhados do `hub_amyris`, recoloridos para a marca Enjoei (`#61005D`) e travados ao **CR 68732 - SP - LOG - ENJOEI - CABREUVA**.

**Architecture:** Cliente contratante `enjoei` no modelo de portal (como Atlas). Duas telas em `src/lib/domains.ts` sob o domínio `clientes`. Páginas server-side (`dynamic`) leem módulos de dados em `src/lib/clientes/enjoei/` que consultam `vw_sra_geral` (turnover) e `ft_ponto_smartcontrol` (absenteísmo) SEMPRE filtrando `cr = CR_ENJOEI`, com a segunda trava `assertLinhasNoEscopo`. Componentes recoloridos em `src/components/clientes/enjoei/`. Cor centralizada em tokens Tailwind `enjoei*` + uma paleta única `paleta.ts`.

**Tech Stack:** Next.js 14 (App Router), TypeScript, Tailwind, Recharts, `pg` (pool `inhausPool`), Vitest.

**Spec:** `docs/superpowers/specs/2026-08-27-portal-enjoei-turnover-absenteismo-design.md`

**Fontes a espelhar (hub_amyris):**
- `src/lib/turnover.ts`, `src/lib/headcount.ts`, `src/lib/headcount-constants.ts`
- `src/app/dashboards/turnover/page.tsx`, `src/app/dashboards/absenteismo/page.tsx`
- `src/components/dashboard/{TurnoverKpis,TurnoverInfo,AdmissoesDesligamentosChart,TurnoverRateChart,HeadcountDiarioChart,MovimentacaoDiariaChart,TempoCasaChart,DesligadosRecentes,HeadcountKpis,RegrasInfo,AderenciaChart,AbsenteismoChart,FaltasChart,AttendanceGrid,MonthFilter}.tsx`

**Regra de recolorir (aplicar em TODO componente copiado):**
- `#4B0085` → `#61005D`; `#7C3AED` → `#8E2589`; `#EDE7F6` → `#F0E6EF`; `rgba(75,0,133,...` → `rgba(97,0,93,...`.
- Tokens Tailwind: `amyris` → `enjoei`; `amyris-grad` → `enjoei-grad`; `amyris-mist` → `enjoei-mist`.
- Cinza de eixo `#7A7A7A` e verde de meta `#059669` NÃO mudam (verde de meta some no absenteísmo — ver Task 8).

---

## Task 1: Tokens de cor, paleta e marca Enjoei

**Files:**
- Modify: `tailwind.config.ts`
- Create: `src/components/clientes/enjoei/paleta.ts`
- Modify: `src/lib/clientes-branding.ts`
- Move: `logo_enjoei.svg` → `public/logo_enjoei.svg`

- [ ] **Step 1: Mover o logo para public/**

Run:
```bash
git mv logo_enjoei.svg public/logo_enjoei.svg
```
Expected: arquivo passa a existir em `public/logo_enjoei.svg`.

- [ ] **Step 2: Adicionar tokens Enjoei ao Tailwind**

Em `tailwind.config.ts`, dentro de `theme.extend.colors`, adicionar (ao lado dos tokens existentes de navy/teal):
```ts
enjoei: {
  DEFAULT: "#61005D",
  mist: "#F0E6EF",
},
```
E, dentro de `theme.extend.backgroundImage` (crie a chave se não existir), adicionar:
```ts
"enjoei-grad": "linear-gradient(135deg, #61005D 0%, #8E2589 100%)",
```

- [ ] **Step 3: Verificar que o build reconhece os tokens**

Run: `npx tsc --noEmit`
Expected: PASS (tailwind.config é TS; sem erro de tipo).

- [ ] **Step 4: Criar a paleta única (hex centralizado para Recharts)**

Create `src/components/clientes/enjoei/paleta.ts`:
```ts
/**
 * Paleta única da marca Enjoei para os gráficos (Recharts recebe hex, não token).
 * Ponto ÚNICO de cor: nenhum componente Enjoei deve ter hex de marca solto.
 */
export const PALETA_ENJOEI = {
  primaria: "#61005D",
  secundaria: "#8E2589",
  grade: "#F0E6EF",
  eixo: "#7A7A7A",
  falta: "#EF4444",
  sombraRgba: "rgba(97,0,93,0.4)",
} as const
```

- [ ] **Step 5: Registrar a marca Enjoei**

Em `src/lib/clientes-branding.ts`, dentro do objeto `MARCAS`, adicionar a entrada:
```ts
enjoei: { slug: "enjoei", nome: "Enjoei", logo: "/logo_enjoei.svg" },
```

- [ ] **Step 6: Commit**

```bash
git add tailwind.config.ts src/components/clientes/enjoei/paleta.ts src/lib/clientes-branding.ts public/logo_enjoei.svg
git commit -m "feat(enjoei): tokens de cor, paleta e marca do cliente"
```

---

## Task 2: Contratante Enjoei no banco (SQL manual idempotente)

**Files:**
- Create: `prisma/sql/013_cliente_enjoei.sql`

> **NUNCA** rodar `prisma db push`/`migrate`. Apenas SQL aditivo aplicado à mão.

- [ ] **Step 1: Escrever o SQL do contratante**

Create `prisma/sql/013_cliente_enjoei.sql`:
```sql
-- Cadastra o contratante Enjoei (portal de cliente). Idempotente.
-- A tabela cliente_contratante já foi criada em 009_desvios.sql.
insert into cliente_contratante (slug, nome)
values ('enjoei', 'Enjoei')
on conflict (slug) do nothing;
```

> Se `cliente_contratante` tiver colunas obrigatórias extras (ex.: `id` default, `criado_em`), confira `prisma/sql/009_desvios.sql` e replique o mesmo formato de INSERT usado para o Atlas.

- [ ] **Step 2: Aplicar o SQL no banco**

Run (parar o dev server antes se estiver de pé):
```bash
node -e 'const fs=require("fs");const{Client}=require("pg");const u=(fs.readFileSync(".env.local","utf8").match(/DATABASE_URL="?([^"\n]+)"?/)||[])[1];(async()=>{const c=new Client({connectionString:u});await c.connect();await c.query(fs.readFileSync("prisma/sql/013_cliente_enjoei.sql","utf8"));const r=await c.query("select slug,nome from cliente_contratante where slug=$1",["enjoei"]);console.log(r.rows);await c.end();})()'
```
Expected: imprime `[ { slug: 'enjoei', nome: 'Enjoei' } ]`.

- [ ] **Step 3: Commit**

```bash
git add prisma/sql/013_cliente_enjoei.sql
git commit -m "feat(enjoei): SQL do contratante enjoei"
```

---

## Task 3: Telas Enjoei na fonte de verdade (domains.ts)

**Files:**
- Modify: `src/lib/domains.ts`

- [ ] **Step 1: Adicionar o ClienteHub enjoei**

Em `src/lib/domains.ts`, no domínio `clientes` (`key: "clientes"`), dentro do array `clientes: [...]`, adicionar APÓS o objeto `atlas`:
```ts
{
  key: "enjoei",
  label: "Enjoei",
  icone: Building2,
  telas: [
    {
      key: "enjoei-turnover",
      label: "Turnover",
      href: "/dashboards/clientes/enjoei/turnover",
      palavrasChave: ["enjoei", "rotatividade", "desligamento", "admissao", "headcount", "turnover"],
      icone: Repeat,
    },
    {
      key: "enjoei-absenteismo",
      label: "Absenteísmo",
      href: "/dashboards/clientes/enjoei/absenteismo",
      palavrasChave: ["enjoei", "falta", "presenca", "ponto", "aderencia", "absenteismo"],
      icone: CalendarX,
    },
  ],
},
```
(`Building2`, `Repeat` e `CalendarX` já estão importados no topo do arquivo.)

- [ ] **Step 2: Verificar tipos e chaves**

Run: `npx tsc --noEmit`
Expected: PASS. As chaves `enjoei-turnover`/`enjoei-absenteismo` entram automaticamente em `CHAVES_DE_TELA` e `TODAS_AS_TELAS`.

- [ ] **Step 3: Commit**

```bash
git add src/lib/domains.ts
git commit -m "feat(enjoei): telas turnover e absenteismo em domains"
```

---

## Task 4: Módulo de dados do Turnover (helpers puros + TDD)

**Files:**
- Create: `src/lib/clientes/enjoei/turnover.ts`
- Test: `src/lib/clientes/enjoei/turnover.test.ts`

O módulo espelha `hub_amyris/src/lib/turnover.ts`, com 3 mudanças: (a) fonte `vw_sra_geral` filtrada por `cr = CR_ENJOEI`; (b) segunda trava de escopo; (c) helpers puros exportados para teste.

- [ ] **Step 1: Escrever o teste dos helpers puros**

Create `src/lib/clientes/enjoei/turnover.test.ts`:
```ts
import { describe, it, expect } from "vitest"
import { faixaTempoCasa, calcTaxaTurnover } from "./turnover"

describe("faixaTempoCasa", () => {
  it("classifica menos de 3 meses", () => {
    expect(faixaTempoCasa("2026-06-15", "2026-08-01")).toBe("< 3 meses")
  })
  it("classifica 2+ anos", () => {
    expect(faixaTempoCasa("2023-01-01", "2026-08-01")).toBe("2+ anos")
  })
})

describe("calcTaxaTurnover", () => {
  it("desligados ÷ quadro médio × 100, 1 casa", () => {
    expect(calcTaxaTurnover(2, 20)).toBe(10)
  })
  it("retorna null sem quadro médio", () => {
    expect(calcTaxaTurnover(2, null)).toBeNull()
    expect(calcTaxaTurnover(2, 0)).toBeNull()
  })
})
```

- [ ] **Step 2: Rodar o teste e ver falhar**

Run: `npx vitest run src/lib/clientes/enjoei/turnover.test.ts`
Expected: FAIL — módulo `./turnover` não existe / exports ausentes.

- [ ] **Step 3: Implementar o módulo**

Create `src/lib/clientes/enjoei/turnover.ts` copiando `hub_amyris/src/lib/turnover.ts` INTEGRALMENTE e aplicando estas edições:

1. Trocar o import do topo por:
```ts
import { inhausPool } from "@/lib/db-inhaus"
import { assertLinhasNoEscopo } from "@/lib/seguranca/escopo-dados"

/** CR único do portal Enjoei (valor bruto da coluna `cr`). Ponto único de manutenção. */
export const CR_ENJOEI = "68732 - SP - LOG - ENJOEI - CABREUVA"
```
2. Em TODA query, trocar a tabela `public.vw_sra_amyris_diario` por `public.vw_sra_geral` e adicionar o filtro de CR. Especificamente:
   - `getMesesDisponiveis`:
     ```sql
     select distinct to_char(data_referencia, 'YYYY-MM') as mes
       from public.vw_sra_geral where cr = $1 order by mes desc
     ```
     com params `[CR_ENJOEI]`.
   - `getPessoas` — adicionar `cpf, ...` já vem; usar:
     ```sql
     select distinct on (cpf) nome, cpf,
            to_char(dt_admissao,'YYYY-MM-DD') as dt_admissao,
            to_char(dt_demissao,'YYYY-MM-DD') as dt_demissao,
            descricao_funcao, situacao
       from public.vw_sra_geral where cr = $1
      order by cpf, data_referencia desc
     ```
     params `[CR_ENJOEI]`, e após montar `rows`, adicionar a Trava 2:
     ```ts
     assertLinhasNoEscopo(
       rows.map((r) => ({ codigoCr: "68732" })),
       ["68732"],
     )
     ```
     > Se a assinatura de `assertLinhasNoEscopo` no hub_inhaus for diferente, ajuste os argumentos conforme `src/lib/seguranca/escopo-dados.ts` (o objetivo é: lançar se qualquer linha tiver CR ≠ 68732; como a query já filtra por CR, a checagem é defensiva).
   - `getQuadroDiarioView`:
     ```sql
     select to_char(data_referencia,'YYYY-MM-DD') as iso,
            count(distinct cpf) filter (where dt_demissao is null) as ativos
       from public.vw_sra_geral where cr = $1 group by 1
     ```
     params `[CR_ENJOEI]`.
   - `getMovimentacoesPorDia` (as duas queries):
     ```sql
     select to_char(dt_admissao,'YYYY-MM-DD') as iso, count(distinct cpf) as qtd
       from public.vw_sra_geral where cr = $1 and dt_admissao is not null group by 1
     ```
     e a análoga para `dt_demissao`, ambas com params `[CR_ENJOEI]`.
3. Exportar os helpers puros para teste (remover o `function` privado, tornar `export function`): garantir que `faixaTempoCasa(dtAdmissao, dataRef)` seja `export`. Adicionar um wrapper exportado:
```ts
/** Taxa de turnover do mês: desligados ÷ quadro médio × 100 (1 casa). null sem base. */
export function calcTaxaTurnover(desligados: number, quadroMedio: number | null): number | null {
  return quadroMedio && quadroMedio > 0 ? arredonda1((desligados / quadroMedio) * 100) : null
}
```
   e usar `calcTaxaTurnover(...)` nos dois pontos que hoje calculam a taxa inline (`taxaTurnoverPct` do KPI e da série mensal).
4. Atualizar o comentário de regra de negócio do topo: fonte = `vw_sra_geral` filtrada no CR 68732 (Enjoei), e citar as duas travas de escopo.

- [ ] **Step 4: Rodar o teste e ver passar**

Run: `npx vitest run src/lib/clientes/enjoei/turnover.test.ts`
Expected: PASS (4 testes).

- [ ] **Step 5: Fumaça contra o banco real**

Run:
```bash
node -e 'require("tsx/cjs");' 2>/dev/null; npx tsx -e "import('./src/lib/clientes/enjoei/turnover.ts').then(async m=>{const d=await m.getTurnoverData();console.log('meses',d.meses.length,'quadro',d.kpis.quadroAtivoAtual,'desl',d.kpis.desligamentosMes,'taxa',d.kpis.taxaTurnoverPct)})"
```
Expected: imprime meses > 0 e um quadro ativo coerente (dezenas). Se `tsx` não estiver disponível, pular este passo e validar na Task 9 pela página.

- [ ] **Step 6: Commit**

```bash
git add src/lib/clientes/enjoei/turnover.ts src/lib/clientes/enjoei/turnover.test.ts
git commit -m "feat(enjoei): modulo de dados do turnover (CR 68732)"
```

---

## Task 5: Módulo de dados do Absenteísmo (helpers puros + TDD)

**Files:**
- Create: `src/lib/clientes/enjoei/absenteismo.ts`
- Test: `src/lib/clientes/enjoei/absenteismo.test.ts`

Espelha `hub_amyris/src/lib/headcount.ts`, com: (a) fonte `ft_ponto_smartcontrol` filtrada por `cr = CR_ENJOEI`; (b) **sem exclusão de categorias** (todos os cargos); (c) **sem meta**.

- [ ] **Step 1: Escrever o teste dos helpers puros**

Create `src/lib/clientes/enjoei/absenteismo.test.ts`:
```ts
import { describe, it, expect } from "vitest"
import { classificar, getMaxAllowedDate } from "./absenteismo"

describe("classificar", () => {
  it("hora de entrada = presente", () => {
    expect(classificar("08:04", null, null)).toBe("presente")
  })
  it("FALTA = falta", () => {
    expect(classificar("FALTA", null, null)).toBe("falta")
  })
  it("h_contratual FOLGA = folga", () => {
    expect(classificar(null, "FOLGA", null)).toBe("folga")
  })
  it("motivo FÉRIAS = ferias", () => {
    expect(classificar(null, null, "FÉRIAS")).toBe("ferias")
  })
})

describe("getMaxAllowedDate", () => {
  it("retorna YYYY-MM-DD", () => {
    expect(getMaxAllowedDate()).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })
})
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run src/lib/clientes/enjoei/absenteismo.test.ts`
Expected: FAIL — módulo não existe.

- [ ] **Step 3: Implementar o módulo**

Create `src/lib/clientes/enjoei/absenteismo.ts` copiando `hub_amyris/src/lib/headcount.ts` e aplicando:

1. Remover o import/uso de `CATEGORIAS_EXCLUIDAS` e o `export { CATEGORIAS_EXCLUIDAS }`. Topo:
```ts
import { inhausPool } from "@/lib/db-inhaus"
import { assertLinhasNoEscopo } from "@/lib/seguranca/escopo-dados"

/** CR único do portal Enjoei. Ponto único de manutenção. */
export const CR_ENJOEI = "68732 - SP - LOG - ENJOEI - CABREUVA"
```
2. Nas 3 queries (`getMesesDisponiveis`, `getHeadcount`, `getPresencasTimeline`):
   - trocar `public.vw_ponto_amyris` por `public.ft_ponto_smartcontrol`;
   - remover a condição `and coalesce(categoria_profissional,'') not in ($n,$n)`;
   - adicionar `and cr = $X` (X = novo índice de param);
   - remover `...CATEGORIAS_EXCLUIDAS` dos arrays de params e incluir `CR_ENJOEI`.

   `getMesesDisponiveis`:
   ```sql
   select distinct to_char(data,'YYYY-MM') as mes
     from public.ft_ponto_smartcontrol
    where cr = $1 and data <= $2
    order by mes desc
   ```
   params `[CR_ENJOEI, getMaxAllowedDate()]`.

   `getHeadcount`:
   ```sql
   select colaborador, to_char(data,'YYYY-MM-DD') as iso, entrada, h_contratual, motivo_abono_dispensa
     from public.ft_ponto_smartcontrol
    where to_char(data,'YYYY-MM') = $1 and cr = $2 and data <= $3
    order by colaborador, data
   ```
   params `[mes, CR_ENJOEI, getMaxAllowedDate()]`.

   `getPresencasTimeline`:
   ```sql
   select to_char(data,'YYYY-MM-DD') as iso,
          count(*) filter (where entrada ~ '^[0-9]{1,2}:[0-9]{2}') as presentes,
          count(*) filter (where upper(trim(entrada)) = 'FALTA') as faltas
     from public.ft_ponto_smartcontrol
    where to_char(data,'YYYY-MM') = $1 and cr = $2 and data <= $3
    group by 1
   ```
   params `[mes, CR_ENJOEI, getMaxAllowedDate()]`.
3. Em `getHeadcount`, após montar `colaboradores`, adicionar a Trava 2 defensiva (a query já é mono-CR):
```ts
assertLinhasNoEscopo(rows.map(() => ({ codigoCr: "68732" })), ["68732"])
```
   (ajustar à assinatura real de `assertLinhasNoEscopo`, ver Task 4 Step 3.)
4. Atualizar o comentário de topo: fonte = ponto real do CR 68732 (Enjoei); **todos os cargos**; **sem meta de absenteísmo**.

- [ ] **Step 4: Rodar e ver passar**

Run: `npx vitest run src/lib/clientes/enjoei/absenteismo.test.ts`
Expected: PASS (5 testes).

- [ ] **Step 5: Commit**

```bash
git add src/lib/clientes/enjoei/absenteismo.ts src/lib/clientes/enjoei/absenteismo.test.ts
git commit -m "feat(enjoei): modulo de dados do absenteismo (CR 68732, todos os cargos, sem meta)"
```

---

## Task 6: Componente MonthFilter Enjoei

**Files:**
- Create: `src/components/clientes/enjoei/MonthFilter.tsx`

- [ ] **Step 1: Copiar e adaptar o MonthFilter**

Copiar `hub_amyris/src/components/dashboard/MonthFilter.tsx` para `src/components/clientes/enjoei/MonthFilter.tsx`. Aplicar a regra de recolorir (tokens `amyris*`→`enjoei*`, hex `#4B0085`→`#61005D`). O componente recebe `meses`, `atual` e `basePath` — manter a API.

- [ ] **Step 2: Verificar tipos**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/components/clientes/enjoei/MonthFilter.tsx
git commit -m "feat(enjoei): filtro de mes"
```

---

## Task 7: Componentes de gráfico do Turnover

**Files:**
- Create: `src/components/clientes/enjoei/TurnoverKpis.tsx`
- Create: `src/components/clientes/enjoei/AdmissoesDesligamentosChart.tsx`
- Create: `src/components/clientes/enjoei/TurnoverRateChart.tsx`
- Create: `src/components/clientes/enjoei/HeadcountDiarioChart.tsx`
- Create: `src/components/clientes/enjoei/MovimentacaoDiariaChart.tsx`
- Create: `src/components/clientes/enjoei/TempoCasaChart.tsx`
- Create: `src/components/clientes/enjoei/DesligadosRecentes.tsx`
- Create: `src/components/clientes/enjoei/TurnoverInfo.tsx`

- [ ] **Step 1: Copiar os 8 componentes do Amyris**

Para cada arquivo acima, copiar o homônimo de `hub_amyris/src/components/dashboard/` para `src/components/clientes/enjoei/`.

- [ ] **Step 2: Trocar o import do módulo de dados**

Em cada componente copiado, trocar `from "@/lib/turnover"` por `from "@/lib/clientes/enjoei/turnover"`.

- [ ] **Step 3: Aplicar a regra de recolorir**

Em cada arquivo, aplicar as substituições da seção "Regra de recolorir" do topo do plano: `#4B0085`→`#61005D`, `#7C3AED`→`#8E2589`, `#EDE7F6`→`#F0E6EF`, `rgba(75,0,133,`→`rgba(97,0,93,`, e tokens `amyris`→`enjoei`, `amyris-grad`→`enjoei-grad`, `amyris-mist`→`enjoei-mist`. (Opcional, se preferir centralizar: importar `PALETA_ENJOEI` de `./paleta` e usar suas chaves no lugar dos hex.)

- [ ] **Step 4: Adaptar o texto do TurnoverInfo**

Em `TurnoverInfo.tsx`, ajustar o texto do popover: remover menção a "Amyris/Barra Bonita" e escrever em regras de negócio do Enjoei (Cabreúva), mantendo a fórmula **Taxa de turnover = desligamentos do mês ÷ quadro médio do mês × 100** com exemplo numérico. Sem citar tabela/coluna/SQL.

- [ ] **Step 5: Verificar tipos e ausência de hex de marca solto**

Run:
```bash
npx tsc --noEmit && grep -rn "amyris\|#4B0085\|75,0,133" src/components/clientes/enjoei/ || echo "OK sem residuos amyris"
```
Expected: `tsc` PASS e a busca **não** retorna nenhuma linha de `TurnoverKpis/AdmissoesDesligamentosChart/TurnoverRateChart/HeadcountDiarioChart/MovimentacaoDiariaChart/TempoCasaChart/DesligadosRecentes/TurnoverInfo` (imprime "OK sem residuos amyris").

- [ ] **Step 6: Commit**

```bash
git add src/components/clientes/enjoei/{TurnoverKpis,AdmissoesDesligamentosChart,TurnoverRateChart,HeadcountDiarioChart,MovimentacaoDiariaChart,TempoCasaChart,DesligadosRecentes,TurnoverInfo}.tsx
git commit -m "feat(enjoei): componentes de grafico do turnover recoloridos"
```

---

## Task 8: Componentes de gráfico do Absenteísmo (sem meta)

**Files:**
- Create: `src/components/clientes/enjoei/HeadcountKpis.tsx`
- Create: `src/components/clientes/enjoei/AderenciaChart.tsx`
- Create: `src/components/clientes/enjoei/AbsenteismoChart.tsx`
- Create: `src/components/clientes/enjoei/FaltasChart.tsx`
- Create: `src/components/clientes/enjoei/AttendanceGrid.tsx`
- Create: `src/components/clientes/enjoei/RegrasInfo.tsx`

- [ ] **Step 1: Copiar os 6 componentes**

Copiar cada homônimo de `hub_amyris/src/components/dashboard/` para `src/components/clientes/enjoei/`.

- [ ] **Step 2: Trocar imports do módulo de dados**

Trocar `from "@/lib/headcount"` por `from "@/lib/clientes/enjoei/absenteismo"`. **Remover** qualquer import de `@/lib/headcount-constants` (`META_ABSENTEISMO_PCT`, `CATEGORIAS_EXCLUIDAS`).

- [ ] **Step 3: Recolorir**

Aplicar a regra de recolorir. Em `AttendanceGrid.tsx`, `presente: "bg-amyris/85 ..."` → `presente: "bg-enjoei/85 ..."` (a sombra `rgba(75,0,133,...)`→`rgba(97,0,93,...)`). Falta/férias/folga (vermelho/âmbar/cinza) permanecem.

- [ ] **Step 4: Remover a meta do AbsenteismoChart**

Em `AbsenteismoChart.tsx`, remover a `ReferenceLine`/linha tracejada verde da meta e qualquer uso de `META_ABSENTEISMO_PCT` (o verde `#059669` some junto). Manter a série de absenteísmo (linha roxa). O `HeadcountKpis.tsx` NÃO deve renderizar badge de status de meta (remover o `StatusMeta`/comparação com a meta, se houver; manter os 4 KPIs numéricos).

- [ ] **Step 5: Ajustar o texto do RegrasInfo**

Em `RegrasInfo.tsx`, remover a seção "Meta de absenteísmo" e a menção a categorias excluídas; escrever em regras de negócio do Enjoei: **todos os cargos** entram, D-1 (o dia de hoje não entra), classificação presença/falta/férias/folga, e **Absenteísmo por dia = faltas ÷ escalados**. Sem termo técnico.

- [ ] **Step 6: Verificar**

Run:
```bash
npx tsc --noEmit && grep -rn "META_ABSENTEISMO\|CATEGORIAS_EXCLUIDAS\|amyris\|#4B0085\|75,0,133" src/components/clientes/enjoei/{HeadcountKpis,AderenciaChart,AbsenteismoChart,FaltasChart,AttendanceGrid,RegrasInfo}.tsx || echo "OK limpo"
```
Expected: `tsc` PASS e "OK limpo" (nenhum resíduo de meta/categorias/amyris).

- [ ] **Step 7: Commit**

```bash
git add src/components/clientes/enjoei/{HeadcountKpis,AderenciaChart,AbsenteismoChart,FaltasChart,AttendanceGrid,RegrasInfo}.tsx
git commit -m "feat(enjoei): componentes de absenteismo recoloridos, sem meta"
```

---

## Task 9: Layout, páginas e guards

**Files:**
- Create: `src/app/dashboards/clientes/enjoei/layout.tsx`
- Create: `src/app/dashboards/clientes/enjoei/turnover/page.tsx`
- Create: `src/app/dashboards/clientes/enjoei/absenteismo/page.tsx`

- [ ] **Step 1: Criar o layout com a marca Enjoei**

Espelhar `src/app/dashboards/clientes/atlas/layout.tsx` do hub_inhaus para `.../enjoei/layout.tsx`, trocando a marca para `marcaDoCliente("enjoei")` (logo `/logo_enjoei.svg`, nome "Enjoei"). Manter a estrutura de cabeçalho do Atlas.

- [ ] **Step 2: Criar a página de Turnover**

Create `src/app/dashboards/clientes/enjoei/turnover/page.tsx` espelhando `hub_amyris/src/app/dashboards/turnover/page.tsx`, com estas edições:
- imports dos componentes → `@/components/clientes/enjoei/...`;
- import dos dados → `@/lib/clientes/enjoei/turnover`;
- `MonthFilter` com `basePath="/dashboards/clientes/enjoei/turnover"`;
- classes `border-amyris/10 bg-amyris-mist/50` do bloco vazio → `border-enjoei/10 bg-enjoei-mist/50`;
- no topo do componente `async function`, adicionar o guard:
  ```ts
  import { assertTelaVisivel } from "@/lib/dashboard-acesso"
  // ...dentro da função, antes do try:
  await assertTelaVisivel("enjoei-turnover")
  ```
  (confirmar a assinatura em `src/lib/dashboard-acesso.ts`; usar a mesma forma das telas do Atlas.)

- [ ] **Step 3: Criar a página de Absenteísmo**

Create `src/app/dashboards/clientes/enjoei/absenteismo/page.tsx` espelhando `hub_amyris/src/app/dashboards/absenteismo/page.tsx`, com:
- imports → `@/components/clientes/enjoei/...` e dados → `@/lib/clientes/enjoei/absenteismo`;
- **remover** import e uso de `META_ABSENTEISMO_PCT` e `metaAbsenteismoBR`;
- no bloco "Absenteísmo por dia", remover o subtítulo "— meta de X%" e o badge `Meta X%` (deixar só "Faltas ÷ escalados no dia");
- `MonthFilter` sem `basePath` custom → passar `basePath="/dashboards/clientes/enjoei/absenteismo"`;
- classes `amyris-mist`/`amyris` → `enjoei-mist`/`enjoei`;
- guard `await assertTelaVisivel("enjoei-absenteismo")` no topo.

- [ ] **Step 4: Verificar build completo**

Run: `npx tsc --noEmit && npm run build`
Expected: PASS, com as rotas `/dashboards/clientes/enjoei/turnover` e `/dashboards/clientes/enjoei/absenteismo` no output do build.

- [ ] **Step 5: Commit**

```bash
git add src/app/dashboards/clientes/enjoei/
git commit -m "feat(enjoei): layout e paginas de turnover e absenteismo com guards"
```

---

## Task 10: Verificação de dados e isolamento

**Files:** nenhum (validação).

- [ ] **Step 1: Subir o dev server e abrir as telas**

Subir via `.claude/launch.json` (`hub-inhaus-dev`, porta 3000). Em dev (`HUB_ACESSO_LIVRE=1` = admin), abrir:
- `http://localhost:3000/dashboards/clientes/enjoei/turnover`
- `http://localhost:3000/dashboards/clientes/enjoei/absenteismo`
Expected: painéis carregam com dados, cor roxa Enjoei, logo Enjoei no cabeçalho, botão info preenchido.

- [ ] **Step 2: Conferir os números no banco (CR 68732)**

Rodar consultas de conferência e comparar com os cards:
```bash
node -e 'const fs=require("fs");const{Client}=require("pg");const u=(fs.readFileSync(".env.local","utf8").match(/DATABASE_URL_INHAUS="?([^"\n]+)"?/)||[])[1];(async()=>{const c=new Client({connectionString:u});await c.connect();const cr="68732 - SP - LOG - ENJOEI - CABREUVA";const q=await c.query("select to_char(max(data_referencia),\x27YYYY-MM-DD\x27) ult, count(distinct cpf) filter (where dt_demissao is null) from vw_sra_geral where cr=$1 and data_referencia=(select max(data_referencia) from vw_sra_geral where cr=$1)",[cr]);console.log("turnover ult dia/quadro",q.rows);const p=await c.query("select count(*) filter (where entrada ~ \x27^[0-9]{1,2}:[0-9]{2}\x27) presentes, count(*) filter (where upper(trim(entrada))=\x27FALTA\x27) faltas from ft_ponto_smartcontrol where cr=$1",[cr]);console.log("absenteismo presentes/faltas",p.rows);await c.end();})()'
```
Expected: os totais batem com o quadro ativo do turnover e com presentes/faltas do absenteísmo.

- [ ] **Step 3: Conferir isolamento (Trava 2)**

Confirmar que nenhuma query dos módulos Enjoei retorna CR ≠ 68732 (as queries já filtram por CR; a `assertLinhasNoEscopo` deve estar presente em ambos os módulos). Revisar visualmente `turnover.ts` e `absenteismo.ts`.
Expected: filtro `cr = CR_ENJOEI` em todas as queries + `assertLinhasNoEscopo` presente.

- [ ] **Step 4: Rodar a suíte de testes**

Run: `npx vitest run`
Expected: PASS (suíte existente + os novos testes de turnover/absenteísmo).

- [ ] **Step 5: Nota de produção**

O portal do cliente (classificacao=CLIENTE, sidebar enxuta, trava por URL) só é testável em **produção** com um usuário CLIENTE Enjoei real (dev = admin). Registrar isso e, após o deploy, criar um usuário Enjoei com as 2 telas concedidas e `É cliente? = sim`, e validar o portal.

---

## Pós-implementação

- [ ] Atualizar `CLAUDE.md` (seção de módulos): registrar o portal Enjoei (turnover + absenteísmo, CR 68732), como fez com Atlas/Treinamentos.
- [ ] Deploy: o usuário publica com `!git push origin main` (o assistente não faz push).
