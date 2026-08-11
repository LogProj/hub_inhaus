import { prisma } from "@/lib/prisma"
import type { AcessoEpi } from "@/lib/epi/papeis"

/**
 * ESCOPO de acesso do módulo de EPI: QUEM enxerga os dados de QUEM.
 *
 * Toda query de EPI que expõe dados de operação deve passar por aqui, para que o
 * líder do turno A não veja o turno B, e o parametrizador só atue no seu escopo.
 * Admin ignora escopo (enxerga tudo). Regra central:
 *  - LIDER: os turnos onde é responsável VIGENTE (fimEm null).
 *  - PARAMETRIZADOR: os clientes/CRs da sua membership (null = sem restrição).
 *  - ADMIN: tudo.
 *
 * Vínculos usam vigência (fimEm) em vez de delete, preservando o histórico
 * ("quem era líder em julho").
 *
 * Módulo server-only.
 */

export type EscopoUsuario = {
  verTudo: boolean
  /** Turnos que o usuário valida como líder (vigentes). */
  turnoIdsComoLider: number[]
  /** Clientes que o parametrizador alcança (vazio + verTudo=false = nenhum). */
  clienteIds: number[] | "todos"
  /** CRs que o parametrizador alcança. */
  crs: string[] | "todos"
}

/**
 * Pode acessar a área de validações? Admin (vê tudo) ou quem é responsável
 * (líder) de ao menos um turno vigente. Ser responsável de um turno JÁ habilita a
 * validação — não exige um papel separado.
 */
export function podeVerValidacoes(escopo: EscopoUsuario): boolean {
  return escopo.verTudo || escopo.turnoIdsComoLider.length > 0
}

/**
 * Turnos que o usuário pode validar como líder. Deriva dos CRs que ele lidera
 * (`LiderCr` vigente → todos os turnos daqueles CRs) e, por compatibilidade,
 * também de responsáveis por turno específico (`ResponsavelTurno` vigente).
 */
export async function getTurnoIdsDoLider(authUserId: string | null | undefined): Promise<number[]> {
  if (!authUserId) return []

  const [lideres, responsaveis] = await Promise.all([
    prisma.liderCr.findMany({ where: { authUserId, fimEm: null }, select: { clienteId: true, cr: true } }),
    prisma.responsavelTurno.findMany({ where: { authUserId, fimEm: null }, select: { turnoId: true } }),
  ])

  const ids = new Set<number>(responsaveis.map((r) => r.turnoId))

  if (lideres.length > 0) {
    const turnos = await prisma.turno.findMany({
      where: { OR: lideres.map((l) => ({ clienteId: l.clienteId, cr: l.cr })) },
      select: { id: true },
    })
    for (const t of turnos) ids.add(t.id)
  }

  return Array.from(ids)
}

/**
 * Escopo consolidado do usuário. `verTudo` para admin. Para parametrizador,
 * consolida os eixos cliente/CR da membership (qualquer membership sem restrição
 * naquele eixo libera o eixo inteiro).
 */
export async function escopoDoUsuario(
  acesso: AcessoEpi,
  authUserId: string | null | undefined,
): Promise<EscopoUsuario> {
  // Admin e Segurança central enxergam tudo (Segurança é o time de SST que
  // configura e acompanha todos os CRs).
  if (acesso.isAdmin || acesso.papeis.has("SEGURANCA")) {
    return { verTudo: true, turnoIdsComoLider: [], clienteIds: "todos", crs: "todos" }
  }

  // Ser líder é definido por LiderCr (tela de Líderes), NÃO por epi_membro. Então
  // sempre resolvemos os turnos que o usuário lidera — quem tem LiderCr vigente de
  // um CR com turnos passa a validar/preencher a Utilização daquele CR.
  const turnoIdsComoLider = authUserId ? await getTurnoIdsDoLider(authUserId) : []

  const paramMembros = acesso.membros.filter((m) => m.papel === "PARAMETRIZADOR")
  const semRestricaoCliente = paramMembros.some((m) => m.clienteId == null)
  const semRestricaoCr = paramMembros.some((m) => m.cr == null)

  const clienteIds: number[] | "todos" = paramMembros.length === 0
    ? []
    : semRestricaoCliente
      ? "todos"
      : Array.from(new Set(paramMembros.map((m) => m.clienteId).filter((v): v is number => v != null)))

  const crs: string[] | "todos" = paramMembros.length === 0
    ? []
    : semRestricaoCr
      ? "todos"
      : Array.from(new Set(paramMembros.map((m) => m.cr).filter((v): v is string => v != null)))

  return { verTudo: false, turnoIdsComoLider, clienteIds, crs }
}

/** O usuário pode atuar como parametrizador sobre este cliente/CR? */
export function parametrizadorAlcanca(
  escopo: EscopoUsuario,
  alvo: { clienteId?: number; cr?: string },
): boolean {
  if (escopo.verTudo) return true
  const okCliente =
    escopo.clienteIds === "todos" ||
    (alvo.clienteId != null && escopo.clienteIds.includes(alvo.clienteId))
  const okCr = escopo.crs === "todos" || (alvo.cr != null && escopo.crs.includes(alvo.cr))
  // A membership pode restringir por cliente, por CR, ou ambos; exigimos que os
  // eixos informados estejam dentro do alcance.
  const clienteInformado = alvo.clienteId != null
  const crInformado = alvo.cr != null
  return (!clienteInformado || okCliente) && (!crInformado || okCr) && (okCliente || okCr)
}
