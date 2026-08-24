# Visibilidade por tela + Módulo de Desvios (Atlas Copco / GPS) — Plano de Implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ligar a sidebar/rotas ao `visibleScreens` (cliente só vê o que é dele) e construir o módulo de Desvios da Atlas Copco (tenant isolado, 2 telas, import das 40 linhas GPS).

**Architecture:** Dois eixos de governança. Eixo 1 (telas) já tem `visibleScreens` na sessão — só falta a sidebar e um guard de rota honrarem isso. Eixo 2 (dados) ganha um tenant `ClienteContratante` com gateway de isolamento espelhando `escopo-dados.ts` (2 travas). Desvios é uma tabela transacional criada por SQL manual idempotente.

**Tech Stack:** Next.js 14 (App Router, server components) · TypeScript · Prisma + Postgres compartilhado · zod · vitest · Tailwind/shadcn.

**REGRA CRÍTICA:** NUNCA `prisma db push`/`migrate` neste banco (dropa tabelas da SRA). DDL só por SQL manual idempotente em `prisma/sql/`, aplicado à mão, seguido de `npx prisma generate`.

**Verificação padrão de cada fase:** `npx tsc --noEmit` e `npm run build`. Testes: `npx vitest run`.

---

## Estrutura de arquivos

**Frente A — Visibilidade**
- Modify: `src/lib/dashboard-acesso.ts` — expõe `visibleScreens` + helper `assertTelaVisivel`.
- Modify: `src/app/dashboards/layout.tsx` — repassa telas visíveis.
- Modify: `src/components/dashboard/DashboardShell.tsx` — recebe/repassa prop.
- Modify: `src/components/dashboard/DashboardSidebar.tsx` — monta grupos por telas visíveis.

**Frente B — Desvios**
- Modify: `prisma/schema.prisma` — models `ClienteContratante`, `AuthUserContratante`, `Desvio`.
- Create: `prisma/sql/009_desvios.sql` — DDL idempotente.
- Create: `src/lib/seguranca/escopo-contratante.ts` — gateway do tenant (2 travas).
- Create: `src/lib/seguranca/escopo-contratante.test.ts` — testes do gateway.
- Create: `src/lib/desvios/opcoes.ts` — listas de dropdown (constantes da planilha).
- Create: `src/lib/desvios/schemas.ts` — zod (criar/atualizar/filtros).
- Create: `src/lib/desvios/index.ts` — regras de negócio (listar/criar/atualizar).
- Modify: `src/lib/domains.ts` — domínio `clientes` + 2 telas.
- Create: `src/app/api/desvios/route.ts` — GET (lista paginada) + POST (criar).
- Create: `src/app/api/desvios/[id]/route.ts` — PATCH (status/tratativa).
- Create: `src/app/dashboards/clientes/atlas/desvios/page.tsx` — Acompanhamento.
- Create: `src/app/dashboards/clientes/atlas/desvios/novo/page.tsx` — Formulário.
- Create: `src/components/desvios/FormularioDesvio.tsx` — form client.
- Create: `src/components/desvios/TabelaDesvios.tsx` — tabela paginada + detalhe + update.
- Create: `src/components/desvios/InfoDesvios.tsx` — textos do botão info.
- Modify: `src/app/api/admin/usuarios/route.ts` + `src/lib/usuarios-admin.ts` — vínculo de contratante.
- Modify: `src/app/api/admin/clientes-crs/route.ts` (ou novo) — listar contratantes p/ o seletor.
- Create: `scripts/seed_desvios_gps.mjs` — import das 40 linhas GPS.

---

# FRENTE A — Governança de visibilidade

### Task A1: `resolverPapeisDashboard` expõe telas visíveis

**Files:**
- Modify: `src/lib/dashboard-acesso.ts`

- [ ] **Step 1: adicionar `visibleScreens` ao tipo e ao retorno**

Em `PapeisDashboard` (após `soPreenche`) adicionar:
```ts
  /** Telas concedidas ao usuário (chaves de domains.ts). Admin/dev = todas. */
  visibleScreens: string[]
```

No branch de acesso livre (dev), retornar todas:
```ts
  if (acessoLivreLiberado()) {
    return {
      nome: USUARIO_DEV.nome,
      email: null,
      isAdmin: USUARIO_DEV.isAdmin,
      epiConfig: true,
      epiValida: true,
      soPreenche: false,
      visibleScreens: CHAVES_DE_TELA,
    }
  }
```
Adicionar o import no topo:
```ts
import { CHAVES_DE_TELA } from "@/lib/domains"
```

No retorno da sessão real, usar o que já vem em `sessao.authorization.visibleScreens` (admin recebe todas lá):
```ts
    soPreenche: epiValida && !epiConfig && !isAdmin,
    visibleScreens: sessao.authorization.visibleScreens,
```

- [ ] **Step 2: criar o guard de rota `assertTelaVisivel`**

Ao fim do arquivo:
```ts
import { redirect } from "next/navigation" // já importado no topo — não duplicar

/**
 * Guard de ROTA por tela (Eixo 1). Chame no topo de um page.tsx protegido com a
 * `key` da tela (domains.ts). Admin/dev passam sempre. Sem a tela concedida →
 * redireciona para a Home (o menu não mostra o que ele não pode ver; a URL direta
 * também não entra).
 */
export async function assertTelaVisivel(telaKey: string): Promise<void> {
  const papeis = await resolverPapeisDashboard()
  if (papeis.isAdmin) return
  if (!papeis.visibleScreens.includes(telaKey)) redirect("/dashboards")
}
```

- [ ] **Step 3: verificar tipos**

Run: `npx tsc --noEmit`
Expected: sem erros.

- [ ] **Step 4: Commit**
```bash
git add src/lib/dashboard-acesso.ts
git commit -m "feat(acesso): papeis expoem visibleScreens + guard assertTelaVisivel"
```

---

### Task A2: Sidebar monta grupos por telas visíveis

**Files:**
- Modify: `src/components/dashboard/DashboardSidebar.tsx`
- Modify: `src/components/dashboard/DashboardShell.tsx`
- Modify: `src/app/dashboards/layout.tsx`

- [ ] **Step 1: layout repassa `visibleScreens`**

Em `src/app/dashboards/layout.tsx`, acrescentar a prop:
```tsx
    <DashboardShell
      nome={papeis.nome}
      email={papeis.email}
      isAdmin={papeis.isAdmin}
      epiConfig={papeis.epiConfig}
      epiValida={papeis.epiValida}
      soPreenche={papeis.soPreenche}
      visibleScreens={papeis.visibleScreens}
    >
```

- [ ] **Step 2: Shell aceita e repassa a prop**

Em `DashboardShell.tsx`, adicionar `visibleScreens?: string[]` às props do componente e repassar para `<DashboardSidebar ... visibleScreens={visibleScreens} />` (nos dois pontos onde a sidebar é renderizada — drawer mobile e fixa). Se em dúvida, procurar por `<DashboardSidebar` no arquivo.

- [ ] **Step 3: Sidebar filtra os grupos**

Em `DashboardSidebar.tsx`:
1. Adicionar `visibleScreens = null as string[] | null` às props (default null = mostra tudo, retrocompatível).
2. Trocar o const estático `GRUPOS_DOMINIO` por uma função que filtra por chave:
```tsx
function gruposDominio(visibleScreens: string[] | null): NavGroup[] {
  const permitidas = visibleScreens ? new Set(visibleScreens) : null
  return DOMINIOS.map((dominio) => ({
    title: dominio.label,
    icon: dominio.icone,
    items: dominio.telas
      .filter((tela) => !tela.emBreve)
      .filter((tela) => permitidas === null || permitidas.has(tela.key))
      .map((tela) => ({
        href: tela.href,
        label: tela.label,
        icon: tela.icone ?? LayoutDashboard,
      })),
  })).filter((grupo) => grupo.items.length > 0)
}
```
3. No corpo do componente, substituir o uso de `GRUPOS_DOMINIO` por `gruposDominio(visibleScreens)`:
```tsx
  const grupos = [
    grupoGeral,
    ...gruposDominio(visibleScreens),
    ...(grupoEpiAtual ? [grupoEpiAtual] : []),
    ...(isAdmin ? [GRUPO_ADMIN] : []),
  ]
```

