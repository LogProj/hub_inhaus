/**
 * REGRAS DE NEGÓCIO — Desvios (ocorrências) do módulo Clientes.
 *  - Todo acesso passa pelas 2 travas do contratante (escopo-contratante.ts).
 *  - Leitura paginada; escrita grava o contratante do escopo (nunca do cliente).
 * Módulo server-only.
 */
import { Prisma } from "@prisma/client"
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
  /** Mês da data de ocorrência no formato "YYYY-MM". */
  mes?: string | null
  pagina: number
  porPagina: number
}

/** Intervalo [gte, lt) de um mês "YYYY-MM". Null se inválido. */
export function rangeDoMes(mes: string | null | undefined): { gte: Date; lt: Date } | null {
  if (!mes || !/^\d{4}-\d{2}$/.test(mes)) return null
  const [ano, m] = mes.split("-").map(Number)
  if (m < 1 || m > 12) return null
  const gte = new Date(Date.UTC(ano, m - 1, 1))
  const lt = new Date(Date.UTC(m === 12 ? ano + 1 : ano, m === 12 ? 0 : m, 1))
  return { gte, lt }
}

/** Meses (YYYY-MM) com desvios no escopo, do mais recente ao mais antigo. */
export async function mesesDisponiveis(escopo: EscopoContratante): Promise<string[]> {
  if (escopo.tipo === "lista" && escopo.ids.length === 0) return []
  const linhas = await prisma.$queryRaw<{ mes: string }[]>`
    select distinct to_char(data_ocorrencia, 'YYYY-MM') as mes
    from desvio
    where data_ocorrencia is not null
      ${escopo.tipo === "lista" ? Prisma.sql`and contratante_id = any(${escopo.ids}::int[])` : Prisma.empty}
    order by mes desc
  `
  return linhas.map((l) => l.mes)
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
  const rangeMes = rangeDoMes(filtro.mes)
  if (rangeMes) where.dataOcorrencia = { gte: rangeMes.gte, lt: rangeMes.lt }
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

/** Contadores por status, no escopo (opcionalmente recortado por mês YYYY-MM). */
export async function contarPorStatus(
  escopo: EscopoContratante,
  mes?: string | null,
): Promise<Record<string, number>> {
  if (escopo.tipo === "lista" && escopo.ids.length === 0) return {}
  const where: Record<string, unknown> =
    escopo.tipo === "lista" ? { contratanteId: { in: escopo.ids } } : {}
  const rangeMes = rangeDoMes(mes)
  if (rangeMes) where.dataOcorrencia = { gte: rangeMes.gte, lt: rangeMes.lt }
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

// ---------------------------------------------------------------------------
// INDICADORES (dashboard) — todas as agregações são recortadas pelo escopo
// (Trava 1 via `where`). Agregados não expõem contratante linha a linha.
// ---------------------------------------------------------------------------

export type Contagem = { chave: string; total: number }
export type IndicadoresDesvios = {
  total: number
  porStatus: Record<string, number>
  valorTotal: number
  valorPendente: number
  porMotivo: Contagem[]
  porCausaRaiz: Contagem[]
  porCliente: Contagem[]
  porTipo: Contagem[]
  porMes: Contagem[]
}

const VAZIO: IndicadoresDesvios = {
  total: 0,
  porStatus: {},
  valorTotal: 0,
  valorPendente: 0,
  porMotivo: [],
  porCausaRaiz: [],
  porCliente: [],
  porTipo: [],
  porMes: [],
}

/** Where do escopo para agregações Prisma. `null` = escopo vazio (nada a mostrar). */
function whereEscopo(escopo: EscopoContratante): Record<string, unknown> | null {
  if (escopo.tipo === "todos") return {}
  if (escopo.ids.length === 0) return null
  return { contratanteId: { in: escopo.ids } }
}

function contagensDe(
  grupos: { _count: { _all: number }; [k: string]: unknown }[],
  campo: string,
): Contagem[] {
  return grupos
    .map((g) => ({
      chave: (g[campo] as string | null) ?? "(sem informação)",
      total: g._count._all,
    }))
    .sort((a, b) => b.total - a.total)
}

/**
 * Painel de indicadores dos desvios no escopo do usuário. Quando `mes` (YYYY-MM) é
 * informado, TODOS os números respeitam o mês — EXCETO a evolução por mês (`porMes`),
 * que mostra sempre o histórico completo (senão o gráfico de tendência ficaria com um
 * ponto só).
 */
export async function indicadoresDesvios(
  escopo: EscopoContratante,
  mes?: string | null,
): Promise<IndicadoresDesvios> {
  const whereBase = whereEscopo(escopo)
  if (whereBase === null) return VAZIO
  const rangeMes = rangeDoMes(mes)
  const where = rangeMes
    ? { ...whereBase, dataOcorrencia: { gte: rangeMes.gte, lt: rangeMes.lt } }
    : whereBase

  const [total, porStatusRaw, somaTotal, somaPendente, motivos, causas, clientes, tipos, meses] =
    await Promise.all([
      prisma.desvio.count({ where }),
      prisma.desvio.groupBy({ by: ["status"], _count: { _all: true }, where }),
      prisma.desvio.aggregate({ _sum: { valor: true }, where }),
      prisma.desvio.aggregate({
        _sum: { valor: true },
        where: { ...where, status: { not: "CONCLUIDA" } },
      }),
      prisma.desvio.groupBy({ by: ["motivo"], _count: { _all: true }, where }),
      prisma.desvio.groupBy({ by: ["causaRaiz"], _count: { _all: true }, where }),
      prisma.desvio.groupBy({ by: ["clienteFinal"], _count: { _all: true }, where }),
      prisma.desvio.groupBy({ by: ["tipo"], _count: { _all: true }, where }),
      prisma.$queryRaw<{ mes: string; total: bigint }[]>`
        select to_char(data_ocorrencia, 'YYYY-MM') as mes, count(*) as total
        from desvio
        where data_ocorrencia is not null
          ${escopo.tipo === "lista" ? Prisma.sql`and contratante_id = any(${escopo.ids}::int[])` : Prisma.empty}
        group by 1
        order by 1
      `,
    ])

  return {
    total,
    porStatus: Object.fromEntries(porStatusRaw.map((g) => [g.status, g._count._all])),
    valorTotal: Number(somaTotal._sum.valor ?? 0),
    valorPendente: Number(somaPendente._sum.valor ?? 0),
    porMotivo: contagensDe(motivos, "motivo"),
    porCausaRaiz: contagensDe(causas, "causaRaiz"),
    porCliente: contagensDe(clientes, "clienteFinal").slice(0, 10),
    porTipo: contagensDe(tipos, "tipo"),
    porMes: meses.map((m) => ({ chave: m.mes, total: Number(m.total) })),
  }
}
