/**
 * Resolve o escopo de contratante do usuário atual (server-side) A PARTIR DAS TELAS
 * CONCEDIDAS: quem enxerga as telas de um cliente (ex.: Atlas) vê os dados daquele
 * cliente. Admin INTERNO vê tudo. Sem tela de cliente ⇒ nada (fail-closed).
 * Não depende mais de vínculo de contratante em tabela. Server-only.
 */
import { prisma } from "@/lib/prisma"
import { getUsuarioAtual } from "@/lib/epi/guardas"
import { TODAS_AS_TELAS } from "@/lib/domains"
import type { EscopoContratante } from "@/lib/seguranca/escopo-contratante"

export async function escopoContratanteAtual(): Promise<{
  escopo: EscopoContratante
  autor: string | null
}> {
  const u = await getUsuarioAtual()
  const autor = u ? (u.nome ?? u.email ?? null) : null
  if (!u) return { escopo: { tipo: "lista", ids: [] }, autor }

  // Acesso livre de dev (authUserId null + admin) enxerga tudo.
  if (!u.authUserId) {
    return { escopo: u.isAdmin ? { tipo: "todos" } : { tipo: "lista", ids: [] }, autor }
  }

  const row = await prisma.authUser.findUnique({
    where: { authUserId: u.authUserId },
    select: { classificacao: true, visibleScreens: true },
  })
  const ehCliente = row?.classificacao === "CLIENTE"

  // Admin interno vê tudo; cliente nunca vê tudo.
  if (u.isAdmin && !ehCliente) return { escopo: { tipo: "todos" }, autor }

  // Deriva os slugs de cliente a partir das telas de cliente concedidas.
  const concedidas = new Set(row?.visibleScreens ?? [])
  const slugs = Array.from(
    new Set(
      TODAS_AS_TELAS.filter((t) => t.clienteKey && concedidas.has(t.key)).map(
        (t) => t.clienteKey as string,
      ),
    ),
  )
  if (slugs.length === 0) return { escopo: { tipo: "lista", ids: [] }, autor }

  const contratantes = await prisma.clienteContratante.findMany({
    where: { slug: { in: slugs } },
    select: { id: true },
  })
  return { escopo: { tipo: "lista", ids: contratantes.map((c) => c.id) }, autor }
}
