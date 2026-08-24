# Isolamento de dados por CR / Cliente — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Recortar o que cada usuário do hub enxerga por CR/cliente, de modo que um cliente jamais veja dados de outro, com duas travas independentes na aplicação.

**Architecture:** Autorização local (nunca no global_auth): `auth_users` ganha `classificacao`; dois vínculos novos (`auth_user_cliente`, `auth_user_cr`) definem o escopo de CRs (cliente expande via `dm_cr`). Um módulo server-only `src/lib/seguranca/escopo-dados.ts` resolve o escopo, injeta o filtro em toda query de dado (Trava 1) e verifica cada linha retornada (Trava 2). RLS fica escrita, porém dormente (a conexão é superusuário, que ignora RLS — sem trocar connection strings).

**Tech Stack:** Next.js 14 (App Router) · TypeScript · Prisma (Postgres `db_inhaus`) · pool `pg` (SRA) · Vitest · SQL manual idempotente (nunca `db push`).

**Spec:** `docs/superpowers/specs/2026-08-24-isolamento-por-cr-cliente-design.md`

---

## File Structure

- Create `src/lib/seguranca/escopo-dados.ts` — núcleo de segurança: tipo `EscopoDados`, `codigoCr()`, `EXPR_CODIGO_CR_SRA`, `resolverEscopoDados()`, `predicadoSraCr()`, `assertLinhasNoEscopo()`.
- Create `src/lib/seguranca/escopo-dados.test.ts` — testes unitários das funções puras.
- Modify `prisma/schema.prisma` — campo `classificacao` em `AuthUser`; models `AuthUserCliente`, `AuthUserCr`.
- Create `prisma/sql/008_isolamento_cr.sql` — colunas + tabelas de vínculo + `cr_cod` nas tabelas de dados + backfill + RLS dormente.
- Modify `src/lib/auth-session.ts` — `Authorization` carrega `classificacao`.
- Modify `src/lib/quadro.ts` — `getControleQuadro`/`getOpcoesQuadro` recebem `EscopoDados` e injetam o filtro.
- Modify `src/app/dashboards/rh/controle-quadro/page.tsx` — resolve o escopo da sessão e repassa.
- Modify `src/lib/usuarios-admin.ts`, `src/app/api/admin/usuarios/route.ts`, `src/components/admin/UsuariosAdmin.tsx` — conceder classificação + vínculos.
- Create `src/app/api/admin/clientes-crs/route.ts` — lista clientes/CRs da `dm_cr` para o seletor.
- Modify `src/lib/epi/colaboradores.ts` — `getQuadroAtivoPorCr` respeita o escopo.

---

## Convenções deste projeto (ler antes de começar)

- **NUNCA** `prisma db push`/`migrate` (dropa tabelas da SRA). Schema do hub = SQL manual
  idempotente em `prisma/sql/*.sql`, aplicado à mão; depois `npx prisma generate`.
- Aplicar SQL: usar o mesmo Postgres do `.env.local` (`DATABASE_URL`). Comando padrão neste
  plano: `psql "$DATABASE_URL" -f prisma/sql/008_isolamento_cr.sql` (ou o cliente psql que o
  ambiente tiver). Se `psql` não existir, aplicar via um script Node com `pg` — mas **nunca**
  via Prisma migrate.
- Testes: `npm run test` (vitest run). Testes ficam ao lado do módulo (`*.test.ts`).
- `cr` bruto da SRA é texto tipo `"12345 - Nome"`. O **código** (chave de isolamento) =
  trecho antes do primeiro `" - "`, `btrim`, `lpad(...,5,'0')` se < 5 chars. Casa com `dm_cr.cr`.

---

## Task 1: Núcleo — derivar código de CR (`codigoCr`)

**Files:**
- Create: `src/lib/seguranca/escopo-dados.ts`
- Test: `src/lib/seguranca/escopo-dados.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/seguranca/escopo-dados.test.ts
import { describe, it, expect } from "vitest"
import { codigoCr } from "./escopo-dados"

describe("codigoCr", () => {
  it("extrai o código antes do ' - ' e mantém 5 chars", () => {
    expect(codigoCr("12345 - Fábrica Sul")).toBe("12345")
  })
  it("zero-padeia códigos numéricos com menos de 5 dígitos", () => {
    expect(codigoCr("1489 - Loja")).toBe("01489")
  })
  it("aceita CR alfanumérico", () => {
    expect(codigoCr("C95DR - Centro X")).toBe("C95DR")
  })
  it("funciona quando não há ' - ' (só o código)", () => {
    expect(codigoCr("01489")).toBe("01489")
  })
  it("faz trim de espaços ao redor", () => {
    expect(codigoCr("  777 - Y ")).toBe("00777")
  })
  it("retorna null para vazio/nulo", () => {
    expect(codigoCr("")).toBeNull()
    expect(codigoCr(null)).toBeNull()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- escopo-dados`
Expected: FAIL — "Cannot find module './escopo-dados'" ou "codigoCr is not a function".

- [ ] **Step 3: Write minimal implementation**

```ts
// src/lib/seguranca/escopo-dados.ts
/**
 * NÚCLEO DE SEGURANÇA — isolamento de dados por CR/cliente.
 *
 * Regras (em sincronia com o spec 2026-08-24 e com os textos de InfoIndicador):
 *  - A chave de isolamento é o CÓDIGO do CR (5 chars, casa com dm_cr.cr).
 *  - O `cr` bruto da SRA é texto "CODIGO - Nome"; o código é o trecho antes do
 *    primeiro " - ", com zero-pad à esquerda até 5 chars quando tem menos.
 *  - Escopo `todos` = sem filtro (admin interno). `lista` = só os CRs informados.
 *    Lista vazia = NADA (fail-closed).
 *
 * Módulo server-only.
 */

/** Deriva o código de 5 chars a partir do CR bruto (texto da SRA ou já o código). */
export function codigoCr(crBruto: string | null | undefined): string | null {
  if (!crBruto) return null
  const cod = crBruto.split(" - ")[0]?.trim() ?? ""
  if (!cod) return null
  return cod.length < 5 ? cod.padStart(5, "0") : cod
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- escopo-dados`
Expected: PASS (6 testes de `codigoCr`).

- [ ] **Step 5: Commit**

