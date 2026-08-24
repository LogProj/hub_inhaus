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
  classificacao: string
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
