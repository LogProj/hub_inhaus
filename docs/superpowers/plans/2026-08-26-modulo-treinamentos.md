# Módulo de Treinamentos — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Registrar presença em treinamentos via QR: a pessoa autorizada (interna) cria um treinamento, gera um QR; o colaborador escaneia, digita só o CPF e confirma; o sistema resolve quem é ele na SRA e grava a presença.

**Architecture:** Espelha o encanamento do módulo de EPI (HMAC do CPF, token público estável, resolução no quadro ativo da SRA), mas o fluxo público (QR/CPF) é construído do zero — o de EPI foi removido na v2. Tela interna em RH; rota pública `/t/[token]` fora do `/dashboards`. Tabelas do hub por SQL manual idempotente (NUNCA `prisma db push`).

**Tech Stack:** Next.js 14 (App Router) · TypeScript · Prisma + Postgres (`pg` para leitura da SRA) · zod · vitest · `qrcode.react` (já instalado).

---

## Convenções do projeto (ler antes de começar)

- **NUNCA `prisma db push`/`migrate`.** Banco compartilhado com a SRA. Toda mudança de schema: editar `schema.prisma` → escrever SQL aditivo idempotente em `prisma/sql/` → aplicar → `prisma generate`.
- Interface, comentários e docs em **português do Brasil**.
- Cores/tokens sempre do Tailwind (`text-navy`, `bg-inhaus-grad`, `.glass`), nunca hex solto.
- Route handlers: validação **zod**, guardas que **honram o acesso livre de dev**, erro sempre `{ error }`.
- CPF **nunca** em claro nem na URL — só HMAC (`hmacCpf`).
- Teste: `npx vitest run`. Verificação final: `npx tsc --noEmit` e `npm run build`.

---

## File Structure

**Criar:**
- `prisma/sql/011_treinamentos.sql` — DDL idempotente das 3 tabelas.
- `src/lib/treinamentos/index.ts` — regras de negócio + CRUD (Prisma).
- `src/lib/treinamentos/colaborador.ts` — resolve CPF→colaborador na SRA (quadro ativo, sem amarra por CR).
- `src/lib/treinamentos/schemas.ts` — schemas zod.
- `src/lib/treinamentos/schemas.test.ts` — testes dos schemas.
- `src/lib/treinamentos/colaborador.test.ts` — teste do parse do CPF (unidade pura).
- `src/app/api/treinamentos/route.ts` — POST cria treinamento; GET lista.
- `src/app/api/treinamentos/[id]/route.ts` — PATCH encerra.
- `src/app/api/treinamentos/responsaveis/route.ts` — GET lista / POST cria responsável.
- `src/app/api/treinamentos/responsaveis/[id]/route.ts` — DELETE (soft) responsável.
- `src/app/dashboards/rh/treinamentos/page.tsx` — lista + criar + config responsáveis.
- `src/app/dashboards/rh/treinamentos/[id]/page.tsx` — detalhe + QR + presença.
- `src/app/t/[token]/page.tsx` — formulário público (server: resolve token).
- `src/app/t/[token]/TreinamentoPublicoForm.tsx` — client: campo CPF + confirmar.
- `src/app/api/t/[token]/confirmar/route.ts` — POST público: grava presença.
- `src/components/treinamentos/CriarTreinamento.tsx` — client: form de criação.
- `src/components/treinamentos/ConfigResponsaveis.tsx` — client: diálogo de responsáveis.
- `src/components/treinamentos/QrTreinamento.tsx` — client: QR (copiar/abrir/imprimir).
- `src/components/treinamentos/TabelaPresenca.tsx` — client/server: lista de presença.
- `src/components/treinamentos/InfoTreinamentos.tsx` — botão info.

**Modificar:**
- `prisma/schema.prisma` — 3 models novos.
- `src/lib/domains.ts` — tela `treinamentos-registro` no domínio RH.
- `middleware.ts` — `/t` em `rotasPublicas`.

---

## Task 1: Schema Prisma + SQL idempotente

**Files:**
- Modify: `prisma/schema.prisma` (fim do arquivo)
- Create: `prisma/sql/011_treinamentos.sql`

- [ ] **Step 1: Adicionar os 3 models ao `schema.prisma`** (ao final, seguindo o estilo dos models existentes)

```prisma
// ===========================================================================
// MÓDULO DE TREINAMENTOS — registro de presença por QR.
// Tabelas criadas por prisma/sql/011_treinamentos.sql (SQL manual, nunca db push).
// Nomes mantidos com prefixo `treinamento_` (padrão herdado dos Desvios). A regra
// dm_/ft_ do CLAUDE.md vale para tabelas NOVAS daqui pra frente.
// ===========================================================================
model Treinamento {
  id            String                @id @default(uuid())
  nome          String
  data          DateTime              @db.Date
  duracaoHoras  Decimal               @map("duracao_horas") @db.Decimal(4, 2)
  responsavelId String                @map("responsavel_id")
  status        String                @default("ABERTO") // ABERTO | ENCERRADO
  tokenPublico  String                @unique @map("token_publico")
  criadoPorId   String?               @map("criado_por_id")
  criadoEm      DateTime              @default(now()) @map("criado_em")
  atualizadoEm  DateTime              @default(now()) @updatedAt @map("atualizado_em")
  responsavel   TreinamentoResponsavel @relation(fields: [responsavelId], references: [id])
  presencas     TreinamentoPresenca[]

  @@map("treinamento")
}

model TreinamentoResponsavel {
  id           String        @id @default(uuid())
  nome         String
  ativo        Boolean       @default(true)
  criadoEm     DateTime      @default(now()) @map("criado_em")
  treinamentos Treinamento[]

  @@map("treinamento_responsavel")
}

model TreinamentoPresenca {
  id              String      @id @default(uuid())
  treinamentoId   String      @map("treinamento_id")
  cpfHash         String      @map("cpf_hash")
  nomeColab       String?     @map("nome_colab")
  crCod           String?     @map("cr_cod")
  crNome          String?     @map("cr_nome")
  cargo           String?
  matricula       String?
  localizadoNaSra Boolean     @map("localizado_na_sra")
  confirmadoEm    DateTime    @default(now()) @map("confirmado_em")
  treinamento     Treinamento @relation(fields: [treinamentoId], references: [id], onDelete: Cascade)

  @@unique([treinamentoId, cpfHash])
  @@map("treinamento_presenca")
}
```

- [ ] **Step 2: Escrever o SQL idempotente** `prisma/sql/011_treinamentos.sql`

