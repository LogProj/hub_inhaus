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
export async function contarPorStatus(
  escopo: EscopoContratante,
): Promise<Record<string, number>> {
  if (escopo.tipo === "lista" && escopo.ids.length === 0) return {}
  const where = escopo.tipo === "lista" ? { contratanteId: { in: escopo.ids } } : {}
  const grupos = await prisma.desvio.groupBy({
    by: ["status"],
    _count: { _all: true },
    where,
  })
  return Object.fromEntries(grupos.map((g) => [g.status, g._count._all]))
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
