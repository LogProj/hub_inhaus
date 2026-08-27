import { prisma } from "@/lib/prisma"
import { inhausPool } from "@/lib/db-inhaus"

/**
 * Indicador CONTROLE DE CAPACITAÇÃO (visão gerencial dos treinamentos).
 *
 * Regra de negócio (mantida em sincronia com o texto do botão "info" da tela):
 *  - Cada PRESENÇA confirmada num treinamento conta as HORAS daquele treinamento
 *    (duração) para aquele colaborador. Uma pessoa em 2 treinamentos de 4h soma 8h.
 *  - "Colaboradores treinados" = pessoas DISTINTAS (uma vez cada, mesmo com vários
 *    treinamentos). A identidade é o CPF (hash) — não a matrícula.
 *  - "Horas treinadas" = soma das horas de TODAS as presenças do recorte.
 *  - Filtros de múltipla escolha: mês (data do treinamento), cliente, CR e
 *    responsável. Filtro vazio = todos.
 *  - Cliente e CR vêm da UNIDADE do colaborador no momento da presença (capturada
 *    da SRA). Quem não foi localizado na SRA entra em "Não localizado" nos rankings
 *    por CR/cargo, mas continua contando em pessoas e horas.
 *  - Rankings (CR, cargo, treinamento) e linha do tempo respeitam os filtros.
 *
 * Lê dados do hub (treinamento/presença via Prisma) + o mapa CR→cliente da SRA
 * (dm_cr, via inhausPool). Módulo server-only.
 */

export type Barra = { rotulo: string; total: number; secundario?: number }
export type PontoLinha = { dia: string; total: number }

export type FiltrosCapacitacao = {
  meses: string[] // "YYYY-MM"
  clientes: string[]
  crs: string[] // código de 5 chars
  responsaveis: string[] // id do responsável
}

export type OpcaoRotulo = { valor: string; rotulo: string }

export type OpcoesCapacitacao = {
  meses: OpcaoRotulo[]
  clientes: string[]
  crs: OpcaoRotulo[]
  responsaveis: OpcaoRotulo[]
}

export type LinhaTabelaCapacitacao = {
  id: string
  nome: string
  data: string
  duracaoHoras: number
  responsavel: string
  status: string
  presencas: number
}

export type Capacitacao = {
  colaboradoresTreinados: number
  horasTreinadas: number
  mediaHorasPorColaborador: number
  treinamentosRealizados: number
  treinamentosAbertos: number
  naoLocalizados: number
  linhaMensal: PontoLinha[]
  porCr: Barra[]
  porCargo: Barra[]
  porTreinamento: Barra[]
  tabela: LinhaTabelaCapacitacao[]
  opcoes: OpcoesCapacitacao
}

const MES_ABREV = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"]

function rotuloMes(iso: string): string {
  const [ano, mes] = iso.split("-")
  return `${MES_ABREV[Number(mes) - 1] ?? mes}/${ano}`
}

/** "YYYY-MM" a partir de uma data (em UTC, pois a data é guardada como dia). */
function mesDe(data: Date): string {
  return new Date(data).toISOString().slice(0, 7)
}

/** Mapa CR (5 chars) → nome do grupo cliente, da dimensão de CR da SRA. */
async function mapaClientePorCr(): Promise<Map<string, string>> {
  const { rows } = await inhausPool.query<{ cr: string; nome_grp_cliente: string | null }>(
    "SELECT cr, nome_grp_cliente FROM dm_cr",
  )
  const mapa = new Map<string, string>()
  for (const r of rows) {
    if (r.cr) mapa.set(String(r.cr).trim(), (r.nome_grp_cliente ?? "").trim())
  }
  return mapa
}

/** Ordena barras por total desc e mantém as N primeiras. */
function topBarras(mapa: Map<string, { total: number; secundario: number }>, top = 15): Barra[] {
  return [...mapa.entries()]
    .map(([rotulo, v]) => ({ rotulo, total: Math.round(v.total * 100) / 100, secundario: v.secundario }))
    .sort((a, b) => b.total - a.total)
    .slice(0, top)
}