```sql
-- Módulo de Treinamentos — registro de presença por QR.
-- SQL MANUAL idempotente (banco compartilhado com a SRA; NUNCA prisma db push).

CREATE TABLE IF NOT EXISTS treinamento_responsavel (
  id        text PRIMARY KEY,
  nome      text NOT NULL,
  ativo     boolean NOT NULL DEFAULT true,
  criado_em timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS treinamento (
  id             text PRIMARY KEY,
  nome           text NOT NULL,
  data           date NOT NULL,
  duracao_horas  numeric(4,2) NOT NULL,
  responsavel_id text NOT NULL,
  status         text NOT NULL DEFAULT 'ABERTO',
  token_publico  text NOT NULL,
  criado_por_id  text,
  criado_em      timestamp NOT NULL DEFAULT now(),
  atualizado_em  timestamp NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS treinamento_token_uq ON treinamento (token_publico);

CREATE TABLE IF NOT EXISTS treinamento_presenca (
  id                text PRIMARY KEY,
  treinamento_id    text NOT NULL,
  cpf_hash          text NOT NULL,
  nome_colab        text,
  cr_cod            varchar(5),
  cr_nome           text,
  cargo             text,
  matricula         text,
  localizado_na_sra boolean NOT NULL,
  confirmado_em     timestamp NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS treinamento_presenca_uq
  ON treinamento_presenca (treinamento_id, cpf_hash);

DO $$ BEGIN
  ALTER TABLE treinamento
    ADD CONSTRAINT treinamento_responsavel_fk
    FOREIGN KEY (responsavel_id) REFERENCES treinamento_responsavel (id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE treinamento_presenca
    ADD CONSTRAINT treinamento_presenca_treino_fk
    FOREIGN KEY (treinamento_id) REFERENCES treinamento (id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
```

- [ ] **Step 3: Aplicar o SQL no banco**

Run (PowerShell, usa a `DATABASE_URL` do `.env.local`):
`npx dotenv -e .env.local -- psql "$env:DATABASE_URL" -f prisma/sql/011_treinamentos.sql`
Alternativa se não houver `psql`: pedir ao usuário para rodar via `! ...` ou aplicar com um script `node` usando `pg`. Expected: `CREATE TABLE` / `CREATE INDEX` sem erro (rodar de novo não deve falhar — é idempotente).

- [ ] **Step 4: Gerar o Prisma Client** (NÃO toca no banco)

Run: `npx prisma generate`
Expected: "Generated Prisma Client".

- [ ] **Step 5: Verificar que compila**

Run: `npx tsc --noEmit`
Expected: sem erros.

- [ ] **Step 6: Commit**

```bash
git add prisma/schema.prisma prisma/sql/011_treinamentos.sql
git commit -m "feat(treinamentos): schema e SQL idempotente das tabelas"
```

---

## Task 2: Schemas zod

**Files:**
- Create: `src/lib/treinamentos/schemas.ts`
- Test: `src/lib/treinamentos/schemas.test.ts`

- [ ] **Step 1: Escrever o teste que falha**

```ts
import { describe, it, expect } from "vitest"
import { criarTreinamentoSchema, confirmarPresencaSchema, responsavelSchema } from "./schemas"

describe("criarTreinamentoSchema", () => {
  it("aceita um treinamento válido", () => {
    const r = criarTreinamentoSchema.safeParse({
      nome: "NR-35", data: "2026-08-26", duracaoHoras: 2.5, responsavelId: "abc",
    })
    expect(r.success).toBe(true)
  })
  it("rejeita duração <= 0", () => {
    const r = criarTreinamentoSchema.safeParse({
      nome: "X", data: "2026-08-26", duracaoHoras: 0, responsavelId: "abc",
    })
    expect(r.success).toBe(false)
  })
  it("rejeita nome vazio", () => {
    const r = criarTreinamentoSchema.safeParse({
      nome: "", data: "2026-08-26", duracaoHoras: 1, responsavelId: "abc",
    })
    expect(r.success).toBe(false)
  })
})

describe("confirmarPresencaSchema", () => {
  it("aceita 11 dígitos com máscara", () => {
    expect(confirmarPresencaSchema.safeParse({ cpf: "123.456.789-09" }).success).toBe(true)
  })
  it("rejeita menos de 11 dígitos", () => {
    expect(confirmarPresencaSchema.safeParse({ cpf: "123" }).success).toBe(false)
  })
})

describe("responsavelSchema", () => {
  it("exige nome", () => {
    expect(responsavelSchema.safeParse({ nome: "  " }).success).toBe(false)
    expect(responsavelSchema.safeParse({ nome: "João" }).success).toBe(true)
  })
})
```

- [ ] **Step 2: Rodar o teste e ver falhar**

Run: `npx vitest run src/lib/treinamentos/schemas.test.ts`
Expected: FAIL (módulo `./schemas` não existe).

- [ ] **Step 3: Implementar `schemas.ts`**

```ts
import { z } from "zod"

/** Nome não vazio (após trim). */
const nomeObrigatorio = z.string().trim().min(1, "Informe o nome")

export const criarTreinamentoSchema = z.object({
  nome: nomeObrigatorio,
  // Aceita "YYYY-MM-DD" (input date). Guardado como dia, sem hora.
  data: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida"),
  duracaoHoras: z.coerce.number().positive("Duração deve ser maior que zero").max(99.99),
  responsavelId: z.string().min(1, "Selecione um responsável"),
})
export type CriarTreinamento = z.infer<typeof criarTreinamentoSchema>

export const responsavelSchema = z.object({ nome: nomeObrigatorio })

/** CPF do formulário público: valida só o formato (11 dígitos), não o dígito verificador. */
export const confirmarPresencaSchema = z.object({
  cpf: z.string().refine((v) => v.replace(/\D/g, "").length === 11, "CPF deve ter 11 dígitos"),
})

export const encerrarSchema = z.object({ status: z.literal("ENCERRADO") })
```

- [ ] **Step 4: Rodar o teste e ver passar**

Run: `npx vitest run src/lib/treinamentos/schemas.test.ts`
Expected: PASS (todos).

- [ ] **Step 5: Commit**

```bash
git add src/lib/treinamentos/schemas.ts src/lib/treinamentos/schemas.test.ts
git commit -m "feat(treinamentos): schemas zod com testes"
```

---

## Task 3: Resolução do CPF na SRA (quadro ativo, sem amarra por CR)

**Files:**
- Create: `src/lib/treinamentos/colaborador.ts`
- Test: `src/lib/treinamentos/colaborador.test.ts`

Contexto: reaproveita `hmacCpf` (`src/lib/epi/cpf.ts`) e a base `ft_colaboradores_sra` (mesma da `src/lib/epi/colaboradores.ts`). Diferente do EPI, **não filtra por CR** — busca a pessoa em todo o quadro ativo pelo CPF.

- [ ] **Step 1: Escrever o teste (unidade pura do normalizador de CR)**

```ts
import { describe, it, expect } from "vitest"
import { codigoDoCrSra } from "./colaborador"

describe("codigoDoCrSra", () => {
  it("extrai os 5 chars antes do ' - '", () => {
    expect(codigoDoCrSra("01234 - FILIAL SP")).toBe("01234")
  })
  it("zero-padeia códigos numéricos curtos", () => {
    expect(codigoDoCrSra("123 - X")).toBe("00123")
  })
  it("devolve null quando não há CR", () => {
    expect(codigoDoCrSra("")).toBeNull()
    expect(codigoDoCrSra(null)).toBeNull()
  })
})
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run src/lib/treinamentos/colaborador.test.ts`
Expected: FAIL (módulo não existe).

- [ ] **Step 3: Implementar `colaborador.ts`**