```bash
git add src/lib/seguranca/escopo-dados.ts src/lib/seguranca/escopo-dados.test.ts
git commit -m "feat(seguranca): codigoCr — chave de isolamento por CR"
```

---

## Task 2: Tipo `EscopoDados` + predicado SQL para a SRA

**Files:**
- Modify: `src/lib/seguranca/escopo-dados.ts`
- Test: `src/lib/seguranca/escopo-dados.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// adicionar em src/lib/seguranca/escopo-dados.test.ts
import { predicadoSraCr, EXPR_CODIGO_CR_SRA, type EscopoDados } from "./escopo-dados"

describe("predicadoSraCr", () => {
  const TODOS: EscopoDados = { tipo: "todos" }
  it("escopo 'todos' não filtra nada", () => {
    const p = predicadoSraCr(TODOS, "cr", 5)
    expect(p.sql).toBe("")
    expect(p.params).toEqual([])
  })
  it("escopo lista injeta o código derivado contra o array de CRs no placeholder certo", () => {
    const p = predicadoSraCr({ tipo: "lista", crs: ["12345", "01489"] }, "cr", 5)
    expect(p.sql).toBe(` and ${EXPR_CODIGO_CR_SRA("cr")} = any($5::text[])`)
    expect(p.params).toEqual([["12345", "01489"]])
  })
  it("escopo lista VAZIA bloqueia tudo (1=0), sem params", () => {
    const p = predicadoSraCr({ tipo: "lista", crs: [] }, "cr", 5)
    expect(p.sql).toBe(" and 1=0")
    expect(p.params).toEqual([])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- escopo-dados`
Expected: FAIL — `predicadoSraCr`/`EXPR_CODIGO_CR_SRA` não exportados.

- [ ] **Step 3: Write minimal implementation**

```ts
// adicionar em src/lib/seguranca/escopo-dados.ts

/** Escopo de dados resolvido de um usuário. */
export type EscopoDados =
  | { tipo: "todos" }
  | { tipo: "lista"; crs: string[] }

/**
 * Expressão SQL que deriva o CÓDIGO de 5 chars a partir de uma coluna de CR bruto
 * da SRA — espelha `codigoCr` no banco. Usada nos predicados e na verificação.
 */
export function EXPR_CODIGO_CR_SRA(coluna: string): string {
  return (
    `(case when length(split_part(btrim(${coluna}),' - ',1)) < 5 ` +
    `then lpad(split_part(btrim(${coluna}),' - ',1),5,'0') ` +
    `else split_part(btrim(${coluna}),' - ',1) end)`
  )
}

/**
 * Fragmento de predicado (Trava 1) para injetar numa query da SRA, filtrando pela
 * coluna de CR bruto `coluna`. `placeholder` é o índice do parâmetro ($n) que o
 * array de CRs vai ocupar. Retorna o SQL a concatenar e os params a acrescentar.
 *  - todos  → "" (sem filtro).
 *  - lista com CRs → " and <codigo> = any($n::text[])".
 *  - lista vazia   → " and 1=0" (fail-closed, sem params).
 */
export function predicadoSraCr(
  escopo: EscopoDados,
  coluna: string,
  placeholder: number,
): { sql: string; params: unknown[] } {
  if (escopo.tipo === "todos") return { sql: "", params: [] }
  if (escopo.crs.length === 0) return { sql: " and 1=0", params: [] }
  return {
    sql: ` and ${EXPR_CODIGO_CR_SRA(coluna)} = any($${placeholder}::text[])`,
    params: [escopo.crs],
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- escopo-dados`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/seguranca/escopo-dados.ts src/lib/seguranca/escopo-dados.test.ts
git commit -m "feat(seguranca): EscopoDados + predicadoSraCr (Trava 1)"
```

---

## Task 3: Trava 2 — verificação pós-consulta (`assertLinhasNoEscopo`)

**Files:**
- Modify: `src/lib/seguranca/escopo-dados.ts`
- Test: `src/lib/seguranca/escopo-dados.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// adicionar em src/lib/seguranca/escopo-dados.test.ts
import { assertLinhasNoEscopo } from "./escopo-dados"