- [ ] **Step 4: build + tsc**

Run: `npx tsc --noEmit && npm run build`
Expected: sem erros.

- [ ] **Step 5: Verificação manual (dev)**

Com o server no ar (`.claude/launch.json`, porta 3000, já rodando), abrir http://localhost:3000/dashboards. No acesso livre (admin) TODOS os domínios aparecem — comportamento correto (admin vê tudo). A restrição real será validada na Task B8 com um usuário-cliente.

- [ ] **Step 6: Commit**
```bash
git add src/components/dashboard/DashboardSidebar.tsx src/components/dashboard/DashboardShell.tsx src/app/dashboards/layout.tsx
git commit -m "feat(shell): sidebar monta grupos a partir das telas concedidas"
```

---

# FRENTE B — Módulo de Desvios (Atlas / GPS)

### Task B1: Models Prisma + DDL idempotente

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/sql/009_desvios.sql`

- [ ] **Step 1: adicionar os models ao schema**

Ao fim de `prisma/schema.prisma`:
```prisma
// ===========================================================================
// MÓDULO CLIENTES — Cliente Contratante (tenant) + Desvios.
// Tabelas criadas por prisma/sql/009_desvios.sql (SQL manual, NUNCA db push).
// ===========================================================================

// Cliente contratante = dono de dados transacionais próprios do hub (tenant).
// Diferente do grupo de cliente da SRA (recorte por CR).
model ClienteContratante {
  id        Int      @id @default(autoincrement())
  nome      String   @unique
  slug      String   @unique
  ativo     Boolean  @default(true)
  criadoEm  DateTime @default(now()) @map("criado_em")

  @@map("cliente_contratante")
}

// Vínculo usuário → contratante (autorização LOCAL do hub).
model AuthUserContratante {
  id            Int      @id @default(autoincrement())
  authUserId    String   @map("auth_user_id")
  contratanteId Int      @map("contratante_id")
  criadoEm      DateTime @default(now()) @map("criado_em")

  @@unique([authUserId, contratanteId])
  @@index([authUserId])
  @@map("auth_user_contratante")
}

// Desvio (ocorrência). Isolado por contratante (Eixo 2). Status = "Caso Resolvido?".
model Desvio {
  id                 Int       @id @default(autoincrement())
  contratanteId      Int       @map("contratante_id")
  responsavelInterno String?   @map("responsavel_interno")
  numeroOtbWbs       String?   @map("numero_otb_wbs")
  tipo               String?
  divisao            String?
  solicitante        String?
  dataOcorrencia     DateTime? @map("data_ocorrencia") @db.Date
  clienteFinal       String?   @map("cliente_final")
  motivo             String?
  causaRaiz          String?   @map("causa_raiz")
  resumoCaso         String?   @map("resumo_caso")
  solucao            String?
  status             String    @default("EM_TRATATIVA") // EM_TRATATIVA | NAO | SIM
  dataFaturamento    DateTime? @map("data_faturamento") @db.Date
  dataSeparacao      DateTime? @map("data_separacao") @db.Date
  valor              Decimal?  @db.Decimal(14, 2)
  criadoPor          String?   @map("criado_por")
  atualizadoPor      String?   @map("atualizado_por")
  criadoEm           DateTime  @default(now()) @map("criado_em")
  atualizadoEm       DateTime  @updatedAt @map("atualizado_em")

  @@index([contratanteId])
  @@index([status])
  @@map("desvio")
}
```

- [ ] **Step 2: escrever o SQL idempotente**

Create `prisma/sql/009_desvios.sql`:
```sql
-- Módulo Clientes: Cliente Contratante (tenant) + Desvios.
-- SQL MANUAL idempotente (o banco é compartilhado com a SRA; NUNCA prisma db push).

