import { prisma } from "@/lib/prisma"

/**
 * Papéis do módulo de EPI.
 *
 * Regra de negócio:
 *  - ADMIN: usa o `isAdmin` global do AuthUser; configura tudo. Não tem linha em
 *    `epi_membro`.
 *  - SEGURANCA: time central de SST — configura tudo (CRs, turnos, checklists,
 *    nomeia líderes) SEM ser admin do hub. É concedido na tela de Usuários. Central
 *    (sem escopo por cliente/CR).
 *  - PARAMETRIZADOR: papel legado (escopo por cliente/CR). Mantido por
 *    compatibilidade; a concessão nova usa SEGURANCA.
 *  - LIDER: valida o turno pelo qual é responsável.
 *  Um usuário pode acumular papéis. PARAMETRIZADOR/LIDER podem ter escopo por
 *  cliente e/ou CR (null = sem restrição naquele eixo).
 *
 * Módulo server-only (usa Prisma).
 */

export type PapelEpi = "ADMIN" | "SEGURANCA" | "PARAMETRIZADOR" | "LIDER"

export type MembroEpi = {
  papel: Exclude<PapelEpi, "ADMIN">
  clienteId: number | null
  cr: string | null
}

export type AcessoEpi = {
  isAdmin: boolean
  papeis: Set<PapelEpi>
  membros: MembroEpi[]
}

/** Memberships ativas de EPI de um usuário do global_auth. */
export async function getMembrosEpi(authUserId: string | null | undefined): Promise<MembroEpi[]> {
  if (!authUserId) return []
  const linhas = await prisma.epiMembro.findMany({
    where: { authUserId, ativo: true },
    select: { papel: true, clienteId: true, cr: true },
  })
  return linhas
    .filter((l): l is typeof l & { papel: "SEGURANCA" | "PARAMETRIZADOR" | "LIDER" } =>
      l.papel === "SEGURANCA" || l.papel === "PARAMETRIZADOR" || l.papel === "LIDER",
    )
    .map((l) => ({ papel: l.papel, clienteId: l.clienteId, cr: l.cr }))
}

/**
 * Resolve o acesso de EPI do usuário atual, combinando o admin global com as
 * memberships. É por aqui que as telas decidem o que mostrar.
 */
export async function resolverAcessoEpi(usuario: {
  authUserId: string | null | undefined
  isAdmin: boolean
}): Promise<AcessoEpi> {
  const membros = usuario.isAdmin ? [] : await getMembrosEpi(usuario.authUserId)
  const papeis = new Set<PapelEpi>()
  if (usuario.isAdmin) papeis.add("ADMIN")
  for (const m of membros) papeis.add(m.papel)
  return { isAdmin: usuario.isAdmin, papeis, membros }
}

/** Atalhos de leitura de papel. Admin implica todos os poderes. */
export function podeParametrizar(acesso: AcessoEpi): boolean {
  return acesso.isAdmin || acesso.papeis.has("PARAMETRIZADOR")
}

export function podeValidar(acesso: AcessoEpi): boolean {
  return acesso.isAdmin || acesso.papeis.has("LIDER")
}

export function podeConfigurar(acesso: AcessoEpi): boolean {
  // Configurar EPI = admin do hub OU time de Segurança (SST central).
  return acesso.isAdmin || acesso.papeis.has("SEGURANCA")
}

/** É Segurança central (configura EPI sem ser admin do hub)? */
export function ehSeguranca(acesso: AcessoEpi): boolean {
  return acesso.papeis.has("SEGURANCA")
}