describe("assertLinhasNoEscopo", () => {
  const rows = [{ cr: "12345 - A" }, { cr: "01489 - B" }]
  it("não lança quando todas as linhas estão no escopo", () => {
    expect(() =>
      assertLinhasNoEscopo(rows, (r) => r.cr, { tipo: "lista", crs: ["12345", "01489"] }),
    ).not.toThrow()
  })
  it("LANÇA quando aparece uma linha de CR fora do escopo", () => {
    expect(() =>
      assertLinhasNoEscopo(rows, (r) => r.cr, { tipo: "lista", crs: ["12345"] }),
    ).toThrow(/fora do escopo/i)
  })
  it("escopo 'todos' nunca lança", () => {
    expect(() =>
      assertLinhasNoEscopo(rows, (r) => r.cr, { tipo: "todos" }),
    ).not.toThrow()
  })
  it("ignora linhas cujo CR é nulo (agregados sem CR)", () => {
    expect(() =>
      assertLinhasNoEscopo([{ cr: null }], (r) => r.cr, { tipo: "lista", crs: ["12345"] }),
    ).not.toThrow()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- escopo-dados`
Expected: FAIL — `assertLinhasNoEscopo` não exportado.

- [ ] **Step 3: Write minimal implementation**

```ts
// adicionar em src/lib/seguranca/escopo-dados.ts

/**
 * TRAVA 2 (independente da Trava 1): confere que TODA linha retornada tem código de
 * CR dentro do escopo. Se alguma escapar (filtro esquecido em alguma query), LANÇA —
 * a função chamadora não deve devolver nada. Linhas com CR nulo são ignoradas
 * (agregados sem recorte de CR). Escopo `todos` não verifica nada.
 */
export function assertLinhasNoEscopo<T>(
  linhas: readonly T[],
  getCr: (linha: T) => string | null | undefined,
  escopo: EscopoDados,
): void {
  if (escopo.tipo === "todos") return
  const permitidos = new Set(escopo.crs)
  for (const linha of linhas) {
    const cod = codigoCr(getCr(linha))
    if (cod == null) continue
    if (!permitidos.has(cod)) {
      throw new Error(
        `Bloqueio de segurança: linha com CR fora do escopo do usuário (${cod}).`,
      )
    }
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- escopo-dados`
Expected: PASS (todos os blocos).

- [ ] **Step 5: Commit**

```bash
git add src/lib/seguranca/escopo-dados.ts src/lib/seguranca/escopo-dados.test.ts
git commit -m "feat(seguranca): assertLinhasNoEscopo (Trava 2 — verificação pós-consulta)"
```

---

## Task 4: Schema Prisma — classificação + tabelas de vínculo

**Files:**
- Modify: `prisma/schema.prisma:17-33` (model `AuthUser`)

- [ ] **Step 1: Adicionar o campo `classificacao` ao `AuthUser`**

No model `AuthUser`, logo após `isAdmin`:

```prisma
  isAdmin        Boolean   @default(false) @map("is_admin")
  // Classificação LOCAL do hub (nunca vai ao global_auth). Não restringe permissões:
  // 'INTERNO' (equipe In-Haus) | 'CLIENTE' (externo, sempre travado por escopo).
  classificacao  String    @default("INTERNO")
  hasAccess      Boolean   @default(false) @map("has_access")
```

- [ ] **Step 2: Adicionar os models de vínculo** (ao final do bloco de auth, antes do `// ===== MÓDULO EPI`)

```prisma
// Vínculo usuário → CLIENTE (grupo). Herda TODOS os CRs cujo dm_cr.nome_grp_cliente
// bate — inclusive os que entrarem depois. Autorização LOCAL do hub.
model AuthUserCliente {
  id             Int      @id @default(autoincrement())
  authUserId     String   @map("auth_user_id")
  nomeGrpCliente String   @map("nome_grp_cliente")
  criadoEm       DateTime @default(now()) @map("criado_em")

  @@unique([authUserId, nomeGrpCliente])
  @@index([authUserId])
  @@map("auth_user_cliente")
}

// Vínculo usuário → CR avulso (código de 5 chars = dm_cr.cr). Autorização LOCAL.
model AuthUserCr {
  id         Int      @id @default(autoincrement())
  authUserId String   @map("auth_user_id")
  cr         String   @db.VarChar(5)
  criadoEm   DateTime @default(now()) @map("criado_em")

  @@unique([authUserId, cr])
  @@index([authUserId])
  @@map("auth_user_cr")
}
```

- [ ] **Step 3: NÃO rodar `prisma generate` ainda** (o banco precisa das colunas antes; generate só lê o schema, mas mantemos a ordem SQL→generate). Seguir para a Task 5.

- [ ] **Step 4: Commit**

```bash
git add prisma/schema.prisma
git commit -m "feat(db): models AuthUserCliente/AuthUserCr + classificacao (schema)"
```

---

## Task 5: SQL 008 — colunas, vínculos, cr_cod, backfill e RLS dormente

**Files:**
- Create: `prisma/sql/008_isolamento_cr.sql`

- [ ] **Step 1: Escrever o SQL idempotente**

```sql
-- 008_isolamento_cr.sql — Isolamento de dados por CR/cliente.
-- Idempotente. NUNCA usar prisma db push neste banco compartilhado (ver CLAUDE.md).
-- Aplica: classificacao em auth_users; tabelas de vínculo; coluna cr_cod nas
-- tabelas de DADOS de EPI (+ backfill); e as policies RLS DORMENTES.

-- 1) Classificação local do usuário (INTERNO | CLIENTE). Default INTERNO.
ALTER TABLE "auth_users"
  ADD COLUMN IF NOT EXISTS "classificacao" TEXT NOT NULL DEFAULT 'INTERNO';

-- 2) Vínculos de escopo.
CREATE TABLE IF NOT EXISTS "auth_user_cliente" (
  "id"               SERIAL PRIMARY KEY,
  "auth_user_id"     TEXT NOT NULL,
  "nome_grp_cliente" TEXT NOT NULL,
  "criado_em"        TIMESTAMP NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS "auth_user_cliente_uq"
  ON "auth_user_cliente" ("auth_user_id", "nome_grp_cliente");
CREATE INDEX IF NOT EXISTS "auth_user_cliente_user_idx"
  ON "auth_user_cliente" ("auth_user_id");

CREATE TABLE IF NOT EXISTS "auth_user_cr" (
  "id"           SERIAL PRIMARY KEY,
  "auth_user_id" TEXT NOT NULL,
  "cr"           VARCHAR(5) NOT NULL,
  "criado_em"    TIMESTAMP NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS "auth_user_cr_uq"
  ON "auth_user_cr" ("auth_user_id", "cr");
CREATE INDEX IF NOT EXISTS "auth_user_cr_user_idx"
  ON "auth_user_cr" ("auth_user_id");

-- 3) cr_cod (código 5 chars) nas tabelas de DADOS de EPI. Desnormalizado onde o
--    CR não está na própria linha (sessão/presença/validação).
ALTER TABLE "epi_turno"             ADD COLUMN IF NOT EXISTS "cr_cod" VARCHAR(5);
ALTER TABLE "epi_atribuicao_turno"  ADD COLUMN IF NOT EXISTS "cr_cod" VARCHAR(5);
ALTER TABLE "epi_resposta"          ADD COLUMN IF NOT EXISTS "cr_cod" VARCHAR(5);
ALTER TABLE "epi_sessao_turno"      ADD COLUMN IF NOT EXISTS "cr_cod" VARCHAR(5);
ALTER TABLE "epi_presenca_sessao"   ADD COLUMN IF NOT EXISTS "cr_cod" VARCHAR(5);
ALTER TABLE "epi_validacao_sessao"  ADD COLUMN IF NOT EXISTS "cr_cod" VARCHAR(5);

-- Função local de derivação (espelha codigoCr). CREATE OR REPLACE é idempotente.
CREATE OR REPLACE FUNCTION "cr_codigo"(bruto TEXT) RETURNS VARCHAR(5) AS $$
  SELECT CASE
    WHEN bruto IS NULL OR btrim(bruto) = '' THEN NULL
    WHEN length(split_part(btrim(bruto),' - ',1)) < 5
      THEN lpad(split_part(btrim(bruto),' - ',1),5,'0')
    ELSE left(split_part(btrim(bruto),' - ',1),5)
  END;
$$ LANGUAGE sql IMMUTABLE;

-- 4) Backfill do cr_cod a partir do CR bruto existente / da origem.
UPDATE "epi_turno"            SET "cr_cod" = "cr_codigo"("cr") WHERE "cr_cod" IS NULL;
UPDATE "epi_atribuicao_turno" SET "cr_cod" = "cr_codigo"("cr") WHERE "cr_cod" IS NULL;
UPDATE "epi_resposta"         SET "cr_cod" = "cr_codigo"("cr") WHERE "cr_cod" IS NULL;

UPDATE "epi_sessao_turno" s
   SET "cr_cod" = t."cr_cod"
  FROM "epi_turno" t
 WHERE s."turno_id" = t."id" AND s."cr_cod" IS NULL;

UPDATE "epi_presenca_sessao" p
   SET "cr_cod" = s."cr_cod"
  FROM "epi_sessao_turno" s
 WHERE p."sessao_id" = s."id" AND p."cr_cod" IS NULL;

UPDATE "epi_validacao_sessao" v
   SET "cr_cod" = s."cr_cod"
  FROM "epi_sessao_turno" s
 WHERE v."sessao_id" = s."id" AND v."cr_cod" IS NULL;

CREATE INDEX IF NOT EXISTS "epi_resposta_crcod_idx"     ON "epi_resposta" ("cr_cod");
CREATE INDEX IF NOT EXISTS "epi_atribuicao_crcod_idx"   ON "epi_atribuicao_turno" ("cr_cod");
CREATE INDEX IF NOT EXISTS "epi_sessao_crcod_idx"       ON "epi_sessao_turno" ("cr_cod");

-- 5) RLS — DORMENTE. A conexão do hub é superusuário (postgres), que IGNORA RLS
--    mesmo com FORCE. Estas policies SÓ passam a valer se o hub, no futuro, usar um
--    role NÃO-superusuário. Deixadas prontas e comentadas de propósito; a trava
--    efetiva HOJE é a aplicação (Trava 1 + Trava 2). NÃO descomentar sem antes
--    criar o role dedicado e trocar a connection string (fora do escopo atual).
--
-- ALTER TABLE "epi_resposta" ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE "epi_resposta" FORCE  ROW LEVEL SECURITY;
-- CREATE POLICY "epi_resposta_por_cr" ON "epi_resposta"
--   USING (
--     current_setting('app.bypass_rls', true) = 'on'
--     OR "cr_cod" = ANY (string_to_array(current_setting('app.crs_permitidos', true), ','))
--   );
-- (repetir o mesmo padrão para epi_atribuicao_turno, epi_sessao_turno,
--  epi_presenca_sessao, epi_validacao_sessao e para a leitura da SRA.)
```

- [ ] **Step 2: Aplicar o SQL no banco**

Run: `psql "$DATABASE_URL" -f prisma/sql/008_isolamento_cr.sql`
Expected: `ALTER TABLE`, `CREATE TABLE`, `CREATE INDEX`, `UPDATE n` sem erro. Reaplicar
deve ser inócuo (idempotente).

Verificação:
Run: `psql "$DATABASE_URL" -c "\d auth_user_cliente" -c "\d auth_user_cr" -c "select count(*) from epi_resposta where cr_cod is null"`
Expected: as duas tabelas existem; `cr_cod` nulo só em linhas sem CR válido.

- [ ] **Step 3: Gerar o Prisma Client**

Run: `npx prisma generate`
Expected: "Generated Prisma Client" sem tentar tocar no banco.

- [ ] **Step 4: Commit**

```bash
git add prisma/sql/008_isolamento_cr.sql
git commit -m "feat(db): 008 — cr_cod, vínculos de escopo e RLS dormente"
```

---

## Task 6: Resolver o escopo do usuário (`resolverEscopoDados`)

**Files:**
- Modify: `src/lib/seguranca/escopo-dados.ts`
- Test: `src/lib/seguranca/escopo-dados.test.ts`

- [ ] **Step 1: Write the failing test** (mockando o Prisma)

```ts
// adicionar em src/lib/seguranca/escopo-dados.test.ts
import { vi } from "vitest"
import { resolverEscopoDados } from "./escopo-dados"

vi.mock("@/lib/prisma", () => ({
  prisma: {
    authUserCliente: { findMany: vi.fn() },
    authUserCr: { findMany: vi.fn() },
    $queryRaw: vi.fn(),
  },
}))
import { prisma } from "@/lib/prisma"

describe("resolverEscopoDados", () => {
  it("admin INTERNO vê tudo", async () => {
    const e = await resolverEscopoDados({ authUserId: "u1", isAdmin: true, classificacao: "INTERNO" })
    expect(e).toEqual({ tipo: "todos" })
  })

  it("admin CLIENTE NUNCA vê tudo — cai para o escopo por vínculo", async () => {
    ;(prisma.authUserCliente.findMany as any).mockResolvedValue([])
    ;(prisma.authUserCr.findMany as any).mockResolvedValue([{ cr: "12345" }])
    ;(prisma.$queryRaw as any).mockResolvedValue([])
    const e = await resolverEscopoDados({ authUserId: "u2", isAdmin: true, classificacao: "CLIENTE" })
    expect(e).toEqual({ tipo: "lista", crs: ["12345"] })
  })

  it("une CRs avulsos com os CRs expandidos dos clientes vinculados", async () => {
    ;(prisma.authUserCliente.findMany as any).mockResolvedValue([{ nomeGrpCliente: "ACME" }])
    ;(prisma.authUserCr.findMany as any).mockResolvedValue([{ cr: "99999" }])
    ;(prisma.$queryRaw as any).mockResolvedValue([{ cr: "12345" }, { cr: "01489" }])
    const e = await resolverEscopoDados({ authUserId: "u3", isAdmin: false, classificacao: "CLIENTE" })
    expect(e.tipo).toBe("lista")
    expect(new Set((e as any).crs)).toEqual(new Set(["12345", "01489", "99999"]))
  })

  it("sem vínculo e sem admin = lista vazia (fail-closed)", async () => {
    ;(prisma.authUserCliente.findMany as any).mockResolvedValue([])
    ;(prisma.authUserCr.findMany as any).mockResolvedValue([])
    const e = await resolverEscopoDados({ authUserId: "u4", isAdmin: false, classificacao: "INTERNO" })
    expect(e).toEqual({ tipo: "lista", crs: [] })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- escopo-dados`
Expected: FAIL — `resolverEscopoDados` não exportado.

- [ ] **Step 3: Write minimal implementation**

```ts
// adicionar em src/lib/seguranca/escopo-dados.ts
import { prisma } from "@/lib/prisma"

export type UsuarioEscopo = {
  authUserId: string | null | undefined
  isAdmin: boolean
  classificacao: string // 'INTERNO' | 'CLIENTE'
}

/**
 * Resolve o escopo de dados do usuário.
 *  - admin + INTERNO → { todos }.
 *  - CLIENTE (mesmo admin) → NUNCA todos: sempre pelo vínculo (o "em hipótese
 *    alguma"). Sem vínculo ⇒ lista vazia.
 *  - demais → união dos CRs avulsos com os CRs expandidos via dm_cr dos clientes
 *    vinculados. Sem vínculo ⇒ lista vazia (fail-closed).
 */
export async function resolverEscopoDados(usuario: UsuarioEscopo): Promise<EscopoDados> {
  const ehCliente = usuario.classificacao === "CLIENTE"
  if (usuario.isAdmin && !ehCliente) return { tipo: "todos" }
  if (!usuario.authUserId) return { tipo: "lista", crs: [] }

  const [clientes, avulsos] = await Promise.all([
    prisma.authUserCliente.findMany({
      where: { authUserId: usuario.authUserId },
      select: { nomeGrpCliente: true },
    }),
    prisma.authUserCr.findMany({
      where: { authUserId: usuario.authUserId },
      select: { cr: true },
    }),
  ])

  const crs = new Set<string>(avulsos.map((a) => a.cr))

  if (clientes.length > 0) {
    const grupos = clientes.map((c) => c.nomeGrpCliente)
    const expandido = await prisma.$queryRaw<{ cr: string }[]>`
      select cr from dm_cr where nome_grp_cliente = any(${grupos}::text[])
    `
    for (const r of expandido) if (r.cr) crs.add(r.cr)
  }

  return { tipo: "lista", crs: Array.from(crs) }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- escopo-dados`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/seguranca/escopo-dados.ts src/lib/seguranca/escopo-dados.test.ts
git commit -m "feat(seguranca): resolverEscopoDados (cliente expande via dm_cr; fail-closed)"
```

---

## Task 7: `Authorization` carrega a classificação

**Files:**
- Modify: `src/lib/auth-session.ts:41-50` (tipo `Authorization`), `:97-116` (montagem)

- [ ] **Step 1: Adicionar `classificacao` ao tipo `Authorization`**

```ts
export type Authorization = {
  usuarioId: number
  email: string
  nome: string | null
  isAdmin: boolean
  hasAccess: boolean
  // Classificação local (INTERNO | CLIENTE). Não restringe permissões; alimenta o
  // escopo de dados (CLIENTE nunca vê tudo).
  classificacao: string
  visibleScreens: string[]
}
```

- [ ] **Step 2: Preencher nos dois returns de `resolveAuthorization`**

No return principal (após `hasAccess: registro.hasAccess,`):

```ts
      isAdmin: registro.isAdmin,
      hasAccess: registro.hasAccess,
      classificacao: registro.classificacao ?? "INTERNO",
      visibleScreens: registro.isAdmin ? CHAVES_DE_TELA : (registro.visibleScreens ?? []),
```

No return de fallback (banco indisponível, bootstrap admin), após `hasAccess: true,`:

```ts
        isAdmin: true,
        hasAccess: true,
        classificacao: "INTERNO",
        visibleScreens: CHAVES_DE_TELA,
```

- [ ] **Step 3: Verificar tipos**

Run: `npx tsc --noEmit`
Expected: sem erros (o `select` do Prisma já traz todas as colunas por padrão, então
`registro.classificacao` existe após o `prisma generate` da Task 5).

- [ ] **Step 4: Commit**

```bash
git add src/lib/auth-session.ts
git commit -m "feat(auth): Authorization carrega classificacao (INTERNO|CLIENTE)"
```

---

## Task 8: Aplicar o escopo no Controle de Quadro (`quadro.ts`)

**Files:**
- Modify: `src/lib/quadro.ts:96-131` (`getOpcoesQuadro`), `:133-243` (`getControleQuadro`)

- [ ] **Step 1: Importar o núcleo e mudar as assinaturas**

No topo de `src/lib/quadro.ts`:

```ts
import { inhausPool } from "@/lib/db-inhaus"
import {
  predicadoSraCr,
  assertLinhasNoEscopo,
  type EscopoDados,
} from "@/lib/seguranca/escopo-dados"
```

Mudar as assinaturas para receber o escopo (novo 2º/argumento):

```ts
export async function getOpcoesQuadro(meses: string[], escopo: EscopoDados): Promise<OpcoesQuadro> {
```
```ts
export async function getControleQuadro(filtros: FiltrosQuadro, escopo: EscopoDados): Promise<ControleQuadro> {
```

- [ ] **Step 2: Injetar o predicado nas condições da SRA**

Em `getControleQuadro`, as condições usam placeholders numerados. Acrescentar o predicado
de escopo ao FINAL de cada condição, usando o próximo índice livre.

`condFoto` usa $1..$5 → o escopo entra como $6:

```ts
  const predFoto = predicadoSraCr(escopo, "cr", 6)
  const condFoto = `where upper(gerente_regional)=upper($1)
      and data_referencia=$2
      and descricao_funcao <> all($3::text[])
      and (cardinality($4::text[])=0 or cr = any($4::text[]))
      and (cardinality($5::text[])=0 or gerente = any($5::text[]))${predFoto.sql}`
  const argsFoto = [GERENTE_REGIONAL_FIXO, dataReferencia, cargosExcluidos, crs, gerentes, ...predFoto.params]
```

`condHist` usa $1..$5 → escopo como $6:

```ts
  const predHist = predicadoSraCr(escopo, "cr", 6)
  const condHist = `where upper(gerente_regional)=upper($1)
      and descricao_funcao <> all($2::text[])
      and (cardinality($3::text[])=0 or cr = any($3::text[]))
      and (cardinality($4::text[])=0 or gerente = any($4::text[]))
      and (cardinality($5::text[])=0 or to_char(data_referencia,'YYYY-MM') = any($5::text[]))${predHist.sql}`
  const argsHist = [GERENTE_REGIONAL_FIXO, cargosExcluidos, crs, gerentes, meses, ...predHist.params]
```

A query de desligamentos monta o WHERE inline com $1..$5 → escopo como $6:

```ts
    inhausPool.query(
      `select count(distinct matricula)::int q from vw_sra_geral
       where upper(gerente_regional)=upper($1)
         and descricao_funcao <> all($2::text[])
         and (cardinality($3::text[])=0 or cr = any($3::text[]))
         and (cardinality($4::text[])=0 or gerente = any($4::text[]))
         and dt_demissao is not null
         and to_char(dt_demissao,'YYYY-MM') = any($5::text[])${predicadoSraCr(escopo, "cr", 6).sql}`,
      [GERENTE_REGIONAL_FIXO, cargosExcluidos, crs, gerentes, mesesDeslig, ...predicadoSraCr(escopo, "cr", 6).params],
    ),
```

- [ ] **Step 3: Trava 2 na saída — verificar `porCr`**

Depois do `Promise.all`, antes do `return`, verificar as linhas que trazem CR:

```ts
  // Trava 2: nenhuma linha de CR fora do escopo pode escapar.
  assertLinhasNoEscopo(porCr.rows, (r) => r.cr as string, escopo)
```

- [ ] **Step 4: Aplicar o escopo em `getOpcoesQuadro`**

As três queries com `${escopo}` (a variável local `escopo` do arquivo é a string de
condição do gerente/data — RENOMEAR para evitar sombra). Renomear a variável local de
condição para `condOpc` e o parâmetro novo para `escopoDados`:

```ts
export async function getOpcoesQuadro(meses: string[], escopoDados: EscopoDados): Promise<OpcoesQuadro> {
  // ... resolver dref ...
  const pred = predicadoSraCr(escopoDados, "cr", 3) // $1 gerente, $2 data, $3 escopo
  const condOpc = `where upper(gerente_regional)=upper($1) and data_referencia=$2${pred.sql}`
```

E cada query que usava `${escopo}` passa a usar `${condOpc}` com args `[GERENTE_REGIONAL_FIXO, dref, ...pred.params]`. (A query de `listaMeses` não filtra por gerente/CR — deixá-la como está: lista de meses disponíveis é global e não vaza dado de pessoa.)

> Nota ao executor: abrir `getOpcoesQuadro` (linhas ~96-131) e localizar como a string
> `escopo` é montada hoje; substituir o nome por `condOpc`, anexar `pred.sql` e `pred.params`
> exatamente como acima. Confirmar os índices de placeholder ao final.

- [ ] **Step 5: Verificar build/tipos**

Run: `npx tsc --noEmit`
Expected: erro apontando os 2 call-sites de `getControleQuadro`/`getOpcoesQuadro` que ainda
não passam escopo (corrigidos na Task 9). Isso é esperado; seguir.

- [ ] **Step 6: Commit**

```bash
git add src/lib/quadro.ts
git commit -m "feat(quadro): injeta escopo de CR (Trava 1) + verifica saída (Trava 2)"
```

---

## Task 9: Página do Quadro resolve e repassa o escopo

**Files:**
- Modify: `src/app/dashboards/rh/controle-quadro/page.tsx:53-73`

- [ ] **Step 1: Resolver o escopo da sessão no topo da página**

Adicionar imports:

```ts
import { getSessionReadOnly } from "@/lib/auth-session"
import { acessoLivreLiberado } from "@/lib/dev-auth"
import { resolverEscopoDados, type EscopoDados } from "@/lib/seguranca/escopo-dados"
```

Dentro de `ControleQuadroPage`, antes do `try`:

```ts
  // Escopo de dados do usuário. Acesso livre de dev = Visitante admin interno (vê tudo).
  let escopo: EscopoDados = { tipo: "todos" }
  if (!acessoLivreLiberado()) {
    const r = await getSessionReadOnly()
    if (r.status !== "ok") {
      escopo = { tipo: "lista", crs: [] } // sem sessão resolvida = nada
    } else {
      escopo = await resolverEscopoDados({
        authUserId: r.sessao.user.id,
        isAdmin: r.sessao.authorization.isAdmin,
        classificacao: r.sessao.authorization.classificacao,
      })
    }
  }
```

- [ ] **Step 2: Passar o escopo às duas chamadas**

```ts
    ;[dados, opcoes] = await Promise.all([
      getControleQuadro({ gerentes, crs, meses, cargosExcluidos }, escopo),
      getOpcoesQuadro(meses, escopo),
    ])
```

- [ ] **Step 3: Verificar build/tipos**

Run: `npx tsc --noEmit`
Expected: PASS (os call-sites agora passam escopo).

- [ ] **Step 4: Verificação runtime**

Run: dev server (`.claude/launch.json` → `hub-inhaus-dev`, porta 3000). Abrir
`/dashboards/rh/controle-quadro`.
- Com acesso livre (admin interno): os números batem com os de hoje (sem regressão).
- Conferência de isolamento fica na Task 12 (com um usuário-cliente real de teste).

- [ ] **Step 5: Commit**

```bash
git add src/app/dashboards/rh/controle-quadro/page.tsx
git commit -m "feat(quadro): página resolve escopo do usuário e repassa ao indicador"
```

---

## Task 10: Endpoint de clientes/CRs para o admin

**Files:**
- Create: `src/app/api/admin/clientes-crs/route.ts`

- [ ] **Step 1: Implementar o GET (admin-only)**

```ts
// src/app/api/admin/clientes-crs/route.ts
import { NextResponse } from "next/server"
import { guardAdmin } from "@/lib/admin-guard"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

// Lista os grupos de cliente e os CRs da dm_cr para os seletores da tela de Usuários.
export async function GET() {
  const g = await guardAdmin()
  if (!g.ok) return g.response

  const linhas = await prisma.$queryRaw<{ cr: string; nome_grp_cliente: string | null; descri_cr: string | null }[]>`
    select cr, nome_grp_cliente, descri_cr from dm_cr order by nome_grp_cliente nulls last, cr
  `
  const clientes = Array.from(
    new Set(linhas.map((l) => l.nome_grp_cliente).filter((v): v is string => !!v)),
  )
  const crs = linhas.map((l) => ({
    cr: l.cr,
    cliente: l.nome_grp_cliente,
    descricao: l.descri_cr,
  }))
  return NextResponse.json({ clientes, crs })
}
```

- [ ] **Step 2: Verificar tipos e resposta**

Run: `npx tsc --noEmit`
Expected: PASS.
Run (dev server ligado, como admin): abrir `http://localhost:3000/api/admin/clientes-crs`.
Expected: JSON com `clientes: string[]` e `crs: [{cr, cliente, descricao}]`.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/admin/clientes-crs/route.ts
git commit -m "feat(admin): endpoint dm_cr (clientes + CRs) para o seletor de escopo"
```

---

## Task 11: Persistir classificação + vínculos na criação/edição de usuário

**Files:**
- Modify: `src/lib/usuarios-admin.ts` (funções `criarUsuarioAdmin`, `atualizarAcessoLocal`)
- Modify: `src/app/api/admin/usuarios/route.ts:24-45` (schemas)

> Ler `src/lib/usuarios-admin.ts` inteiro antes de editar — as funções gravam em
> `auth_users` via Prisma; vamos acrescentar a gravação de `classificacao` e a
> substituição dos vínculos (delete-all + create dos selecionados) em transação.

- [ ] **Step 1: Estender os schemas zod da rota**

Adicionar aos objetos `criarSchema` e `acessoSchema`:

```ts
  classificacao: z.enum(["INTERNO", "CLIENTE"]).default("INTERNO"),
  clientes: z.array(z.string().trim().min(1)).default([]),
  crs: z.array(z.string().trim().min(1)).default([]),
```

- [ ] **Step 2: Validação de coerência CLIENTE**

Após o `safeParse` (POST e PATCH), rejeitar CLIENTE sem escopo e CLIENTE admin:

```ts
  const d = parsed.data
  if (d.classificacao === "CLIENTE" && d.clientes.length === 0 && d.crs.length === 0) {
    return NextResponse.json(
      { error: "Usuário classificado como CLIENTE precisa de ao menos um cliente ou CR vinculado." },
      { status: 400 },
    )
  }
  if (d.classificacao === "CLIENTE" && d.isAdmin) {
    return NextResponse.json(
      { error: "Usuário CLIENTE não pode ser administrador." },
      { status: 400 },
    )
  }
```

- [ ] **Step 3: Gravar classificação + vínculos em `usuarios-admin.ts`**

Em `atualizarAcessoLocal` (e no caminho equivalente de `criarUsuarioAdmin` após criar a
linha local), depois de resolver `authUserId` e a linha `auth_users`, gravar em transação:

```ts
// dentro de usuarios-admin.ts, após atualizar auth_users com classificacao:
await prisma.$transaction([
  prisma.authUser.update({
    where: { email },
    data: { classificacao },
  }),
  prisma.authUserCliente.deleteMany({ where: { authUserId } }),
  prisma.authUserCr.deleteMany({ where: { authUserId } }),
  ...(clientes.length
    ? [prisma.authUserCliente.createMany({
        data: clientes.map((nomeGrpCliente) => ({ authUserId, nomeGrpCliente })),
        skipDuplicates: true,
      })]
    : []),
  ...(crs.length
    ? [prisma.authUserCr.createMany({
        data: crs.map((cr) => ({ authUserId, cr })),
        skipDuplicates: true,
      })]
    : []),
])
```

> Nota: os vínculos usam `authUserId` (UUID do global_auth). Se o usuário ainda não logou
> (authUserId nulo), guardar os vínculos exige o UUID — a criação via global_auth já
> retorna o `id`; usar esse valor. Se por algum caminho o UUID não estiver disponível,
> gravar a classificação e adiar os vínculos exibindo aviso "vínculos aplicados no 1º
> login" NÃO é aceitável para CLIENTE (fail-closed): nesse caso retornar erro pedindo que o
> usuário seja criado pelo fluxo que já resolve o UUID. Confirmar no código de
> `criarUsuarioAdmin` que o UUID vem no retorno do global_auth.

- [ ] **Step 4: Passar os novos campos das funções**

Ajustar as assinaturas/DTOs de `criarUsuarioAdmin` e `atualizarAcessoLocal` para aceitar
`classificacao`, `clientes`, `crs`, e repassá-los conforme o Step 3.

- [ ] **Step 5: Verificar tipos**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/lib/usuarios-admin.ts src/app/api/admin/usuarios/route.ts
git commit -m "feat(admin): grava classificacao e vínculos de escopo (cliente/CR) do usuário"
```

---

## Task 12: UI de concessão (classificação + escopo) na tela de Usuários

**Files:**
- Modify: `src/components/admin/UsuariosAdmin.tsx`
- Modify: `src/app/dashboards/usuarios/page.tsx` (passar opções, se necessário)

> Ler `UsuariosAdmin.tsx` inteiro antes de editar (é o formulário de criar/editar). Seguir
> o padrão visual do projeto (`.glass`, tokens navy/teal, `MultiCombobox` do
> `src/components/ui/MultiCombobox.tsx`, que já renderiza em portal).

- [ ] **Step 1: Buscar clientes/CRs no client**

No componente, carregar `/api/admin/clientes-crs` (fetch no mount) para popular dois
`MultiCombobox`: **Clientes** (lista `clientes`) e **CRs** (lista `crs`, rótulo
`${cr} · ${descricao ?? cliente ?? ""}`).

- [ ] **Step 2: Campos novos no formulário**

- Um seletor **Classificação**: `INTERNO | CLIENTE` (radio/select).
- **Clientes vinculados** (MultiCombobox) e **CRs avulsos** (MultiCombobox).
- **Preview**: "CRs efetivos: N" (união estimada — clientes contam como "todos os CRs do
  grupo"; mostrar a contagem por soma dos CRs cujo `cliente` está entre os selecionados +
  os avulsos, deduplicados).
- Regras de UX: se `CLIENTE`, desabilitar o checkbox **Administrador** e exibir aviso; se
  `CLIENTE` sem nenhum vínculo, bloquear o submit com a mensagem de coerência.

- [ ] **Step 3: Enviar os campos no submit**

Incluir `classificacao`, `clientes`, `crs` no corpo do POST/PATCH para
`/api/admin/usuarios` (casando com os schemas da Task 11).

- [ ] **Step 4: Verificar tipos e build**

Run: `npx tsc --noEmit && npm run build`
Expected: PASS.

- [ ] **Step 5: Verificação runtime (isolamento ponta a ponta)**

Com o dev server e um admin real (global_auth configurado; desligar `HUB_ACESSO_LIVRE`):
1. Criar um usuário classificado `CLIENTE`, vinculado a **um** cliente cujo CR aparece no
   Controle de Quadro.
2. Logar como esse usuário; abrir `/dashboards/rh/controle-quadro`.
3. Conferir que **só** aparecem CRs daquele cliente (comparar "Total por CR" com a
   `dm_cr`).
4. Conferir no banco: rodar a mesma query do quadro com o array de CRs do cliente e sem
   ele — os totais do cliente devem bater com o filtrado.
5. Remover todos os vínculos → o usuário não vê nenhum dado (fail-closed).

- [ ] **Step 6: Commit**

```bash
git add src/components/admin/UsuariosAdmin.tsx src/app/dashboards/usuarios/page.tsx
git commit -m "feat(admin): UI de classificação + escopo por cliente/CR na tela de Usuários"
```

---

## Task 13: Aplicar o escopo no EPI (quadro ativo por CR)

**Files:**
- Modify: `src/lib/epi/colaboradores.ts` (`getQuadroAtivoPorCr`)

> O EPI já isola por PAPEL/escopo (`escopo.ts`). Esta task acrescenta a barreira de CR do
> usuário sobre a leitura do quadro ativo, para que um líder/cliente não consulte um CR
> fora do seu escopo de dados via API.

- [ ] **Step 1: Guardar `getQuadroAtivoPorCr` pelo escopo**

Assinatura passa a receber o escopo; se o CR pedido não estiver no escopo (e não for
`todos`), retornar vazio:

```ts
import { codigoCr, type EscopoDados } from "@/lib/seguranca/escopo-dados"

export async function getQuadroAtivoPorCr(cr: string, escopo: EscopoDados): Promise<ColaboradorAtivo[]> {
  if (escopo.tipo === "lista") {
    const cod = codigoCr(cr)
    if (!cod || !escopo.crs.includes(cod)) return []
  }
  // ... query existente ...
}
```

- [ ] **Step 2: Atualizar os chamadores**

Localizar os call-sites (assistente/`/api/epi/colaboradores?cr=`) e resolver o escopo do
usuário (via `resolverEscopoDados` a partir da sessão) para repassar. Onde o chamador já é
admin/configuração central (Segurança), passar `{ tipo: "todos" }`.

Run: `grep -rn "getQuadroAtivoPorCr" src` para achar todos os usos.

- [ ] **Step 3: Verificar tipos/build**

Run: `npx tsc --noEmit && npm run build`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/lib/epi/colaboradores.ts src/app/api/epi/colaboradores/route.ts
git commit -m "feat(epi): quadro ativo por CR respeita o escopo de dados do usuário"
```

---

## Task 14: Preencher `cr_cod` nas ESCRITAS de EPI (manter a Trava viva)

**Files:**
- Modify: os pontos que criam `epi_turno`, `epi_atribuicao_turno`, `epi_resposta`,
  `epi_sessao_turno`, `epi_presenca_sessao`, `epi_validacao_sessao`.

> O backfill (Task 5) cobre o passado; as escritas novas precisam gravar `cr_cod` para as
> travas/relatórios futuros continuarem corretos.

- [ ] **Step 1: Encontrar as escritas**

Run: `grep -rn "\.create(\|\.createMany(\|\.upsert(" src/lib/epi src/app/api/epi | grep -iE "turno|atribuic|resposta|sessao|presenca|validacao"`

- [ ] **Step 2: Em cada create, derivar e gravar `crCod`**

Padrão (usar `codigoCr` do núcleo). Ex. ao criar turno/atribuição/resposta, incluir
`crCod: codigoCr(cr)`. Para sessão, copiar do turno; para presença/validação, copiar da
sessão (os valores já estão em memória no fluxo). Adicionar o campo `crCod String? @map("cr_cod")`
aos models correspondentes em `schema.prisma` e rodar `npx prisma generate`.

- [ ] **Step 3: Verificar build**

Run: `npx tsc --noEmit && npm run build`
Expected: PASS.

- [ ] **Step 4: Verificação**

Criar um turno/checklist novo pelo assistente; conferir no banco que a linha nasce com
`cr_cod` preenchido:
Run: `psql "$DATABASE_URL" -c "select id, cr, cr_cod from epi_turno order by id desc limit 3"`

- [ ] **Step 5: Commit**

```bash
git add prisma/schema.prisma src/lib/epi src/app/api/epi
git commit -m "feat(epi): escritas gravam cr_cod (mantém isolamento e relatórios corretos)"
```

---

## Task 15: Verificação final e fechamento

- [ ] **Step 1: Suite de testes**

Run: `npm run test`
Expected: PASS (incluindo `escopo-dados.test.ts`).

- [ ] **Step 2: Tipos + build**

Run: `npx tsc --noEmit && npm run build`
Expected: PASS.

- [ ] **Step 3: Conferência de dados (isolamento real)**

- Usuário CLIENTE só vê seus CRs no Quadro e no EPI.
- Usuário INTERNO/admin vê tudo.
- Usuário sem vínculo não vê nada (fail-closed).
- A RPA continua escrevendo normalmente (nenhuma coluna obrigatória nova nas tabelas da
  SRA; só as `epi_*`/`auth_*` do hub mudaram).

- [ ] **Step 4: Atualizar CLAUDE.md**

Acrescentar, na seção de autenticação/acesso, um parágrafo curto sobre: classificação
`INTERNO|CLIENTE`, escopo de dados por CR/cliente (`auth_user_cliente`/`auth_user_cr`),
`src/lib/seguranca/escopo-dados.ts` como gateway obrigatório (Trava 1 + Trava 2) e a nota
de que a RLS está dormente porque a conexão é superusuário.

```bash
git add CLAUDE.md
git commit -m "docs: registra isolamento por CR/cliente no CLAUDE.md"
```

- [ ] **Step 5: Finalizar a branch**

Usar a skill `superpowers:finishing-a-development-branch` para decidir merge/PR.

---

## Notas de segurança (para o revisor)

- **RLS não protege hoje** (conexão superusuário). A proteção efetiva são as duas travas
  na aplicação. Qualquer indicador NOVO que leia dado por CR **deve** passar por
  `predicadoSraCr` (Trava 1) e, quando retornar CR, por `assertLinhasNoEscopo` (Trava 2).
- **CLIENTE nunca recebe `todos`**, mesmo marcado admin por engano — garantido em
  `resolverEscopoDados`.
- **global_auth intocado**: toda a lógica vive em `auth_users` + tabelas de vínculo,
  ligadas pelo UUID.