CREATE TABLE IF NOT EXISTS cliente_contratante (
  id        serial PRIMARY KEY,
  nome      text NOT NULL UNIQUE,
  slug      text NOT NULL UNIQUE,
  ativo     boolean NOT NULL DEFAULT true,
  criado_em timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS auth_user_contratante (
  id             serial PRIMARY KEY,
  auth_user_id   text NOT NULL,
  contratante_id integer NOT NULL,
  criado_em      timestamp NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS auth_user_contratante_uq
  ON auth_user_contratante (auth_user_id, contratante_id);
CREATE INDEX IF NOT EXISTS auth_user_contratante_user_idx
  ON auth_user_contratante (auth_user_id);

CREATE TABLE IF NOT EXISTS desvio (
  id                  serial PRIMARY KEY,
  contratante_id      integer NOT NULL,
  responsavel_interno text,
  numero_otb_wbs      text,
  tipo                text,
  divisao             text,
  solicitante         text,
  data_ocorrencia     date,
  cliente_final       text,
  motivo              text,
  causa_raiz          text,
  resumo_caso         text,
  solucao             text,
  status              text NOT NULL DEFAULT 'EM_TRATATIVA',
  data_faturamento    date,
  data_separacao      date,
  valor               numeric(14,2),
  criado_por          text,
  atualizado_por      text,
  criado_em           timestamp NOT NULL DEFAULT now(),
  atualizado_em       timestamp NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS desvio_contratante_idx ON desvio (contratante_id);
CREATE INDEX IF NOT EXISTS desvio_status_idx ON desvio (status);

DO $$ BEGIN
  ALTER TABLE auth_user_contratante
    ADD CONSTRAINT auth_user_contratante_contratante_fk
    FOREIGN KEY (contratante_id) REFERENCES cliente_contratante (id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE desvio
    ADD CONSTRAINT desvio_contratante_fk
    FOREIGN KEY (contratante_id) REFERENCES cliente_contratante (id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Semente do tenant Atlas Copco (idempotente).
INSERT INTO cliente_contratante (nome, slug)
VALUES ('Atlas Copco', 'atlas')
ON CONFLICT (nome) DO NOTHING;
```

- [ ] **Step 3: aplicar o SQL no banco e gerar o client**

Run (PowerShell, usa a `DATABASE_URL` do `.env.local`):
```
npx dotenv -e .env.local -- psql "$env:DATABASE_URL" -f prisma/sql/009_desvios.sql
```
Se `dotenv`/`psql` não estiverem disponíveis, aplicar o arquivo pelo cliente de banco de sua preferência (o conteúdo é idempotente). Depois:
```
npx prisma generate
```
Expected: `psql` imprime `CREATE TABLE`/`INSERT 0 1`; `prisma generate` conclui sem tocar no banco.

- [ ] **Step 4: verificar tipos**

Run: `npx tsc --noEmit`
Expected: sem erros (Prisma Client conhece `desvio`, `clienteContratante`, `authUserContratante`).

- [ ] **Step 5: Commit**
```bash
git add prisma/schema.prisma prisma/sql/009_desvios.sql
git commit -m "feat(clientes): schema + DDL do tenant contratante e da tabela de desvios"
```

---

### Task B2: Gateway de isolamento do contratante (TDD)

**Files:**
- Create: `src/lib/seguranca/escopo-contratante.ts`
- Test: `src/lib/seguranca/escopo-contratante.test.ts`

- [ ] **Step 1: escrever o teste falho**

Create `src/lib/seguranca/escopo-contratante.test.ts`:
```ts
import { describe, it, expect } from "vitest"
import {
  predicadoContratante,
  assertDesviosNoEscopo,
  type EscopoContratante,
} from "./escopo-contratante"

describe("predicadoContratante", () => {
  it("escopo todos → sem filtro", () => {
    const r = predicadoContratante({ tipo: "todos" }, "contratante_id", 1)
    expect(r.sql).toBe("")
    expect(r.params).toEqual([])
  })
  it("lista vazia → 1=0 (fail-closed)", () => {
    const r = predicadoContratante({ tipo: "lista", ids: [] }, "contratante_id", 1)
    expect(r.sql).toBe(" and 1=0")
  })
  it("lista → filtra por id com placeholder", () => {
    const r = predicadoContratante({ tipo: "lista", ids: [7] }, "contratante_id", 3)
    expect(r.sql).toBe(" and contratante_id = any($3::int[])")
    expect(r.params).toEqual([[7]])
  })
})

describe("assertDesviosNoEscopo", () => {
  const escopo: EscopoContratante = { tipo: "lista", ids: [7] }
  it("passa quando todas as linhas estão no escopo", () => {
    expect(() =>
      assertDesviosNoEscopo([{ contratanteId: 7 }], (l) => l.contratanteId, escopo),
    ).not.toThrow()
  })
  it("lança quando uma linha vaza contratante fora do escopo", () => {
    expect(() =>
      assertDesviosNoEscopo([{ contratanteId: 9 }], (l) => l.contratanteId, escopo),
    ).toThrow(/fora do escopo/)
  })
  it("escopo todos nunca lança", () => {
    expect(() =>
      assertDesviosNoEscopo([{ contratanteId: 9 }], (l) => l.contratanteId, { tipo: "todos" }),
    ).not.toThrow()
  })
})
```

- [ ] **Step 2: rodar e ver falhar**

Run: `npx vitest run src/lib/seguranca/escopo-contratante.test.ts`
Expected: FAIL (módulo não existe).

- [ ] **Step 3: implementar o gateway**

Create `src/lib/seguranca/escopo-contratante.ts`:
```ts
/**
 * NÚCLEO DE SEGURANÇA — isolamento por Cliente Contratante (tenant).
 * Espelha src/lib/seguranca/escopo-dados.ts, mas a chave é o id do contratante.
 *  - `todos` (admin interno) = sem filtro.
 *  - `lista` = só os ids informados. Lista vazia = NADA (fail-closed).
 * Módulo server-only.
 */
import { prisma } from "@/lib/prisma"

export type EscopoContratante =
  | { tipo: "todos" }
  | { tipo: "lista"; ids: number[] }

export function predicadoContratante(
  escopo: EscopoContratante,
  coluna: string,
  placeholder: number,
): { sql: string; params: unknown[] } {
  if (escopo.tipo === "todos") return { sql: "", params: [] }
  if (escopo.ids.length === 0) return { sql: " and 1=0", params: [] }
  return {
    sql: ` and ${coluna} = any($${placeholder}::int[])`,
    params: [escopo.ids],
  }
}

export function assertDesviosNoEscopo<T>(
  linhas: readonly T[],
  getId: (linha: T) => number | null | undefined,
  escopo: EscopoContratante,
): void {
  if (escopo.tipo === "todos") return
  const permitidos = new Set(escopo.ids)
  for (const linha of linhas) {
    const id = getId(linha)
    if (id == null) continue
    if (!permitidos.has(id)) {
      throw new Error(
        `Bloqueio de segurança: desvio com contratante fora do escopo do usuário (${id}).`,
      )
    }
  }
}

export type UsuarioEscopoContratante = {
  authUserId: string | null | undefined
  isAdmin: boolean
  classificacao: string // 'INTERNO' | 'CLIENTE'
}

/**
 * Resolve o escopo de contratantes do usuário.
 *  - admin + INTERNO → { todos }.
 *  - CLIENTE (mesmo admin) → nunca todos; só pelos vínculos.
 *  - sem vínculo e não-admin → lista vazia (fail-closed).
 */
export async function resolverEscopoContratante(
  usuario: UsuarioEscopoContratante,
): Promise<EscopoContratante> {
  const ehCliente = usuario.classificacao === "CLIENTE"
  if (usuario.isAdmin && !ehCliente) return { tipo: "todos" }
  if (!usuario.authUserId) return { tipo: "lista", ids: [] }
  const vinculos = await prisma.authUserContratante.findMany({
    where: { authUserId: usuario.authUserId },
    select: { contratanteId: true },
  })
  return { tipo: "lista", ids: vinculos.map((v) => v.contratanteId) }
}
```

- [ ] **Step 4: rodar e ver passar**

Run: `npx vitest run src/lib/seguranca/escopo-contratante.test.ts`
Expected: PASS (todos os casos).

- [ ] **Step 5: Commit**
```bash
git add src/lib/seguranca/escopo-contratante.ts src/lib/seguranca/escopo-contratante.test.ts
git commit -m "feat(seguranca): gateway de isolamento por contratante (2 travas) com testes"
```

---

### Task B3: Opções de dropdown + schemas zod

**Files:**
- Create: `src/lib/desvios/opcoes.ts`
- Create: `src/lib/desvios/schemas.ts`

- [ ] **Step 1: constantes das opções (extraídas da planilha)**

Create `src/lib/desvios/opcoes.ts`:
```ts
/** Listas de valores dos campos de um desvio (fonte: planilha Controle de Aderência). */
export const RESPONSAVEIS_INTERNOS = ["ACTA", "ACTA / GPS", "CP", "CP / GPS", "GPS"] as const
export const TIPOS = ["Pedido de Venda", "ACS - Kit Conjunto", "CS - Kit Conjunto", "Pedido TMC"] as const
export const DIVISOES = ["BR31", "BR41"] as const
export const MOTIVOS = [
  "Falta de Material", "Envio Divergente", "Falha de faturamento",
  "Necessidade CS", "Não enviado", "Perda de material",
] as const
export const CAUSAS_RAIZ = [
  "Divergencia de Estoque", "Erro na criação de OTB", "Erro no cadastro do cliente",
  "Falha de processo", "Falha na Sep/Conf", "OTB bloqueada no SAP",
] as const

/** Status = "Caso Resolvido?" da planilha. Valor no banco → rótulo na tela. */
export const STATUS_DESVIO = [
  { value: "EM_TRATATIVA", label: "Em tratativa" },
  { value: "NAO", label: "Não" },
  { value: "SIM", label: "Sim" },
] as const

/** Mapeia o texto "Caso Resolvido?" da planilha para o valor de status. */
export function statusDoTextoPlanilha(texto: string | null | undefined): string {
  const t = (texto ?? "").trim().toLowerCase()
  if (t === "sim") return "SIM"
  if (t === "não" || t === "nao") return "NAO"
  return "EM_TRATATIVA"
}
```

- [ ] **Step 2: schemas zod**

Create `src/lib/desvios/schemas.ts`:
```ts
import { z } from "zod"

const dataOpcional = z
  .string()
  .trim()
  .optional()
  .nullable()
  .transform((v) => (v ? v : null))

export const criarDesvioSchema = z.object({
  responsavelInterno: z.string().trim().optional().nullable(),
  numeroOtbWbs: z.string().trim().optional().nullable(),
  tipo: z.string().trim().optional().nullable(),
  divisao: z.string().trim().optional().nullable(),
  solicitante: z.string().trim().optional().nullable(),
  dataOcorrencia: dataOpcional,
  clienteFinal: z.string().trim().optional().nullable(),
  motivo: z.string().trim().optional().nullable(),
  causaRaiz: z.string().trim().optional().nullable(),
  resumoCaso: z.string().trim().optional().nullable(),
  solucao: z.string().trim().optional().nullable(),
  status: z.enum(["EM_TRATATIVA", "NAO", "SIM"]).default("EM_TRATATIVA"),
  dataFaturamento: dataOpcional,
  dataSeparacao: dataOpcional,
  valor: z.number().nonnegative().optional().nullable(),
})

export const atualizarDesvioSchema = criarDesvioSchema.partial().extend({
  status: z.enum(["EM_TRATATIVA", "NAO", "SIM"]).optional(),
})

export type CriarDesvioInput = z.infer<typeof criarDesvioSchema>
```

- [ ] **Step 3: verificar tipos**

Run: `npx tsc --noEmit`
Expected: sem erros.

- [ ] **Step 4: Commit**
```bash
git add src/lib/desvios/opcoes.ts src/lib/desvios/schemas.ts
git commit -m "feat(desvios): opcoes de dropdown e schemas zod"
```

---

### Task B4: Regras de negócio (listar/criar/atualizar) com as 2 travas

**Files:**
- Create: `src/lib/desvios/index.ts`

- [ ] **Step 1: implementar o módulo de dados**

Create `src/lib/desvios/index.ts`:
```ts
/**
 * REGRAS DE NEGÓCIO — Desvios (ocorrências) do módulo Clientes.
 *  - Todo acesso passa pelas 2 travas do contratante (escopo-contratante.ts).
 *  - Leitura paginada; escrita grava o contratante do escopo (nunca do cliente).
 * Módulo server-only.
 */
import { prisma } from "@/lib/prisma"
import {
  type EscopoContratante,
  assertDesviosNoEscopo,
} from "@/lib/seguranca/escopo-contratante"
import type { CriarDesvioInput } from "./schemas"

export type FiltroDesvios = {
  status?: string | null
  clienteFinal?: string | null
  tipo?: string | null
  busca?: string | null
  pagina: number
  porPagina: number
}

/** Lista paginada, já recortada pelo escopo (Trava 1) e conferida (Trava 2). */
export async function listarDesvios(
  escopo: EscopoContratante,
  filtro: FiltroDesvios,
) {
  if (escopo.tipo === "lista" && escopo.ids.length === 0) {
    return { itens: [], total: 0 }
  }
  const where: Record<string, unknown> = {}
  if (escopo.tipo === "lista") where.contratanteId = { in: escopo.ids }
  if (filtro.status) where.status = filtro.status
  if (filtro.clienteFinal) where.clienteFinal = filtro.clienteFinal
  if (filtro.tipo) where.tipo = filtro.tipo
  if (filtro.busca) {
    where.OR = [
      { numeroOtbWbs: { contains: filtro.busca, mode: "insensitive" } },
      { resumoCaso: { contains: filtro.busca, mode: "insensitive" } },
      { clienteFinal: { contains: filtro.busca, mode: "insensitive" } },
    ]
  }
  const [itens, total] = await Promise.all([
    prisma.desvio.findMany({
      where,
      orderBy: { dataOcorrencia: "desc" },
      skip: (filtro.pagina - 1) * filtro.porPagina,
      take: filtro.porPagina,
    }),
    prisma.desvio.count({ where }),
  ])
  assertDesviosNoEscopo(itens, (d) => d.contratanteId, escopo) // Trava 2
  return { itens, total }
}

/** Contadores por status, no escopo. */
export async function contarPorStatus(escopo: EscopoContratante) {
  if (escopo.tipo === "lista" && escopo.ids.length === 0) return {}
  const where = escopo.tipo === "lista" ? { contratanteId: { in: escopo.ids } } : {}
  const grupos = await prisma.desvio.groupBy({ by: ["status"], _count: true, where })
  return Object.fromEntries(grupos.map((g) => [g.status, g._count]))
}

/** Cria um desvio no contratante informado (precisa estar no escopo). */
export async function criarDesvio(
  escopo: EscopoContratante,
  contratanteId: number,
  input: CriarDesvioInput,
  autor: string | null,
) {
  if (escopo.tipo === "lista" && !escopo.ids.includes(contratanteId)) {
    throw new Error("Bloqueio de segurança: contratante fora do escopo do usuário.")
  }
  return prisma.desvio.create({
    data: {
      contratanteId,
      responsavelInterno: input.responsavelInterno ?? null,
      numeroOtbWbs: input.numeroOtbWbs ?? null,
      tipo: input.tipo ?? null,
      divisao: input.divisao ?? null,
      solicitante: input.solicitante ?? null,
      dataOcorrencia: input.dataOcorrencia ? new Date(input.dataOcorrencia) : null,
      clienteFinal: input.clienteFinal ?? null,
      motivo: input.motivo ?? null,
      causaRaiz: input.causaRaiz ?? null,
      resumoCaso: input.resumoCaso ?? null,
      solucao: input.solucao ?? null,
      status: input.status ?? "EM_TRATATIVA",
      dataFaturamento: input.dataFaturamento ? new Date(input.dataFaturamento) : null,
      dataSeparacao: input.dataSeparacao ? new Date(input.dataSeparacao) : null,
      valor: input.valor ?? null,
      criadoPor: autor,
      atualizadoPor: autor,
    },
  })
}

/** Atualiza um desvio existente, conferindo que ele está no escopo antes. */
export async function atualizarDesvio(
  escopo: EscopoContratante,
  id: number,
  patch: Partial<CriarDesvioInput>,
  autor: string | null,
) {
  const atual = await prisma.desvio.findUnique({ where: { id } })
  if (!atual) throw new Error("Desvio não encontrado.")
  assertDesviosNoEscopo([atual], (d) => d.contratanteId, escopo) // Trava 2
  return prisma.desvio.update({
    where: { id },
    data: {
      ...(patch.status !== undefined ? { status: patch.status } : {}),
      ...(patch.resumoCaso !== undefined ? { resumoCaso: patch.resumoCaso } : {}),
      ...(patch.solucao !== undefined ? { solucao: patch.solucao } : {}),
      ...(patch.causaRaiz !== undefined ? { causaRaiz: patch.causaRaiz } : {}),
      ...(patch.motivo !== undefined ? { motivo: patch.motivo } : {}),
      ...(patch.dataFaturamento !== undefined
        ? { dataFaturamento: patch.dataFaturamento ? new Date(patch.dataFaturamento) : null }
        : {}),
      atualizadoPor: autor,
    },
  })
}

/** Resolve o id do contratante Atlas (usado pelas telas fixas da Atlas). */
export async function contratanteAtlasId(): Promise<number | null> {
  const c = await prisma.clienteContratante.findUnique({ where: { slug: "atlas" } })
  return c?.id ?? null
}
```

- [ ] **Step 2: verificar tipos**

Run: `npx tsc --noEmit`
Expected: sem erros.

- [ ] **Step 3: Commit**
```bash
git add src/lib/desvios/index.ts
git commit -m "feat(desvios): regras de negocio (listar/criar/atualizar) com as 2 travas"
```

---

### Task B5: Route handlers `/api/desvios`

**Files:**
- Create: `src/app/api/desvios/route.ts`
- Create: `src/app/api/desvios/[id]/route.ts`

- [ ] **Step 1: helper de escopo do usuário atual**

No topo de `src/app/api/desvios/route.ts`, resolver o escopo a partir da sessão (honrando o acesso livre de dev). Usar o mesmo padrão de `resolverPapeisDashboard`/guardas. Implementação:

Create `src/app/api/desvios/route.ts`:
```ts
import { NextResponse } from "next/server"
import { getUsuarioAtual } from "@/lib/epi/guardas"
import {
  resolverEscopoContratante,
  type EscopoContratante,
} from "@/lib/seguranca/escopo-contratante"
import { listarDesvios, contarPorStatus, criarDesvio, contratanteAtlasId } from "@/lib/desvios"
import { criarDesvioSchema } from "@/lib/desvios/schemas"

export const dynamic = "force-dynamic"

async function escopoAtual(): Promise<{ escopo: EscopoContratante; autor: string | null }> {
  const u = await getUsuarioAtual() // honra acesso livre de dev (admin fictício)
  if (!u) return { escopo: { tipo: "lista", ids: [] }, autor: null }
  const escopo = await resolverEscopoContratante({
    authUserId: u.authUserId,
    isAdmin: u.isAdmin,
    classificacao: u.classificacao ?? "INTERNO",
  })
  return { escopo, autor: u.nome ?? u.email ?? null }
}

export async function GET(request: Request) {
  const { escopo } = await escopoAtual()
  const url = new URL(request.url)
  const pagina = Math.max(1, Number(url.searchParams.get("pagina") ?? "1") || 1)
  const porPagina = Math.min(100, Math.max(10, Number(url.searchParams.get("porPagina") ?? "20") || 20))
  const [lista, contadores] = await Promise.all([
    listarDesvios(escopo, {
      status: url.searchParams.get("status"),
      clienteFinal: url.searchParams.get("cliente"),
      tipo: url.searchParams.get("tipo"),
      busca: url.searchParams.get("busca"),
      pagina,
      porPagina,
    }),
    contarPorStatus(escopo),
  ])
  return NextResponse.json({ ...lista, contadores, pagina, porPagina })
}

export async function POST(request: Request) {
  const { escopo, autor } = await escopoAtual()
  let corpo: unknown
  try {
    corpo = await request.json()
  } catch {
    return NextResponse.json({ error: "Requisição inválida" }, { status: 400 })
  }
  const parsed = criarDesvioSchema.safeParse(corpo)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Dados inválidos" },
      { status: 400 },
    )
  }
  const contratanteId = await contratanteAtlasId()
  if (!contratanteId) {
    return NextResponse.json({ error: "Cliente contratante não configurado." }, { status: 503 })
  }
  try {
    const desvio = await criarDesvio(escopo, contratanteId, parsed.data, autor)
    return NextResponse.json({ desvio })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Falha ao criar" },
      { status: 400 },
    )
  }
}
```

> Nota de implementação: confirmar que `getUsuarioAtual()` (em `src/lib/epi/guardas.ts`) retorna `{ authUserId, isAdmin, classificacao, nome, email }`. Se algum campo faltar (ex.: `classificacao`), buscar de `prisma.authUser` pelo email/uuid dentro de `escopoAtual`. Ajuste local, sem mudar a assinatura pública.

- [ ] **Step 2: PATCH por id**

Create `src/app/api/desvios/[id]/route.ts`:
```ts
import { NextResponse } from "next/server"
import { getUsuarioAtual } from "@/lib/epi/guardas"
import {
  resolverEscopoContratante,
  type EscopoContratante,
} from "@/lib/seguranca/escopo-contratante"
import { atualizarDesvio } from "@/lib/desvios"
import { atualizarDesvioSchema } from "@/lib/desvios/schemas"

export const dynamic = "force-dynamic"

async function escopoAtual(): Promise<{ escopo: EscopoContratante; autor: string | null }> {
  const u = await getUsuarioAtual()
  if (!u) return { escopo: { tipo: "lista", ids: [] }, autor: null }
  const escopo = await resolverEscopoContratante({
    authUserId: u.authUserId,
    isAdmin: u.isAdmin,
    classificacao: u.classificacao ?? "INTERNO",
  })
  return { escopo, autor: u.nome ?? u.email ?? null }
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const id = Number(params.id)
  if (!Number.isInteger(id)) return NextResponse.json({ error: "id inválido" }, { status: 400 })
  const { escopo, autor } = await escopoAtual()
  let corpo: unknown
  try {
    corpo = await request.json()
  } catch {
    return NextResponse.json({ error: "Requisição inválida" }, { status: 400 })
  }
  const parsed = atualizarDesvioSchema.safeParse(corpo)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Dados inválidos" },
      { status: 400 },
    )
  }
  try {
    const desvio = await atualizarDesvio(escopo, id, parsed.data, autor)
    return NextResponse.json({ desvio })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Falha ao atualizar" },
      { status: 400 },
    )
  }
}
```

- [ ] **Step 3: verificar tipos**

Run: `npx tsc --noEmit`
Expected: sem erros (corrigir a assinatura de `getUsuarioAtual` conforme a nota, se preciso).

- [ ] **Step 4: Commit**
```bash
git add src/app/api/desvios
git commit -m "feat(desvios): route handlers GET/POST e PATCH com escopo por contratante"
```

---

### Task B6: Domínio "Clientes" + telas (server) com guard

**Files:**
- Modify: `src/lib/domains.ts`
- Create: `src/app/dashboards/clientes/atlas/desvios/page.tsx`
- Create: `src/app/dashboards/clientes/atlas/desvios/novo/page.tsx`
- Create: `src/components/desvios/InfoDesvios.tsx`

- [ ] **Step 1: adicionar o domínio à fonte de verdade**

Em `src/lib/domains.ts`, importar dois ícones (`Building2`, `FileWarning` já importado? adicionar `Building2`, `ListPlus`) e acrescentar ao array `DOMINIOS` (após `financeiro`):
```ts
  {
    key: "clientes",
    label: "Clientes",
    icone: Building2,
    telas: [
      {
        key: "desvios-acompanhamento",
        label: "Acompanhamento de Desvios",
        href: "/dashboards/clientes/atlas/desvios",
        palavrasChave: ["atlas", "ocorrencia", "desvio", "tratativa", "gps"],
        icone: FileWarning,
      },
      {
        key: "desvios-formulario",
        label: "Formulário de Desvios",
        href: "/dashboards/clientes/atlas/desvios/novo",
        palavrasChave: ["atlas", "novo desvio", "lancar ocorrencia"],
        icone: ListPlus,
      },
    ],
  },
