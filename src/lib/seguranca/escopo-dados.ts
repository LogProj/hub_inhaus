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

import { prisma } from "@/lib/prisma"

/** Deriva o código de 5 chars a partir do CR bruto (texto da SRA ou já o código). */
export function codigoCr(crBruto: string | null | undefined): string | null {
  if (!crBruto) return null
  const cod = crBruto.split(" - ")[0]?.trim() ?? ""
  if (!cod) return null
  return cod.length < 5 ? cod.padStart(5, "0") : cod
}

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

/**
 * TRAVA 2 (independente da Trava 1): confere que TODA linha retornada tem código de
 * CR dentro do escopo. Se alguma escapar, LANÇA. Linhas com CR nulo são ignoradas
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