```ts
import { inhausPool } from "@/lib/db-inhaus"
import { hmacCpf, normalizarCpf } from "@/lib/epi/cpf"

/**
 * Resolução de colaborador para o módulo de TREINAMENTOS.
 *
 * Regra de negócio (em sincronia com o InfoIndicador):
 *  - A fonte é o QUADRO ATIVO da SRA (`ft_colaboradores_sra`, mês de referência mais
 *    recente, `dt_demissao IS NULL`) — o quadro vivo, não a fotografia congelada.
 *  - NÃO há amarra por CR: qualquer CPF válido é aceito. O CR real do colaborador
 *    entra no snapshot da presença só para DISTINGUIR de onde a pessoa é.
 *  - Identidade = HMAC do CPF; o CPF em claro nunca sai daqui.
 *  - CPF não encontrado no quadro → devolve null (a presença é gravada mesmo assim,
 *    marcada como "não localizado na SRA").
 *
 * Módulo server-only.
 */

export type ColaboradorSra = {
  cpfHash: string
  nome: string
  cargo: string | null
  matricula: string | null
  crCod: string | null
  crNome: string
}

/** Código de 5 chars do CR a partir do texto da SRA ("01234 - NOME"). Null se vazio. */
export function codigoDoCrSra(crBruto: string | null): string | null {
  if (!crBruto) return null
  const parte = crBruto.trim().split(" - ")[0]?.trim() ?? ""
  if (!parte) return null
  return parte.length < 5 ? parte.padStart(5, "0") : parte
}

/**
 * Resolve um colaborador ativo pelo CPF (em claro), buscando em TODO o quadro ativo.
 * Devolve null se o CPF não estiver no quadro. O `cpfHash` é sempre calculado no
 * servidor — quem chama grava o hash mesmo quando o colaborador é null.
 */
export async function resolverColaboradorPorCpf(cpf: string): Promise<ColaboradorSra | null> {
  const digitos = normalizarCpf(cpf)
  const r = await inhausPool.query(
    `select cpf, nome, descricao_funcao, matricula, cr
       from ft_colaboradores_sra
      where regexp_replace(cpf, '\\D', '', 'g') = $1
        and dt_demissao is null
        and mes_referencia = (select max(mes_referencia) from ft_colaboradores_sra)
      limit 1`,
    [digitos],
  )
  const row = r.rows[0]
  if (!row) return null
  return {
    cpfHash: hmacCpf(digitos),
    nome: row.nome ?? "",
    cargo: row.descricao_funcao ?? null,
    matricula: row.matricula ?? null,
    crCod: codigoDoCrSra(row.cr ?? null),
    crNome: (row.cr ?? "").trim(),
  }
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npx vitest run src/lib/treinamentos/colaborador.test.ts`
Expected: PASS.

- [ ] **Step 5: Verificar compilação**

Run: `npx tsc --noEmit`
Expected: sem erros.

- [ ] **Step 6: Commit**

```bash
git add src/lib/treinamentos/colaborador.ts src/lib/treinamentos/colaborador.test.ts
git commit -m "feat(treinamentos): resolucao de colaborador por CPF no quadro ativo"
```

---

## Task 4: Camada de dados (CRUD + confirmação de presença)

**Files:**
- Create: `src/lib/treinamentos/index.ts`

Sem teste unitário automatizado (depende do Prisma/DB — verificação por `tsc`, `build` e conferência no banco, conforme o CLAUDE.md). Toda a lógica pura já foi testada nas Tasks 2 e 3.

- [ ] **Step 1: Implementar `index.ts`**

```ts
import { prisma } from "@/lib/prisma"
import { gerarToken } from "@/lib/epi/tokens"
import { resolverColaboradorPorCpf } from "@/lib/treinamentos/colaborador"
import { hmacCpf } from "@/lib/epi/cpf"

/**
 * Regras de negócio do módulo de TREINAMENTOS.
 *
 *  - Um treinamento tem nome, data (dia), duração (horas) e um RESPONSÁVEL escolhido
 *    de uma lista própria do módulo (`treinamento_responsavel`).
 *  - Cada treinamento carrega um TOKEN público estável (o QR aponta para /t/<token>).
 *  - PRESENÇA: 1 por pessoa por treinamento (unique treinamento_id + cpf_hash). Confirmar
 *    o mesmo CPF de novo é idempotente (não duplica).
 *  - Enquanto o treinamento está ABERTO aceita presença; ENCERRADO recusa.
 *  - Sem amarra por CR: qualquer CPF válido confirma; o CR entra no snapshot só para
 *    distinguir. CPF fora do quadro ativo é gravado com localizadoNaSra=false.
 *
 * Módulo server-only.
 */

export async function listarResponsaveis() {
  return prisma.treinamentoResponsavel.findMany({
    where: { ativo: true },
    orderBy: { nome: "asc" },
  })
}

export async function adicionarResponsavel(nome: string) {
  return prisma.treinamentoResponsavel.create({ data: { nome } })
}

/** Soft-delete: some do dropdown, mas os treinamentos antigos continuam apontando. */
export async function removerResponsavel(id: string) {
  return prisma.treinamentoResponsavel.update({ where: { id }, data: { ativo: false } })
}

export async function listarTreinamentos() {
  const linhas = await prisma.treinamento.findMany({
    orderBy: { data: "desc" },
    include: { responsavel: true, _count: { select: { presencas: true } } },
  })
  return linhas.map((t) => ({
    id: t.id,
    nome: t.nome,
    data: t.data,
    duracaoHoras: Number(t.duracaoHoras),
    responsavel: t.responsavel.nome,
    status: t.status,
    tokenPublico: t.tokenPublico,
    presencas: t._count.presencas,
  }))
}

export async function criarTreinamento(entrada: {
  nome: string
  data: string
  duracaoHoras: number
  responsavelId: string
  criadoPorId: string | null
}) {
  return prisma.treinamento.create({
    data: {
      nome: entrada.nome,
      data: new Date(entrada.data),
      duracaoHoras: entrada.duracaoHoras,
      responsavelId: entrada.responsavelId,
      criadoPorId: entrada.criadoPorId,
      tokenPublico: gerarToken(),
    },
  })
}

export async function encerrarTreinamento(id: string) {
  return prisma.treinamento.update({ where: { id }, data: { status: "ENCERRADO" } })
}

export async function getTreinamentoComPresencas(id: string) {
  const t = await prisma.treinamento.findUnique({
    where: { id },
    include: {
      responsavel: true,
      presencas: { orderBy: { confirmadoEm: "asc" } },
    },
  })
  if (!t) return null
  return {
    id: t.id,
    nome: t.nome,
    data: t.data,
    duracaoHoras: Number(t.duracaoHoras),
    responsavel: t.responsavel.nome,
    status: t.status,
    tokenPublico: t.tokenPublico,
    presencas: t.presencas,
  }
}

export type ResolucaoPublica =
  | { estado: "encerrado" }
  | { estado: "ok"; treinamento: { id: string; nome: string; data: Date } }

/** O que a página pública deve mostrar para um token. Null = token inexistente (404). */
export async function resolverTreinamentoPublico(token: string): Promise<ResolucaoPublica | null> {
  const t = await prisma.treinamento.findUnique({ where: { tokenPublico: token } })
  if (!t) return null
  if (t.status === "ENCERRADO") return { estado: "encerrado" }
  return { estado: "ok", treinamento: { id: t.id, nome: t.nome, data: t.data } }
}

export type ResultadoConfirmacao =
  | { estado: "encerrado" }
  | { estado: "confirmado"; nome: string; jaEstava: boolean; localizado: boolean }

/**
 * Confirma a presença pelo token público + CPF. Idempotente: se a pessoa já confirmou,
 * devolve jaEstava=true sem duplicar. CPF fora do quadro grava localizadoNaSra=false.
 */
export async function confirmarPresenca(
  token: string,
  cpf: string,
): Promise<ResultadoConfirmacao | null> {
  const t = await prisma.treinamento.findUnique({ where: { tokenPublico: token } })
  if (!t) return null
  if (t.status === "ENCERRADO") return { estado: "encerrado" }

  const colaborador = await resolverColaboradorPorCpf(cpf)
  const cpfHash = colaborador?.cpfHash ?? hmacCpf(cpf)

  const existente = await prisma.treinamentoPresenca.findUnique({
    where: { treinamentoId_cpfHash: { treinamentoId: t.id, cpfHash } },
  })
  if (existente) {
    return {
      estado: "confirmado",
      nome: existente.nomeColab ?? "colaborador",
      jaEstava: true,
      localizado: existente.localizadoNaSra,
    }
  }

  const criada = await prisma.treinamentoPresenca.create({
    data: {
      treinamentoId: t.id,
      cpfHash,
      nomeColab: colaborador?.nome ?? null,
      crCod: colaborador?.crCod ?? null,
      crNome: colaborador?.crNome ?? null,
      cargo: colaborador?.cargo ?? null,
      matricula: colaborador?.matricula ?? null,
      localizadoNaSra: colaborador !== null,
    },
  })
  return {
    estado: "confirmado",
    nome: criada.nomeColab ?? "colaborador",
    jaEstava: false,
    localizado: criada.localizadoNaSra,
  }
}
```

