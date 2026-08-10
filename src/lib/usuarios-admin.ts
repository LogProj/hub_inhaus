// Gestão de usuários do hub (tela de administração).
//
// FRONTEIRA: identidade × autorização.
//  - Identidade (nome/e-mail/CPF/senha/ativo global) vive no global_auth. Aqui só
//    LISTAMOS (Bearer do admin) e CRIAMOS (X-Api-Key) — nunca editamos/excluímos a
//    identidade global a partir do projeto.
//  - Autorização (quem tem acesso a ESTE hub, se é admin, e quais telas vê) é regra
//    do projeto e vive em `auth_users` (banco local). É o que o admin concede aqui.
//
// Módulo server-only.

import { prisma } from "@/lib/prisma"
import {
  listGlobalAuthUsers,
  createGlobalAuthUser,
  GlobalAuthError,
  normalizeEmail,
  type GlobalAuthUser,
} from "@/lib/global-auth"
import { sanitizarTelas } from "@/lib/domains"
import { definirSegurancaCentral, listarAuthUserIdsSeguranca } from "@/lib/epi/config"

export type UsuarioAdmin = {
  authUserId: string | null
  name: string | null
  email: string
  cpf: string | null
  type: string | null
  /** Ativo no global_auth (identidade). */
  isActive: boolean
  // --- acesso LOCAL deste projeto (autorização) ---
  hasAccess: boolean
  isAdmin: boolean
  visibleScreens: string[]
  /** Papel Segurança (SST central) — configura o módulo de EPI. */
  ehSeguranca: boolean
}

/** Mescla as identidades do global_auth com o acesso local (auth_users). */
export async function listarUsuariosAdmin(accessToken: string): Promise<UsuarioAdmin[]> {
  const [globais, locais, segurancaIds] = await Promise.all([
    listGlobalAuthUsers(accessToken),
    prisma.authUser.findMany(),
    listarAuthUserIdsSeguranca(),
  ])
  const porEmail = new Map(locais.map((l) => [l.email.toLowerCase(), l]))
  const porUuid = new Map(
    locais.filter((l) => l.authUserId).map((l) => [l.authUserId as string, l]),
  )
  return globais
    .map((g): UsuarioAdmin => {
      const local = porUuid.get(g.id) ?? porEmail.get(normalizeEmail(g.email))
      return {
        authUserId: g.id,
        name: g.name ?? local?.name ?? null,
        email: g.email,
        cpf: g.cpf ?? null,
        type: (g.type as string) ?? null,
        isActive: g.isActive,
        hasAccess: local?.hasAccess ?? false,
        isAdmin: local?.isAdmin ?? false,
        visibleScreens: local?.visibleScreens ?? [],
        ehSeguranca: segurancaIds.has(g.id),
      }
    })
    .sort((a, b) => (a.name ?? a.email).localeCompare(b.name ?? b.email, "pt-BR"))
}

/**
 * Cria a IDENTIDADE no global_auth (ou reusa, se o e-mail já existir lá) e espelha
 * o ACESSO local. Criar identidade não concede acesso — o acesso é o registro local.
 */
export async function criarUsuarioAdmin(input: {
  name: string
  email: string
  cpf: string
  password: string
  isAdmin: boolean
  hasAccess: boolean
  visibleScreens: string[]
  seguranca: boolean
}): Promise<UsuarioAdmin> {
  const email = normalizeEmail(input.email)
  let identidade: GlobalAuthUser | null = null
  try {
    identidade = await createGlobalAuthUser({
      name: input.name,
      email,
      cpf: input.cpf,
      password: input.password,
      type: "INTERNAL",
    })
  } catch (e) {
    // E-mail já existe no global_auth (conflito): não recria a identidade, apenas
    // concede o acesso local. Outros erros sobem.
    if (e instanceof GlobalAuthError && (e.status === 409 || e.status === 422)) {
      identidade = null
    } else {
      throw e
    }
  }

  const telas = sanitizarTelas(input.visibleScreens)
  const local = await prisma.authUser.upsert({
    where: { email },
    update: {
      authUserId: identidade?.id ?? undefined,
      name: input.name,
      isAdmin: input.isAdmin,
      hasAccess: input.hasAccess,
      visibleScreens: telas,
    },
    create: {
      email,
      authUserId: identidade?.id ?? null,
      name: input.name,
      isAdmin: input.isAdmin,
      hasAccess: input.hasAccess,
      visibleScreens: telas,
    },
  })

  // Papel Segurança precisa do UUID do global_auth (chave de epi_membro).
  const uuid = local.authUserId ?? identidade?.id ?? null
  const ehSeg = Boolean(uuid && input.seguranca)
  if (uuid && input.seguranca) await definirSegurancaCentral(uuid, true)

  return {
    authUserId: uuid,
    name: local.name,
    email: local.email,
    cpf: identidade?.cpf ?? input.cpf,
    type: (identidade?.type as string) ?? "INTERNAL",
    isActive: identidade?.isActive ?? true,
    hasAccess: local.hasAccess,
    isAdmin: local.isAdmin,
    visibleScreens: local.visibleScreens,
    ehSeguranca: ehSeg,
  }
}

/**
 * Atualiza SÓ o acesso LOCAL (autorização do projeto): concede/revoga acesso ao
 * hub, define admin e escolhe as telas visíveis. NUNCA toca na identidade global.
 */
export async function atualizarAcessoLocal(input: {
  email: string
  authUserId?: string | null
  name?: string | null
  hasAccess: boolean
  isAdmin: boolean
  visibleScreens: string[]
  seguranca?: boolean
}): Promise<UsuarioAdmin> {
  const email = normalizeEmail(input.email)
  const telas = sanitizarTelas(input.visibleScreens)
  const local = await prisma.authUser.upsert({
    where: { email },
    update: {
      hasAccess: input.hasAccess,
      isAdmin: input.isAdmin,
      visibleScreens: telas,
      authUserId: input.authUserId ?? undefined,
      name: input.name ?? undefined,
    },
    create: {
      email,
      authUserId: input.authUserId ?? null,
      name: input.name ?? null,
      hasAccess: input.hasAccess,
      isAdmin: input.isAdmin,
      visibleScreens: telas,
    },
  })

  // Papel Segurança (só dá para amarrar se o usuário tem UUID do global_auth).
  const uuid = local.authUserId ?? input.authUserId ?? null
  let ehSeg = false
  if (uuid && input.seguranca !== undefined) {
    await definirSegurancaCentral(uuid, input.seguranca)
    ehSeg = input.seguranca
  }

  return {
    authUserId: uuid,
    name: local.name,
    email: local.email,
    cpf: null,
    type: null,
    isActive: true,
    hasAccess: local.hasAccess,
    isAdmin: local.isAdmin,
    visibleScreens: local.visibleScreens,
    ehSeguranca: ehSeg,
  }
}