```
Ajustar o import do lucide-react no topo para incluir `Building2` e `ListPlus`.

- [ ] **Step 2: componente de textos do info**

Create `src/components/desvios/InfoDesvios.tsx`:
```tsx
import { InfoIndicador } from "@/components/dashboard/InfoIndicador"

export function InfoDesvios() {
  return (
    <InfoIndicador titulo="Como funciona o controle de desvios">
      <p>
        Este painel registra e acompanha os <strong>desvios (ocorrências)</strong> da
        operação do cliente. Cada linha é um caso: o que aconteceu, por quê, e em que pé
        está a resolução.
      </p>
      <ul>
        <li><strong>Status</strong>: <em>Em tratativa</em> (em andamento), <em>Não</em>
          (ainda não resolvido) e <em>Sim</em> (resolvido).</li>
        <li>Os contadores no topo somam os casos de cada status no seu acesso.</li>
        <li>Você só enxerga os desvios do(s) cliente(s) aos quais foi vinculado.</li>
      </ul>
      <p>
        <strong>Exemplo:</strong> um envio com uma caixa a menos entra como
        <em> Envio Divergente</em>; enquanto a devolução não é concluída, fica
        <em> Em tratativa</em>; ao resolver, vira <em>Sim</em>.
      </p>
    </InfoIndicador>
  )
}
```
> Nota: conferir a API real de `InfoIndicador` (props `titulo`/children ou similar) em `src/components/dashboard/InfoIndicador.tsx` e ajustar. O conteúdo é só regra de negócio — sem termos técnicos (regra obrigatória do projeto).

- [ ] **Step 3: página de Acompanhamento (server) com guard**

Create `src/app/dashboards/clientes/atlas/desvios/page.tsx`:
```tsx
import { assertTelaVisivel } from "@/lib/dashboard-acesso"
import { TabelaDesvios } from "@/components/desvios/TabelaDesvios"
import { InfoDesvios } from "@/components/desvios/InfoDesvios"