export async function getControleCapacitacao(filtros: FiltrosCapacitacao): Promise<Capacitacao> {
  const [treinamentos, mapaCliente] = await Promise.all([
    prisma.treinamento.findMany({
      include: { responsavel: true, presencas: true },
      orderBy: { data: "desc" },
    }),
    mapaClientePorCr(),
  ])

  const clienteDoCr = (crCod: string | null): string => {
    if (!crCod) return ""
    return mapaCliente.get(crCod.trim()) ?? ""
  }

  // --- Opções dos filtros (montadas do universo completo, antes de filtrar) ---
  const mesesSet = new Set<string>()
  const clientesSet = new Set<string>()
  const crsMap = new Map<string, string>() // cod -> nome
  const respMap = new Map<string, string>() // id -> nome
  for (const t of treinamentos) {
    mesesSet.add(mesDe(t.data))
    respMap.set(t.responsavelId, t.responsavel.nome)
    for (const p of t.presencas) {
      if (p.crCod) crsMap.set(p.crCod, p.crNome ?? p.crCod)
      const cli = clienteDoCr(p.crCod)
      if (cli) clientesSet.add(cli)
    }
  }
  const opcoes: OpcoesCapacitacao = {
    meses: [...mesesSet].sort().reverse().map((m) => ({ valor: m, rotulo: rotuloMes(m) })),
    clientes: [...clientesSet].sort((a, b) => a.localeCompare(b, "pt-BR")),
    crs: [...crsMap.entries()]
      .sort((a, b) => a[1].localeCompare(b[1], "pt-BR"))
      .map(([valor, rotulo]) => ({ valor, rotulo })),
    responsaveis: [...respMap.entries()]
      .sort((a, b) => a[1].localeCompare(b[1], "pt-BR"))
      .map(([valor, rotulo]) => ({ valor, rotulo })),
  }

  const filtraMes = filtros.meses.length > 0
  const filtraCliente = filtros.clientes.length > 0
  const filtraCr = filtros.crs.length > 0
  const filtraResp = filtros.responsaveis.length > 0

  // --- Acumuladores ---
  const cpfsDistintos = new Set<string>()
  let horasTreinadas = 0
  let naoLocalizados = 0
  const cpfsNaoLoc = new Set<string>()
  const porMes = new Map<string, number>()
  const porCr = new Map<string, { total: number; secundario: number; pessoas: Set<string> }>()
  const porCargo = new Map<string, { total: number; secundario: number }>()
  const porTreino = new Map<string, { total: number; secundario: number }>()
  const tabela: LinhaTabelaCapacitacao[] = []
  const treinamentosNoRecorte = new Set<string>()
  let treinamentosAbertos = 0

  for (const t of treinamentos) {
    const mes = mesDe(t.data)
    // O filtro de RESPONSÁVEL vale para tudo (inclusive a linha do tempo). O filtro
    // de MÊS NÃO vale para a linha do tempo — ela mostra sempre a tendência completa.
    if (filtraResp && !filtros.responsaveis.includes(t.responsavelId)) continue

    const horas = Number(t.duracaoHoras)
    const dentroDoMes = !filtraMes || filtros.meses.includes(mes)
    let presencasNoRecorte = 0

    for (const p of t.presencas) {
      if (filtraCr && !(p.crCod && filtros.crs.includes(p.crCod))) continue
      if (filtraCliente && !filtros.clientes.includes(clienteDoCr(p.crCod))) continue

      // Linha do tempo (horas por mês): IGNORA o filtro de mês, respeita os demais.
      porMes.set(mes, (porMes.get(mes) ?? 0) + horas)

      // As demais métricas respeitam o filtro de mês.
      if (!dentroDoMes) continue

      presencasNoRecorte++
      horasTreinadas += horas
      cpfsDistintos.add(p.cpfHash)
      if (!p.localizadoNaSra) cpfsNaoLoc.add(p.cpfHash)

      // Por CR (horas + pessoas distintas)
      const crRot = p.localizadoNaSra ? p.crNome ?? "—" : "Não localizado na SRA"
      const crAcc = porCr.get(crRot) ?? { total: 0, secundario: 0, pessoas: new Set<string>() }
      crAcc.total += horas
      crAcc.pessoas.add(p.cpfHash)
      porCr.set(crRot, crAcc)

      // Por cargo (horas)
      const cargoRot = p.cargo ?? (p.localizadoNaSra ? "Não informado" : "Não localizado na SRA")
      const cgAcc = porCargo.get(cargoRot) ?? { total: 0, secundario: 0 }
      cgAcc.total += horas
      cgAcc.secundario += 1
      porCargo.set(cargoRot, cgAcc)

      // Por treinamento (horas)
      const tAcc = porTreino.get(t.nome) ?? { total: 0, secundario: 0 }
      tAcc.total += horas
      tAcc.secundario += 1
      porTreino.set(t.nome, tAcc)
    }

    // Um treinamento entra na tabela/contagem se está DENTRO do mês filtrado e tem ao
    // menos uma presença no recorte, OU (sem filtro de CR/cliente) mesmo sem presença.
    const entra = dentroDoMes && (presencasNoRecorte > 0 || (!filtraCr && !filtraCliente))
    if (!entra) continue

    treinamentosNoRecorte.add(t.id)
    if (t.status === "ABERTO") treinamentosAbertos++
    tabela.push({
      id: t.id,
      nome: t.nome,
      data: new Date(t.data).toISOString().slice(0, 10),
      duracaoHoras: horas,
      responsavel: t.responsavel.nome,
      status: t.status,
      presencas: presencasNoRecorte,
    })
  }

  naoLocalizados = cpfsNaoLoc.size

  const porCrBarras = topBarras(
    new Map([...porCr.entries()].map(([k, v]) => [k, { total: v.total, secundario: v.pessoas.size }])),
  )
  const porCargoBarras = topBarras(porCargo)
  const porTreinoBarras = topBarras(porTreino)

  const linhaMensal: PontoLinha[] = [...porMes.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([mes, total]) => ({ dia: mes, total: Math.round(total * 100) / 100 }))

  const colaboradoresTreinados = cpfsDistintos.size
  const mediaHorasPorColaborador =
    colaboradoresTreinados > 0 ? Math.round((horasTreinadas / colaboradoresTreinados) * 10) / 10 : 0

  return {
    colaboradoresTreinados,
    horasTreinadas: Math.round(horasTreinadas * 100) / 100,
    mediaHorasPorColaborador,
    treinamentosRealizados: treinamentosNoRecorte.size,
    treinamentosAbertos,
    naoLocalizados,
    linhaMensal,
    porCr: porCrBarras,
    porCargo: porCargoBarras,
    porTreinamento: porTreinoBarras,
    tabela,
    opcoes,
  }
}