- [ ] **Step 2: Verificar compilação**

Run: `npx tsc --noEmit`
Expected: sem erros (confirma que os nomes de campo batem com o Prisma Client gerado na Task 1, inclusive a chave composta `treinamentoId_cpfHash`).

- [ ] **Step 3: Commit**

```bash
git add src/lib/treinamentos/index.ts
git commit -m "feat(treinamentos): camada de dados (crud + confirmacao idempotente)"
```

---

## Task 5: Guarda de acesso interno do módulo

**Files:**
- Create: `src/lib/treinamentos/guarda.ts`

Reaproveita `getUsuarioAtual`/`usuarioAtualHandler` do EPI, mas expõe uma guarda simples: exige usuário logado (honra o acesso livre de dev). A visibilidade da TELA é feita por `assertTelaVisivel` nas páginas; a API só exige estar logado e interno.

- [ ] **Step 1: Implementar `guarda.ts`**

```ts
import { NextResponse } from "next/server"
import { getCurrentSession } from "@/lib/auth-session"
import { acessoLivreLiberado, USUARIO_DEV } from "@/lib/dev-auth"

/**
 * Guarda dos route handlers de TREINAMENTOS. Honra o ACESSO LIVRE de dev (senão daria
 * 401 em dev, onde não há cookie). Módulo interno: exige usuário logado. A visibilidade
 * por tela é responsabilidade das páginas (assertTelaVisivel); a lista de presença não
 * é amarrada por CR (decisão de negócio).
 */
export type Autor = { authUserId: string | null; nome: string | null; isAdmin: boolean }

export type ResultadoGuarda =
  | { ok: true; autor: Autor }
  | { ok: false; response: NextResponse }

export async function guardaInterno(): Promise<ResultadoGuarda> {
  if (acessoLivreLiberado()) {
    return { ok: true, autor: { authUserId: null, nome: USUARIO_DEV.nome, isAdmin: USUARIO_DEV.isAdmin } }
  }
  const sessao = await getCurrentSession()
  if (!sessao) return { ok: false, response: NextResponse.json({ error: "Não autorizado" }, { status: 401 }) }
  return {
    ok: true,
    autor: {
      authUserId: sessao.user.id ?? null,
      nome: sessao.authorization.nome,
      isAdmin: sessao.authorization.isAdmin,
    },
  }
}
```

- [ ] **Step 2: Verificar compilação**

Run: `npx tsc --noEmit`
Expected: sem erros.

- [ ] **Step 3: Commit**

```bash
git add src/lib/treinamentos/guarda.ts
git commit -m "feat(treinamentos): guarda de acesso interno (honra acesso livre)"
```

---

## Task 6: Route handlers internos

**Files:**
- Create: `src/app/api/treinamentos/route.ts`
- Create: `src/app/api/treinamentos/[id]/route.ts`
- Create: `src/app/api/treinamentos/responsaveis/route.ts`
- Create: `src/app/api/treinamentos/responsaveis/[id]/route.ts`

Usa os helpers `lerCorpo/ok/erroInesperado` do EPI (`src/lib/epi/http.ts`).

- [ ] **Step 1: `src/app/api/treinamentos/route.ts`**

```ts
import { guardaInterno } from "@/lib/treinamentos/guarda"
import { criarTreinamentoSchema } from "@/lib/treinamentos/schemas"
import { criarTreinamento, listarTreinamentos } from "@/lib/treinamentos"
import { lerCorpo, ok, erroInesperado } from "@/lib/epi/http"

export const dynamic = "force-dynamic"

export async function GET() {
  const guarda = await guardaInterno()
  if (!guarda.ok) return guarda.response
  try {
    return ok(await listarTreinamentos())
  } catch (e) {
    return erroInesperado(e)
  }
}

export async function POST(request: Request) {
  const guarda = await guardaInterno()
  if (!guarda.ok) return guarda.response
  const corpo = await lerCorpo(request, criarTreinamentoSchema)
  if (!corpo.ok) return corpo.response
  try {
    const t = await criarTreinamento({ ...corpo.dados, criadoPorId: guarda.autor.authUserId })
    return ok({ id: t.id, tokenPublico: t.tokenPublico })
  } catch (e) {
    return erroInesperado(e)
  }
}
```

- [ ] **Step 2: `src/app/api/treinamentos/[id]/route.ts`**

```ts
import { guardaInterno } from "@/lib/treinamentos/guarda"
import { encerrarSchema } from "@/lib/treinamentos/schemas"
import { encerrarTreinamento } from "@/lib/treinamentos"
import { lerCorpo, ok, erroInesperado } from "@/lib/epi/http"

export const dynamic = "force-dynamic"

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const guarda = await guardaInterno()
  if (!guarda.ok) return guarda.response
  const corpo = await lerCorpo(request, encerrarSchema)
  if (!corpo.ok) return corpo.response
  try {
    await encerrarTreinamento(params.id)
    return ok()
  } catch (e) {
    return erroInesperado(e)
  }
}
```

- [ ] **Step 3: `src/app/api/treinamentos/responsaveis/route.ts`**