export const dynamic = "force-dynamic"

export default async function AcompanhamentoDesviosPage() {
  await assertTelaVisivel("desvios-acompanhamento")
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <h1 className="text-2xl font-semibold text-navy">Acompanhamento de Desvios</h1>
        <InfoDesvios />
      </div>
      <TabelaDesvios />
    </div>
  )
}
```

- [ ] **Step 4: página do Formulário (server) com guard**

Create `src/app/dashboards/clientes/atlas/desvios/novo/page.tsx`:
```tsx
import { assertTelaVisivel } from "@/lib/dashboard-acesso"
import { FormularioDesvio } from "@/components/desvios/FormularioDesvio"
import { InfoDesvios } from "@/components/desvios/InfoDesvios"

export const dynamic = "force-dynamic"

export default async function NovoDesvioPage() {
  await assertTelaVisivel("desvios-formulario")
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <h1 className="text-2xl font-semibold text-navy">Formulário de Desvios</h1>
        <InfoDesvios />
      </div>
      <FormularioDesvio />
    </div>
  )
}
```

- [ ] **Step 5: build (as páginas importam componentes das Tasks B7; pode falhar aqui)**

Run: `npx tsc --noEmit`
Expected: erros só de imports faltando (`TabelaDesvios`, `FormularioDesvio`) — resolvidos na Task B7. Não commitar ainda se quiser tudo verde; ou seguir para B7 e commitar junto.

- [ ] **Step 6: Commit (após B7 compilar)**
```bash
git add src/lib/domains.ts src/app/dashboards/clientes src/components/desvios/InfoDesvios.tsx
git commit -m "feat(clientes): dominio Clientes + telas de Desvios (server, com guard)"
```

---

### Task B7: Componentes client — Formulário e Tabela paginada

**Files:**
- Create: `src/components/desvios/FormularioDesvio.tsx`
- Create: `src/components/desvios/TabelaDesvios.tsx`

- [ ] **Step 1: Formulário**

Create `src/components/desvios/FormularioDesvio.tsx` (client). Usa `Combobox` para os campos de lista, `input`/`textarea` para os livres, `POST /api/desvios`, e redireciona para o Acompanhamento ao salvar. Estrutura mínima:
```tsx
"use client"
import * as React from "react"
import { useRouter } from "next/navigation"
import { Combobox } from "@/components/ui/Combobox"
import { Button } from "@/components/ui/button"
import {
  RESPONSAVEIS_INTERNOS, TIPOS, DIVISOES, MOTIVOS, CAUSAS_RAIZ, STATUS_DESVIO,
} from "@/lib/desvios/opcoes"

