/** Resolve o escopo de contratante do usuário atual (server-side). Server-only. */
import { prisma } from "@/lib/prisma"
import { getUsuarioAtual } from "@/lib/epi/guardas"
import {
  resolverEscopoContratante,
  type EscopoContratante,
} from "@/lib/seguranca/escopo-contratante"

export async function escopoContratanteAtual(): Promise<{
  escopo: EscopoContratante
  autor: string | null
}> {
  const u = await getUsuarioAtual()
  if (!u) return { escopo: { tipo: "lista", ids: [] }, autor: null }
  let classificacao = "INTERNO"
  if (u.authUserId) {
    const row = await prisma.authUser.findUnique({
      where: { authUserId: u.authUserId },
      select: { classificacao: true },
    })
    classificacao = row?.classificacao ?? "INTERNO"
  }
  const escopo = await resolverEscopoContratante({
    authUserId: u.authUserId,
    isAdmin: u.isAdmin,
    classificacao,
  })
  return { escopo, autor: u.nome ?? u.email ?? null }
}