```ts
import { guardaInterno } from "@/lib/treinamentos/guarda"
import { responsavelSchema } from "@/lib/treinamentos/schemas"
import { adicionarResponsavel, listarResponsaveis } from "@/lib/treinamentos"
import { lerCorpo, ok, erroInesperado } from "@/lib/epi/http"

export const dynamic = "force-dynamic"

export async function GET() {
  const guarda = await guardaInterno()
  if (!guarda.ok) return guarda.response
  try {
    return ok(await listarResponsaveis())
  } catch (e) {
    return erroInesperado(e)
  }
}

export async function POST(request: Request) {
  const guarda = await guardaInterno()
  if (!guarda.ok) return guarda.response
  const corpo = await lerCorpo(request, responsavelSchema)
  if (!corpo.ok) return corpo.response
  try {
    return ok(await adicionarResponsavel(corpo.dados.nome))
  } catch (e) {
    return erroInesperado(e)
  }
}
```

- [ ] **Step 4: `src/app/api/treinamentos/responsaveis/[id]/route.ts`**

```ts
import { guardaInterno } from "@/lib/treinamentos/guarda"
import { removerResponsavel } from "@/lib/treinamentos"
import { ok, erroInesperado } from "@/lib/epi/http"

export const dynamic = "force-dynamic"

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  const guarda = await guardaInterno()
  if (!guarda.ok) return guarda.response
  try {
    await removerResponsavel(params.id)
    return ok()
  } catch (e) {
    return erroInesperado(e)
  }
}
```

- [ ] **Step 5: Verificar compilação**

Run: `npx tsc --noEmit`
Expected: sem erros.

- [ ] **Step 6: Commit**

```bash
git add src/app/api/treinamentos
git commit -m "feat(treinamentos): route handlers internos (treinamentos + responsaveis)"
```

---

## Task 7: Rota pública `/t/[token]` + liberação no middleware

**Files:**
- Modify: `middleware.ts:23`
- Create: `src/app/t/[token]/page.tsx`
- Create: `src/app/t/[token]/TreinamentoPublicoForm.tsx`
- Create: `src/app/api/t/[token]/confirmar/route.ts`

- [ ] **Step 1: Liberar `/t` no middleware**

Em `middleware.ts`, linha 23, trocar:
```ts
const rotasPublicas = ["/login", "/home"]
```
por:
```ts
// `/t/<token>` é o preenchimento público de presença em treinamento (QR + CPF).
const rotasPublicas = ["/login", "/home", "/t"]
```

- [ ] **Step 2: `src/app/api/t/[token]/confirmar/route.ts`** (rota pública — sem guarda de sessão)

```ts
import { confirmarPresencaSchema } from "@/lib/treinamentos/schemas"
import { confirmarPresenca } from "@/lib/treinamentos"
import { lerCorpo, ok, erroInesperado } from "@/lib/epi/http"
import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

export async function POST(request: Request, { params }: { params: { token: string } }) {
  const corpo = await lerCorpo(request, confirmarPresencaSchema)
  if (!corpo.ok) return corpo.response
  try {
    const r = await confirmarPresenca(params.token, corpo.dados.cpf)
    if (r === null) return NextResponse.json({ error: "Treinamento não encontrado" }, { status: 404 })
    if (r.estado === "encerrado")
      return NextResponse.json({ error: "Este treinamento já foi encerrado." }, { status: 409 })
    return ok(r)
  } catch (e) {
    return erroInesperado(e)
  }
}
```

- [ ] **Step 3: `src/app/t/[token]/page.tsx`** (server: resolve o token)

```tsx
import { notFound } from "next/navigation"
import { resolverTreinamentoPublico } from "@/lib/treinamentos"
import { InhausLogo } from "@/components/brand/InhausLogo"
import { TreinamentoPublicoForm } from "./TreinamentoPublicoForm"

export const dynamic = "force-dynamic"

export default async function TreinamentoPublicoPage({ params }: { params: { token: string } }) {
  const r = await resolverTreinamentoPublico(params.token)
  if (r === null) notFound()

  return (
    <main className="min-h-screen bg-inhaus-radial flex items-center justify-center p-6">
      <div className="glass w-full max-w-md rounded-3xl p-8 space-y-6">
        <InhausLogo className="h-8" />
        {r.estado === "encerrado" ? (
          <p className="text-navy">Este treinamento já foi encerrado. Procure o responsável.</p>
        ) : (
          <>
            <div>
              <p className="eyebrow">Registro de presença</p>
              <h1 className="text-2xl font-semibold text-navy">{r.treinamento.nome}</h1>
              <p className="text-sm text-navy/70">
                {new Date(r.treinamento.data).toLocaleDateString("pt-BR", { timeZone: "UTC" })}
              </p>
            </div>
            <TreinamentoPublicoForm token={params.token} />
          </>
        )}
      </div>
    </main>
  )
}
```

- [ ] **Step 4: `src/app/t/[token]/TreinamentoPublicoForm.tsx`** (client)

```tsx
"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export function TreinamentoPublicoForm({ token }: { token: string }) {
  const [cpf, setCpf] = useState("")
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [sucesso, setSucesso] = useState<{ nome: string; localizado: boolean; jaEstava: boolean } | null>(null)

  async function enviar(e: React.FormEvent) {
    e.preventDefault()
    setErro(null)
    setCarregando(true)
    try {
      const resp = await fetch(`/api/t/${token}/confirmar`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ cpf }),
      })
      const dados = await resp.json()
      if (!resp.ok) {
        setErro(dados.error ?? "Não foi possível confirmar.")
        return
      }
      setSucesso({ nome: dados.nome, localizado: dados.localizado, jaEstava: dados.jaEstava })
    } catch {
      setErro("Falha de conexão. Tente de novo.")
    } finally {
      setCarregando(false)
    }
  }

  if (sucesso) {
    return (
      <div className="space-y-2 text-navy">
        <p className="text-lg font-semibold text-teal">
          {sucesso.jaEstava ? "Presença já registrada" : "Presença confirmada!"}
        </p>
        <p>
          {sucesso.localizado
            ? `Obrigado, ${sucesso.nome}.`
            : "Registramos seu CPF. Seu cadastro será confirmado pelo responsável."}
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={enviar} className="space-y-4">
      <div className="space-y-1">
        <Label htmlFor="cpf">CPF</Label>
        <Input
          id="cpf"
          inputMode="numeric"
          placeholder="Somente números"
          value={cpf}
          onChange={(e) => setCpf(e.target.value)}
          autoComplete="off"
        />
      </div>
      {erro && <p className="text-sm text-red-600">{erro}</p>}
      <Button type="submit" disabled={carregando} className="w-full">
        {carregando ? "Confirmando..." : "Confirmar presença"}
      </Button>
    </form>
  )
}
```

- [ ] **Step 5: Verificar compilação + build**

Run: `npx tsc --noEmit`
Expected: sem erros. (Se `InhausLogo` não aceitar `className`, checar a assinatura real em `src/components/brand/InhausLogo.tsx` e ajustar.)

- [ ] **Step 6: Commit**

```bash
git add middleware.ts src/app/t src/app/api/t
git commit -m "feat(treinamentos): rota publica /t/[token] com formulario de CPF"
```

---

## Task 8: `domains.ts` — tela em RH

**Files:**
- Modify: `src/lib/domains.ts` (import de ícone + tela no domínio RH)

- [ ] **Step 1: Garantir o ícone importado**