const opts = (arr: readonly string[]) => arr.map((v) => ({ value: v, label: v }))

export function FormularioDesvio() {
  const router = useRouter()
  const [form, setForm] = React.useState<Record<string, string>>({ status: "EM_TRATATIVA" })
  const [salvando, setSalvando] = React.useState(false)
  const [erro, setErro] = React.useState<string | null>(null)
  const set = (k: string) => (v: string | null) => setForm((f) => ({ ...f, [k]: v ?? "" }))

  async function salvar(e: React.FormEvent) {
    e.preventDefault()
    setSalvando(true); setErro(null)
    const res = await fetch("/api/desvios", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ...form, valor: form.valor ? Number(form.valor) : null }),
    })
    setSalvando(false)
    if (!res.ok) { setErro((await res.json()).error ?? "Falha ao salvar"); return }
    router.push("/dashboards/clientes/atlas/desvios")
  }

  return (
    <form onSubmit={salvar} className="glass grid max-w-3xl gap-4 rounded-3xl p-6 md:grid-cols-2">
      <Field label="Responsável Interno">
        <Combobox value={form.responsavelInterno ?? null} options={opts(RESPONSAVEIS_INTERNOS)} onChange={set("responsavelInterno")} />
      </Field>
      <Field label="Nº OTB/WBS">
        <input className="input" value={form.numeroOtbWbs ?? ""} onChange={(e) => set("numeroOtbWbs")(e.target.value)} />
      </Field>
      <Field label="Tipo"><Combobox value={form.tipo ?? null} options={opts(TIPOS)} onChange={set("tipo")} /></Field>
      <Field label="Divisão"><Combobox value={form.divisao ?? null} options={opts(DIVISOES)} onChange={set("divisao")} /></Field>
      <Field label="Solicitante"><input className="input" value={form.solicitante ?? ""} onChange={(e) => set("solicitante")(e.target.value)} /></Field>
      <Field label="Data da ocorrência"><input type="date" className="input" value={form.dataOcorrencia ?? ""} onChange={(e) => set("dataOcorrencia")(e.target.value)} /></Field>
      <Field label="Cliente"><input className="input" value={form.clienteFinal ?? ""} onChange={(e) => set("clienteFinal")(e.target.value)} /></Field>
      <Field label="Motivo"><Combobox value={form.motivo ?? null} options={opts(MOTIVOS)} onChange={set("motivo")} /></Field>
      <Field label="Causa Raiz"><Combobox value={form.causaRaiz ?? null} options={opts(CAUSAS_RAIZ)} onChange={set("causaRaiz")} /></Field>
      <Field label="Status"><Combobox value={form.status ?? "EM_TRATATIVA"} options={STATUS_DESVIO.map((s) => ({ value: s.value, label: s.label }))} onChange={set("status")} /></Field>
      <Field label="Valor (R$)"><input type="number" step="0.01" className="input" value={form.valor ?? ""} onChange={(e) => set("valor")(e.target.value)} /></Field>
      <Field label="Resumo do Caso" full><textarea className="input min-h-24" value={form.resumoCaso ?? ""} onChange={(e) => set("resumoCaso")(e.target.value)} /></Field>
      <Field label="Solução" full><textarea className="input min-h-24" value={form.solucao ?? ""} onChange={(e) => set("solucao")(e.target.value)} /></Field>
      {erro && <p className="md:col-span-2 text-sm text-red-600">{erro}</p>}
      <div className="md:col-span-2">
        <Button type="submit" disabled={salvando}>{salvando ? "Salvando…" : "Registrar desvio"}</Button>
      </div>
    </form>
  )
}

function Field({ label, children, full }: { label: string; children: React.ReactNode; full?: boolean }) {
  return (
    <label className={full ? "md:col-span-2 flex flex-col gap-1.5" : "flex flex-col gap-1.5"}>
      <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</span>
      {children}
    </label>
  )
}
```
> Nota: `className="input"` é ilustrativo — usar as classes reais do projeto (ver `src/components/ui/input.tsx`) ou o componente `<Input>` onde couber. Conferir os props reais do `Combobox` (`options` × `opcoes`) no arquivo e ajustar.

- [ ] **Step 2: Tabela paginada + detalhe + atualização de status**

Create `src/components/desvios/TabelaDesvios.tsx` (client). Busca `GET /api/desvios`, mostra contadores, filtros por status, tabela com paginação, linha expansível com detalhe e um seletor de status que faz `PATCH /api/desvios/[id]`. Estrutura mínima:
```tsx
"use client"
import * as React from "react"
import { STATUS_DESVIO } from "@/lib/desvios/opcoes"

type Desvio = {
  id: number; numeroOtbWbs: string | null; tipo: string | null; clienteFinal: string | null
  motivo: string | null; causaRaiz: string | null; resumoCaso: string | null; solucao: string | null
  status: string; dataOcorrencia: string | null; valor: string | null; responsavelInterno: string | null
}
const rotuloStatus = (v: string) => STATUS_DESVIO.find((s) => s.value === v)?.label ?? v