No bloco de import de `lucide-react` (linhas 1-25), confirmar que `ClipboardCheck` já está importado (está — linha 8). Nada a adicionar.

- [ ] **Step 2: Adicionar a tela ao domínio RH**

Em `src/lib/domains.ts`, dentro do domínio `rh` (array `telas`, após o item `controle-quadro`, linhas 112-118), inserir:

```ts
      {
        key: "treinamentos-registro",
        label: "Treinamentos",
        href: "/dashboards/rh/treinamentos",
        palavrasChave: ["treinamento", "presenca", "qr", "capacitacao", "nr", "lista de presenca"],
        icone: ClipboardCheck,
      },
```

- [ ] **Step 3: Verificar compilação**

Run: `npx tsc --noEmit`
Expected: sem erros.

- [ ] **Step 4: Commit**

```bash
git add src/lib/domains.ts
git commit -m "feat(treinamentos): registra a tela no dominio RH (domains.ts)"
```

---

## Task 9: Botão info

**Files:**
- Create: `src/components/treinamentos/InfoTreinamentos.tsx`

Segue o padrão de `src/components/desvios/InfoDesvios.tsx` (que usa `InfoIndicador`). Reler esse arquivo antes para copiar a estrutura exata do componente.

- [ ] **Step 1: Ler o padrão**

Run/abrir: `src/components/desvios/InfoDesvios.tsx` e `src/components/dashboard/InfoIndicador.tsx` para ver as props (`titulo`, conteúdo em children/bullets).

- [ ] **Step 2: Implementar `InfoTreinamentos.tsx`** (texto 100% em regras de negócio, zero termo técnico)

```tsx
import { InfoIndicador } from "@/components/dashboard/InfoIndicador"

/**
 * Info do módulo de Treinamentos, em linguagem de negócio (sem termo técnico).
 * Manter em sincronia com as regras de src/lib/treinamentos/index.ts.
 */
export function InfoTreinamentos() {
  return (
    <InfoIndicador titulo="Como funciona o registro de treinamentos">
      <div className="space-y-3 text-sm leading-relaxed">
        <p>
          Cada <strong>treinamento</strong> tem nome, data, duração e um responsável. Ao criar,
          o sistema gera um <strong>QR Code</strong> para a lista de presença.
        </p>
        <p>
          Quem participou <strong>escaneia o QR</strong>, informa o <strong>CPF</strong> e confirma.
          O sistema identifica o colaborador pelo CPF e registra a presença — nome, cargo e unidade
          aparecem automaticamente.
        </p>
        <ul className="list-disc pl-5 space-y-1">
          <li>
            <strong>Uma presença por pessoa.</strong> Confirmar o mesmo CPF duas vezes não conta em dobro.
          </li>
          <li>
            <strong>CPF não localizado:</strong> se a pessoa ainda não está no cadastro, a presença é
            registrada mesmo assim e marcada para o responsável confirmar depois. Ninguém fica de fora.
          </li>
          <li>
            <strong>Encerrar:</strong> enquanto o treinamento está aberto, o QR aceita novas presenças.
            Ao <strong>encerrar</strong>, a lista é fechada e o QR não aceita mais ninguém.
          </li>
        </ul>
        <p className="text-navy/70">
          Exemplo: um treinamento de 2h com 10 pessoas na sala gera 10 presenças — cada uma
          confirmando o próprio CPF no QR.
        </p>
      </div>
    </InfoIndicador>
  )
}
```

- [ ] **Step 3: Verificar compilação** (ajustar props se `InfoIndicador` usar nomes diferentes de `titulo`/children)

Run: `npx tsc --noEmit`
Expected: sem erros.

- [ ] **Step 4: Commit**

```bash
git add src/components/treinamentos/InfoTreinamentos.tsx
git commit -m "feat(treinamentos): botao info em linguagem de negocio"
```

---

## Task 10: QR + componentes de criação e config

**Files:**
- Create: `src/components/treinamentos/QrTreinamento.tsx`
- Create: `src/components/treinamentos/ConfigResponsaveis.tsx`
- Create: `src/components/treinamentos/CriarTreinamento.tsx`

- [ ] **Step 1: `QrTreinamento.tsx`** (client — QR do link público com copiar/abrir/imprimir)

```tsx
"use client"

import { QRCodeCanvas } from "qrcode.react"
import { useState } from "react"
import { Button } from "@/components/ui/button"

/** URL pública do treinamento a partir do token (usa a origem atual). */
function urlPublica(token: string): string {
  if (typeof window === "undefined") return `/t/${token}`
  return `${window.location.origin}/t/${token}`
}

export function QrTreinamento({ token, nome }: { token: string; nome: string }) {
  const url = urlPublica(token)
  const [copiado, setCopiado] = useState(false)

  async function copiar() {
    await navigator.clipboard.writeText(url)
    setCopiado(true)
    setTimeout(() => setCopiado(false), 1500)
  }

  function imprimir() {
    const janela = window.open("", "_blank", "width=480,height=640")
    if (!janela) return
    janela.document.write(
      `<html><head><title>${nome}</title></head><body style="font-family:sans-serif;text-align:center;padding:24px">
       <h2>${nome}</h2><p>Aponte a câmera para registrar presença</p>
       <img src="${(document.querySelector("#qr-treino canvas") as HTMLCanvasElement)?.toDataURL()}" style="width:280px"/>
       <p style="font-size:12px;color:#555">${url}</p></body></html>`,
    )
    janela.document.close()
    janela.focus()
    janela.print()
  }

  return (
    <div className="glass rounded-3xl p-6 space-y-4 text-center">
      <div id="qr-treino" className="flex justify-center">
        <QRCodeCanvas value={url} size={200} includeMargin />
      </div>
      <p className="text-xs text-navy/60 break-all">{url}</p>
      <div className="flex gap-2 justify-center">
        <Button variant="outline" onClick={copiar}>{copiado ? "Copiado!" : "Copiar link"}</Button>
        <Button variant="outline" onClick={() => window.open(url, "_blank")}>Abrir</Button>
        <Button variant="outline" onClick={imprimir}>Imprimir</Button>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: `ConfigResponsaveis.tsx`** (client — diálogo para gerenciar a lista)

```tsx
"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

type Responsavel = { id: string; nome: string }

export function ConfigResponsaveis({ responsaveis }: { responsaveis: Responsavel[] }) {
  const router = useRouter()
  const [aberto, setAberto] = useState(false)
  const [nome, setNome] = useState("")
  const [erro, setErro] = useState<string | null>(null)

  async function adicionar() {
    setErro(null)
    const resp = await fetch("/api/treinamentos/responsaveis", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ nome }),
    })
    if (!resp.ok) {
      setErro((await resp.json()).error ?? "Erro ao adicionar")
      return
    }
    setNome("")
    router.refresh()
  }

  async function remover(id: string) {
    await fetch(`/api/treinamentos/responsaveis/${id}`, { method: "DELETE" })
    router.refresh()
  }

  if (!aberto) {
    return <Button variant="outline" onClick={() => setAberto(true)}>Configurar responsáveis</Button>
  }

  return (
    <div className="glass rounded-3xl p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-navy">Responsáveis</h3>
        <Button variant="ghost" onClick={() => setAberto(false)}>Fechar</Button>
      </div>
      <div className="flex gap-2">
        <Input placeholder="Nome do responsável" value={nome} onChange={(e) => setNome(e.target.value)} />
        <Button onClick={adicionar} disabled={!nome.trim()}>Adicionar</Button>
      </div>
      {erro && <p className="text-sm text-red-600">{erro}</p>}
      <ul className="space-y-1">
        {responsaveis.map((r) => (
          <li key={r.id} className="flex items-center justify-between text-navy">
            <span>{r.nome}</span>
            <Button variant="ghost" onClick={() => remover(r.id)}>Remover</Button>
          </li>
        ))}
        {responsaveis.length === 0 && <li className="text-sm text-navy/60">Nenhum responsável cadastrado ainda.</li>}
      </ul>
    </div>
  )
}
```

- [ ] **Step 3: `CriarTreinamento.tsx`** (client — form de criação com dropdown de responsável)

```tsx
"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