export function TabelaDesvios() {
  const [dados, setDados] = React.useState<{ itens: Desvio[]; total: number; contadores: Record<string, number> }>({ itens: [], total: 0, contadores: {} })
  const [pagina, setPagina] = React.useState(1)
  const [status, setStatus] = React.useState("")
  const [busca, setBusca] = React.useState("")
  const [aberto, setAberto] = React.useState<number | null>(null)
  const porPagina = 20

  const carregar = React.useCallback(async () => {
    const p = new URLSearchParams({ pagina: String(pagina), porPagina: String(porPagina) })
    if (status) p.set("status", status)
    if (busca) p.set("busca", busca)
    const res = await fetch(`/api/desvios?${p.toString()}`)
    if (res.ok) setDados(await res.json())
  }, [pagina, status, busca])
  React.useEffect(() => { carregar() }, [carregar])

  async function mudarStatus(id: number, novo: string) {
    const res = await fetch(`/api/desvios/${id}`, {
      method: "PATCH", headers: { "content-type": "application/json" },
      body: JSON.stringify({ status: novo }),
    })
    if (res.ok) carregar()
  }

  const totalPaginas = Math.max(1, Math.ceil(dados.total / porPagina))
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        {STATUS_DESVIO.map((s) => (
          <div key={s.value} className="glass rounded-2xl px-4 py-3">
            <p className="text-xs text-muted-foreground">{s.label}</p>
            <p className="text-2xl font-semibold text-navy">{dados.contadores[s.value] ?? 0}</p>
          </div>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <select className="rounded-xl border px-3 py-2 text-sm" value={status} onChange={(e) => { setPagina(1); setStatus(e.target.value) }}>
          <option value="">Todos os status</option>
          {STATUS_DESVIO.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
        <input className="rounded-xl border px-3 py-2 text-sm" placeholder="Buscar (OTB, cliente, resumo)" value={busca} onChange={(e) => { setPagina(1); setBusca(e.target.value) }} />
      </div>
      <div className="glass overflow-x-auto rounded-3xl">
        <table className="w-full text-sm">
          <thead className="text-left text-xs uppercase text-muted-foreground">
            <tr><th className="p-3">Data</th><th className="p-3">OTB/WBS</th><th className="p-3">Cliente</th><th className="p-3">Motivo</th><th className="p-3">Status</th><th className="p-3"></th></tr>
          </thead>
          <tbody>
            {dados.itens.map((d) => (
              <React.Fragment key={d.id}>
                <tr className="border-t border-navy/5">
                  <td className="p-3">{d.dataOcorrencia?.slice(0, 10) ?? "—"}</td>
                  <td className="p-3">{d.numeroOtbWbs ?? "—"}</td>
                  <td className="p-3">{d.clienteFinal ?? "—"}</td>
                  <td className="p-3">{d.motivo ?? "—"}</td>
                  <td className="p-3">
                    <select className="rounded-lg border px-2 py-1" value={d.status} onChange={(e) => mudarStatus(d.id, e.target.value)}>
                      {STATUS_DESVIO.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                    </select>
                  </td>
                  <td className="p-3"><button className="text-teal underline" onClick={() => setAberto(aberto === d.id ? null : d.id)}>{aberto === d.id ? "Fechar" : "Detalhe"}</button></td>
                </tr>
                {aberto === d.id && (
                  <tr className="bg-mist/40"><td colSpan={6} className="p-4">
                    <dl className="grid gap-2 md:grid-cols-2">
                      <Det k="Responsável Interno" v={d.responsavelInterno} />
                      <Det k="Tipo" v={d.tipo} />
                      <Det k="Causa Raiz" v={d.causaRaiz} />
                      <Det k="Valor" v={d.valor} />
                      <Det k="Resumo do Caso" v={d.resumoCaso} full />
                      <Det k="Solução" v={d.solucao} full />
                    </dl>
                  </td></tr>
                )}
              </React.Fragment>
            ))}
            {dados.itens.length === 0 && <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">Nenhum desvio.</td></tr>}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">{dados.total} desvio(s)</span>
        <div className="flex gap-2">
          <button disabled={pagina <= 1} onClick={() => setPagina((p) => p - 1)} className="rounded-lg border px-3 py-1 disabled:opacity-40">Anterior</button>
          <span className="px-2 py-1">{pagina} / {totalPaginas}</span>
          <button disabled={pagina >= totalPaginas} onClick={() => setPagina((p) => p + 1)} className="rounded-lg border px-3 py-1 disabled:opacity-40">Próxima</button>
        </div>
      </div>
    </div>
  )
}

function Det({ k, v, full }: { k: string; v: string | null; full?: boolean }) {
  return (
    <div className={full ? "md:col-span-2" : ""}>
      <dt className="text-xs font-semibold uppercase text-muted-foreground">{k}</dt>
      <dd className="whitespace-pre-wrap">{v ?? "—"}</dd>
    </div>
  )
}
```

- [ ] **Step 3: build + tsc**

Run: `npx tsc --noEmit && npm run build`
Expected: sem erros. Corrigir props reais de `Combobox`/`Button`/`Input` conforme os componentes do projeto.

- [ ] **Step 4: Commit**
```bash
git add src/components/desvios/FormularioDesvio.tsx src/components/desvios/TabelaDesvios.tsx
git commit -m "feat(desvios): formulario de cadastro e tabela paginada com detalhe/status"
```

---

### Task B8: Vínculo de contratante na tela de Usuários

**Files:**
- Modify: `src/lib/usuarios-admin.ts`
- Modify: `src/app/api/admin/usuarios/route.ts`
- Create: `src/app/api/admin/contratantes/route.ts`
- Modify: a UI de Usuários (`src/app/dashboards/usuarios/*` — localizar o componente que edita clientes/CRs)

- [ ] **Step 1: endpoint que lista contratantes**

Create `src/app/api/admin/contratantes/route.ts`:
```ts
import { NextResponse } from "next/server"
import { guardAdmin } from "@/lib/admin-guard"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

export async function GET() {
  const g = await guardAdmin()
  if (!g.ok) return g.response
  const contratantes = await prisma.clienteContratante.findMany({
    where: { ativo: true },
    orderBy: { nome: "asc" },
    select: { id: true, nome: true },
  })
  return NextResponse.json({ contratantes })
}
```

- [ ] **Step 2: `usuarios-admin` lê/grava os vínculos de contratante**

Em `src/lib/usuarios-admin.ts`:
1. Em `UsuarioAdmin`, adicionar `contratantes: number[]`.
2. Em `listarUsuariosAdmin`, incluir no `Promise.all`:
```ts
    prisma.authUserContratante.findMany({ select: { authUserId: true, contratanteId: true } }),
```
e montar um `Map<string, number[]>` igual ao de `crs`, retornando `contratantes` por usuário.
3. Em `criarUsuarioAdmin` e `atualizarAcessoLocal`, aceitar `contratantes: number[]` e, dentro de `salvarClassificacaoEVinculos`, adicionar à transação:
```ts
    prisma.authUserContratante.deleteMany({ where: { authUserId: uuid } }),
    ...(contratantes.length
      ? [prisma.authUserContratante.createMany({
          data: contratantes.map((contratanteId) => ({ authUserId: uuid, contratanteId })),
          skipDuplicates: true,
        })]
      : []),
```
(estender a assinatura de `salvarClassificacaoEVinculos` com `contratantes: number[]`).

- [ ] **Step 3: schemas da API aceitam `contratantes`**

Em `src/app/api/admin/usuarios/route.ts`, adicionar a ambos os schemas (`criarSchema`, `acessoSchema`):
```ts
  contratantes: z.array(z.number().int()).default([]),
```
e passar `parsed.data.contratantes` adiante (as funções já recebem o objeto inteiro).

- [ ] **Step 4: UI — seletor de contratantes**

Localizar o componente client da tela de Usuários que já edita `clientes`/`crs` (procurar por `clientes` e `MultiCombobox` em `src/app/dashboards/usuarios` ou `src/components`). Acrescentar um `MultiCombobox` "Cliente(s) contratante(s)" que:
- carrega as opções de `GET /api/admin/contratantes` (`{ value: String(id), label: nome }`);
- guarda `contratantes` como `number[]` no payload do PATCH/POST.
Seguir exatamente o padrão visual do seletor de clientes já existente.

- [ ] **Step 5: build + tsc**

Run: `npx tsc --noEmit && npm run build`
Expected: sem erros.

- [ ] **Step 6: Verificação manual do isolamento (o teste real do pedido)**

1. Desligar acesso livre de dev não é necessário; para testar o recorte, crie/edite um usuário como `classificacao=CLIENTE`, conceda só as 2 telas de Desvios e vincule ao contratante **Atlas Copco**.
2. Confirme (via banco ou como esse usuário) que a sidebar mostra só o domínio **Clientes** e que `GET /api/desvios` só devolve desvios da Atlas.

- [ ] **Step 7: Commit**
```bash
git add src/lib/usuarios-admin.ts src/app/api/admin/usuarios/route.ts src/app/api/admin/contratantes src/app/dashboards/usuarios
git commit -m "feat(admin): vinculo de cliente contratante na tela de Usuarios"
```

---

### Task B9: Import das 40 linhas GPS

**Files:**
- Create: `scripts/seed_desvios_gps.mjs`

- [ ] **Step 1: script de import idempotente**

Create `scripts/seed_desvios_gps.mjs`. Lê a planilha, filtra Responsável Interno = "GPS", mapeia status e insere no contratante Atlas. Idempotência: apaga os desvios da Atlas com `criadoPor='seed:gps'` antes de reinserir (recarga limpa), ou usa upsert por chave natural. Abordagem simples (recarga do seed):
```js
import fs from "node:fs"
import path from "node:path"
import { PrismaClient } from "@prisma/client"
import ExcelJS from "exceljs" // se indisponível, ver nota abaixo

const CAMINHO = process.env.PLANILHA_DESVIOS
  ?? "C:\\Users\\fernando.c.souza\\Documents\\Projetos\\0.1 ATLAS COPCO\\0.1 CONTROLE DE ADERÊNCIA\\Controle de Aderência.xlsx"

const prisma = new PrismaClient()

function statusDoTexto(t) {
  const s = String(t ?? "").trim().toLowerCase()
  if (s === "sim") return "SIM"
  if (s === "não" || s === "nao") return "NAO"
  return "EM_TRATATIVA"
}
const val = (c) => (c === undefined || c === null || c === "" ? null : c)
const asDate = (c) => (c instanceof Date ? c : (c ? new Date(c) : null))

async function main() {
  const contratante = await prisma.clienteContratante.findUnique({ where: { slug: "atlas" } })
  if (!contratante) throw new Error("Contratante Atlas não existe — rode o SQL 009 primeiro.")

  const wb = new ExcelJS.Workbook()
  await wb.xlsx.readFile(CAMINHO)
  const ws = wb.getWorksheet("Ocorrências LOG")
  // Cabeçalho na linha 1; colunas por índice (1-based): 2 Responsável, 3 OTB/WBS, 4 Tipo,
  // 5 Divisão, 6 Solicitante, 7 Data ocorrência, 8 Cliente, 9 Motivo, 10 Causa Raiz,
  // 11 Resumo, 12 Solução, 13 Caso Resolvido?, 14 Data faturamento, 15 Data separação, 16 Valor.
  const linhas = []
  ws.eachRow((row, n) => {
    if (n === 1) return
    const resp = val(row.getCell(2).value)
    if (!resp || !String(resp).toUpperCase().includes("GPS")) return
    // só GPS "puro" conforme decisão (40 linhas). Se quiser incluir ACTA/GPS, ajuste aqui.
    if (String(resp).trim().toUpperCase() !== "GPS") return
    linhas.push({
      contratanteId: contratante.id,
      responsavelInterno: String(resp).trim(),
      numeroOtbWbs: val(row.getCell(3).value)?.toString() ?? null,
      tipo: val(row.getCell(4).value)?.toString() ?? null,
      divisao: val(row.getCell(5).value)?.toString().trim() ?? null,
      solicitante: val(row.getCell(6).value)?.toString() ?? null,
      dataOcorrencia: asDate(row.getCell(7).value),
      clienteFinal: val(row.getCell(8).value)?.toString().trim() ?? null,
      motivo: val(row.getCell(9).value)?.toString() ?? null,
      causaRaiz: val(row.getCell(10).value)?.toString() ?? null,
      resumoCaso: val(row.getCell(11).value)?.toString() ?? null,
      solucao: val(row.getCell(12).value)?.toString() ?? null,
      status: statusDoTexto(row.getCell(13).value),
      dataFaturamento: asDate(row.getCell(14).value),
      dataSeparacao: asDate(row.getCell(15).value),
      valor: Number.isFinite(Number(row.getCell(16).value)) ? Number(row.getCell(16).value) : null,
      criadoPor: "seed:gps",
      atualizadoPor: "seed:gps",
    })
  })

  await prisma.$transaction([
    prisma.desvio.deleteMany({ where: { contratanteId: contratante.id, criadoPor: "seed:gps" } }),
    prisma.desvio.createMany({ data: linhas }),
  ])
  console.log(`Importados ${linhas.length} desvios GPS para Atlas Copco.`)
}

main().catch((e) => { console.error(e); process.exit(1) }).finally(() => prisma.$disconnect())
```
> Nota: se `exceljs` não estiver instalado, use o mesmo pré-processamento em Python que já rodou nesta análise para gerar um JSON das 40 linhas e faça o `.mjs` ler o JSON — evita adicionar dependência. Escolher a via disponível no ambiente.

- [ ] **Step 2: rodar o import**

Run (PowerShell, com env do `.env.local`):
```
npx dotenv -e .env.local -- node scripts/seed_desvios_gps.mjs
```
Expected: `Importados 40 desvios GPS para Atlas Copco.`

- [ ] **Step 3: conferir no banco**

Verificar contagem: deve haver 40 desvios com `contratante_id` da Atlas. Abrir `/dashboards/clientes/atlas/desvios` no dev e ver a tabela populada, contadores batendo com os status da planilha.

- [ ] **Step 4: Commit**
```bash
git add scripts/seed_desvios_gps.mjs
git commit -m "chore(desvios): seed de import das 40 ocorrencias GPS da Atlas"
```

---

## Verificação final (após todas as tasks)

- [ ] `npx tsc --noEmit` — sem erros.
- [ ] `npm run build` — build de produção verde.
- [ ] `npx vitest run` — testes do gateway passam.
- [ ] Manual: admin vê tudo; usuário CLIENTE vinculado à Atlas vê só o domínio Clientes e só os desvios da Atlas; criar/atualizar/paginar funcionam; botão info presente nas duas telas.
- [ ] Conferência de dados: 40 desvios GPS importados, status corretos.

## Cobertura do spec (self-review)

- Frente A.1 (sidebar) → A1, A2. A.2 (guard de rota) → A1 (`assertTelaVisivel`) + B6 (uso). A.3 (retrofit) fora de escopo, conforme spec.
- Frente B.1 (tenant + gateway) → B1, B2. B.2 (dado) → B1, B4. B.3 (import GPS) → B9. B.4 (nav + telas) → B6, B7. B.5 (Usuários) → B8.

## Pendências a confirmar na execução

- Assinatura real de `getUsuarioAtual()` (campos `classificacao`/`nome`/`email`) — Task B5.
- API real de `InfoIndicador` e props reais de `Combobox`/`Input`/`Button` — Tasks B6, B7.
- Localização do componente client da tela de Usuários — Task B8.
- Guard de rota no Controle de Quadro/EPI existentes: **não** incluído (aguarda decisão do usuário).