type Responsavel = { id: string; nome: string }

export function CriarTreinamento({ responsaveis }: { responsaveis: Responsavel[] }) {
  const router = useRouter()
  const [nome, setNome] = useState("")
  const [data, setData] = useState("")
  const [duracaoHoras, setDuracao] = useState("")
  const [responsavelId, setResponsavelId] = useState("")
  const [erro, setErro] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  async function criar(e: React.FormEvent) {
    e.preventDefault()
    setErro(null)
    setEnviando(true)
    try {
      const resp = await fetch("/api/treinamentos", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ nome, data, duracaoHoras, responsavelId }),
      })
      const dados = await resp.json()
      if (!resp.ok) {
        setErro(dados.error ?? "Erro ao criar")
        return
      }
      router.push(`/dashboards/rh/treinamentos/${dados.id}`)
    } finally {
      setEnviando(false)
    }
  }

  return (
    <form onSubmit={criar} className="glass rounded-3xl p-6 space-y-4">
      <h3 className="font-semibold text-navy">Novo treinamento</h3>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1 sm:col-span-2">
          <Label htmlFor="nome">Nome</Label>
          <Input id="nome" value={nome} onChange={(e) => setNome(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="data">Data</Label>
          <Input id="data" type="date" value={data} onChange={(e) => setData(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="dur">Duração (horas)</Label>
          <Input id="dur" type="number" step="0.5" min="0.5" value={duracaoHoras} onChange={(e) => setDuracao(e.target.value)} />
        </div>
        <div className="space-y-1 sm:col-span-2">
          <Label htmlFor="resp">Responsável</Label>
          <select
            id="resp"
            className="w-full rounded-xl border border-navy/20 bg-white/80 px-3 py-2 text-navy"
            value={responsavelId}
            onChange={(e) => setResponsavelId(e.target.value)}
          >
            <option value="">Selecione…</option>
            {responsaveis.map((r) => (
              <option key={r.id} value={r.id}>{r.nome}</option>
            ))}
          </select>
        </div>
      </div>
      {erro && <p className="text-sm text-red-600">{erro}</p>}
      <Button type="submit" disabled={enviando || !responsavelId}>
        {enviando ? "Criando..." : "Criar e gerar QR"}
      </Button>
    </form>
  )
}
```

- [ ] **Step 4: Verificar compilação**

Run: `npx tsc --noEmit`
Expected: sem erros. (Se `Button`/`Input`/`Label` tiverem props diferentes das usadas, ajustar conforme `src/components/ui/*`.)

- [ ] **Step 5: Commit**

```bash
git add src/components/treinamentos/QrTreinamento.tsx src/components/treinamentos/ConfigResponsaveis.tsx src/components/treinamentos/CriarTreinamento.tsx
git commit -m "feat(treinamentos): componentes de QR, criacao e config de responsaveis"
```

---

## Task 11: Tabela de presença + páginas do dashboard

**Files:**
- Create: `src/components/treinamentos/TabelaPresenca.tsx`
- Create: `src/app/dashboards/rh/treinamentos/page.tsx`
- Create: `src/app/dashboards/rh/treinamentos/[id]/page.tsx`

- [ ] **Step 1: `TabelaPresenca.tsx`** (server-friendly — só apresentação)

```tsx
import { tituloNome } from "@/lib/nomes"

type Presenca = {
  id: string
  nomeColab: string | null
  crNome: string | null
  cargo: string | null
  matricula: string | null
  localizadoNaSra: boolean
  confirmadoEm: Date
}

export function TabelaPresenca({ presencas }: { presencas: Presenca[] }) {
  if (presencas.length === 0) {
    return <p className="text-sm text-navy/60">Nenhuma presença registrada ainda.</p>
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm text-navy">
        <thead className="text-left text-navy/60">
          <tr>
            <th className="py-2 pr-4">Colaborador</th>
            <th className="py-2 pr-4">Unidade (CR)</th>
            <th className="py-2 pr-4">Cargo</th>
            <th className="py-2 pr-4">Matrícula</th>
            <th className="py-2 pr-4">Horário</th>
          </tr>
        </thead>
        <tbody>
          {presencas.map((p) => (
            <tr key={p.id} className="border-t border-navy/10">
              <td className="py-2 pr-4">
                {p.localizadoNaSra ? (
                  tituloNome(p.nomeColab ?? "")
                ) : (
                  <span className="inline-flex items-center gap-2">
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-800">
                      não localizado na SRA
                    </span>
                  </span>
                )}
              </td>
              <td className="py-2 pr-4">{p.crNome ? tituloNome(p.crNome) : "—"}</td>
              <td className="py-2 pr-4">{p.cargo ? tituloNome(p.cargo) : "—"}</td>
              <td className="py-2 pr-4">{p.matricula ?? "—"}</td>
              <td className="py-2 pr-4">
                {new Date(p.confirmadoEm).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
```

Nota: confirmar que `tituloNome` existe em `src/lib/nomes.ts` (o CLAUDE.md cita esse formatador). Se o nome do export for outro, ajustar o import.

- [ ] **Step 2: `src/app/dashboards/rh/treinamentos/page.tsx`** (lista + criar + config)

```tsx
import { assertTelaVisivel } from "@/lib/dashboard-acesso"
import { listarTreinamentos, listarResponsaveis } from "@/lib/treinamentos"
import { CriarTreinamento } from "@/components/treinamentos/CriarTreinamento"
import { ConfigResponsaveis } from "@/components/treinamentos/ConfigResponsaveis"
import { InfoTreinamentos } from "@/components/treinamentos/InfoTreinamentos"
import Link from "next/link"

export const dynamic = "force-dynamic"

export default async function TreinamentosPage() {
  await assertTelaVisivel("treinamentos-registro")
  const [treinamentos, responsaveis] = await Promise.all([listarTreinamentos(), listarResponsaveis()])

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <h1 className="text-2xl font-semibold text-navy">Treinamentos</h1>
        <InfoTreinamentos />
      </div>

      <ConfigResponsaveis responsaveis={responsaveis} />
      <CriarTreinamento responsaveis={responsaveis} />

      <div className="glass rounded-3xl p-6">
        <h3 className="mb-4 font-semibold text-navy">Treinamentos registrados</h3>
        {treinamentos.length === 0 ? (
          <p className="text-sm text-navy/60">Nenhum treinamento criado ainda.</p>
        ) : (
          <ul className="divide-y divide-navy/10">
            {treinamentos.map((t) => (
              <li key={t.id} className="flex items-center justify-between py-3">
                <Link href={`/dashboards/rh/treinamentos/${t.id}`} className="text-navy hover:text-teal">
                  <span className="font-medium">{t.nome}</span>
                  <span className="ml-2 text-sm text-navy/60">
                    {new Date(t.data).toLocaleDateString("pt-BR", { timeZone: "UTC" })} · {t.duracaoHoras}h ·{" "}
                    {t.responsavel} · {t.presencas} presença(s)
                  </span>
                </Link>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs ${
                    t.status === "ABERTO" ? "bg-teal/10 text-teal" : "bg-navy/10 text-navy/70"
                  }`}
                >
                  {t.status === "ABERTO" ? "Aberto" : "Encerrado"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: `src/app/dashboards/rh/treinamentos/[id]/page.tsx`** (detalhe + QR + presença + encerrar)

```tsx
import { notFound } from "next/navigation"
import { assertTelaVisivel } from "@/lib/dashboard-acesso"
import { getTreinamentoComPresencas } from "@/lib/treinamentos"
import { QrTreinamento } from "@/components/treinamentos/QrTreinamento"
import { TabelaPresenca } from "@/components/treinamentos/TabelaPresenca"
import { InfoTreinamentos } from "@/components/treinamentos/InfoTreinamentos"
import { EncerrarTreinamento } from "@/components/treinamentos/EncerrarTreinamento"

export const dynamic = "force-dynamic"

export default async function DetalheTreinamentoPage({ params }: { params: { id: string } }) {
  await assertTelaVisivel("treinamentos-registro")
  const t = await getTreinamentoComPresencas(params.id)
  if (!t) notFound()

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <h1 className="text-2xl font-semibold text-navy">{t.nome}</h1>
        <InfoTreinamentos />
      </div>
      <p className="text-sm text-navy/70">
        {new Date(t.data).toLocaleDateString("pt-BR", { timeZone: "UTC" })} · {t.duracaoHoras}h · {t.responsavel} ·{" "}
        {t.status === "ABERTO" ? "Aberto" : "Encerrado"}
      </p>

      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <div className="space-y-4">
          {t.status === "ABERTO" && <QrTreinamento token={t.tokenPublico} nome={t.nome} />}
          {t.status === "ABERTO" && <EncerrarTreinamento id={t.id} />}
        </div>
        <div className="glass rounded-3xl p-6">
          <h3 className="mb-4 font-semibold text-navy">Lista de presença ({t.presencas.length})</h3>
          <TabelaPresenca presencas={t.presencas} />
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Criar o pequeno client `EncerrarTreinamento`** em `src/components/treinamentos/EncerrarTreinamento.tsx`

```tsx
"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"

export function EncerrarTreinamento({ id }: { id: string }) {
  const router = useRouter()
  const [confirmando, setConfirmando] = useState(false)

  async function encerrar() {
    setConfirmando(true)
    await fetch(`/api/treinamentos/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status: "ENCERRADO" }),
    })
    router.refresh()
  }

  return (
    <Button variant="outline" onClick={encerrar} disabled={confirmando}>
      {confirmando ? "Encerrando..." : "Encerrar treinamento"}
    </Button>
  )
}
```

- [ ] **Step 5: Adicionar o import do `EncerrarTreinamento`** — já referenciado no Step 3; garanta que o arquivo do Step 4 existe antes de compilar.

- [ ] **Step 6: Verificar compilação + build**

Run: `npx tsc --noEmit` e depois `npm run build`
Expected: ambos sem erros.

- [ ] **Step 7: Commit**

```bash
git add src/components/treinamentos/TabelaPresenca.tsx src/components/treinamentos/EncerrarTreinamento.tsx src/app/dashboards/rh/treinamentos
git commit -m "feat(treinamentos): paginas do dashboard (lista, detalhe, QR, presenca, encerrar)"
```

---

## Task 12: Verificação de ponta a ponta (manual, com dados)

**Files:** nenhum (verificação).

- [ ] **Step 1: Subir o dev server** via `.claude/launch.json` (`hub-inhaus-dev`, porta 3000). Nunca por outros meios. Se o CSS/HMR travar: parar, apagar `.next`, subir de novo.

- [ ] **Step 2: Fluxo interno** — abrir `/dashboards/rh/treinamentos`. Cadastrar um responsável pelo botão "Configurar responsáveis". Criar um treinamento (nome, data, duração, responsável). Confirmar que redireciona ao detalhe e mostra o QR.

- [ ] **Step 3: Fluxo público** — abrir o link do QR (`/t/<token>`) em aba anônima. Digitar um CPF que exista no quadro ativo da SRA e confirmar. Verificar a mensagem de sucesso com o nome.

- [ ] **Step 4: Conferir no banco** os números:

Run: `npx dotenv -e .env.local -- psql "$env:DATABASE_URL" -c "select nome_colab, cr_cod, localizado_na_sra from treinamento_presenca order by confirmado_em desc limit 5;"`
Expected: a linha do CPF testado, `localizado_na_sra = true`, com CR preenchido.

- [ ] **Step 5: Casos de borda** — (a) confirmar o mesmo CPF de novo → mensagem "Presença já registrada", sem duplicar (conferir `count` no banco). (b) CPF inexistente na SRA → presença gravada com `localizado_na_sra = false` e badge "não localizado" na tabela. (c) Encerrar o treinamento → abrir `/t/<token>` deve mostrar "já foi encerrado" e o POST retornar 409.

- [ ] **Step 6: Commit final (se houver ajuste)** e encerrar.

```bash
git add -A
git commit -m "chore(treinamentos): ajustes da verificacao end-to-end"
```

---

## Self-Review (feito pelo autor do plano)

- **Cobertura do spec:** modelo de dados (Task 1) · escopo interno/permissão (Tasks 5,8,11 `assertTelaVisivel`) · CPF não encontrado = registra (Task 4 `localizadoNaSra`) · sem amarra por CR (Task 3) · QR aberto até encerrar (Tasks 4,7,11) · idempotência (Task 4 unique + `jaEstava`) · responsável de lista própria (Tasks 1,4,6,10) · botão info (Task 9) · rota pública `/t/[token]` (Task 7) · gancho de indicador = base pronta, fora de escopo (não há task, correto). Todos os itens do spec têm task.
- **Placeholders:** nenhum "TODO"/"depois" nas etapas; todo passo de código mostra o código.
- **Consistência de tipos:** `confirmarPresenca`/`resolverTreinamentoPublico`/`getTreinamentoComPresencas` (Task 4) batem com os usos nas Tasks 6, 7 e 11; a chave composta `treinamentoId_cpfHash` (Task 4) corresponde ao `@@unique([treinamentoId, cpfHash])` (Task 1); campos da `TabelaPresenca` (Task 11) batem com o retorno de `getTreinamentoComPresencas`.
- **Pontos a validar na execução** (marcados nas tasks): assinaturas reais de `InhausLogo`, `InfoIndicador`, `Button/Input/Label` e `tituloNome` — ajustar imports/props se divergirem.
