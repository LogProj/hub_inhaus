import { prisma } from "@/lib/prisma"
import { hojeSaoPaulo, diaDaSemana } from "@/lib/epi/datas"
import { getQuadroAtivoPorCr } from "@/lib/epi/colaboradores"

/**
 * ACOMPANHAMENTO MENSAL do EPI (torre de controle da Segurança).
 *
 * Regras de negócio (em sincronia com o InfoIndicador):
 *  - "Esperado" = para cada turno ativo, os dias do mês (até hoje) que batem com os
 *    dias em que o turno espera preenchimento (diasSemana), vezes as pessoas alocadas.
 *  - "Preenchimento" = uma resposta registrada da pessoa alocada numa sessão do dia.
 *  - "Aderência" = preenchimentos ÷ esperados.
 *  - Presença: quem o líder marcou AUSENTE na validação não conta como esperado
 *    naquele dia (resolve escalas 12x36).
 *  - Alertas: (1) colaborador sem preenchimento em dia com sessão; (2) não
 *    conformidade (item não conforme); (3) líder com validações pendentes (sessão
 *    aguardando validação); (4) turno esperado sem NENHUMA sessão no dia.
 *
 * Módulo server-only.
 */

export type SemPreenchimento = { nome: string; cr: string; turno: string; diasFaltantes: number }
export type NaoConformidade = { nome: string; cr: string; data: string; itens: string[] }
export type LiderPendencia = { nome: string; authUserId: string; pendentes: number }
export type TurnoSemSessao = { cr: string; turno: string; dias: string[] }

export type AcompanhamentoMes = {
  mes: string
  kpis: {
    aderencia: number
    esperados: number
    preenchidos: number
    naoConformidades: number
    validacoesPendentes: number
    turnosSemSessao: number
  }
  crs: string[]
  /** Série temporal do mês: aderência por dia (só dias com expectativa). */
  porDia: { dia: string; aderencia: number; esperados: number; preenchidos: number }[]
  /** Aderência por CR (pior primeiro), para o gráfico de comparação. */
  porCr: { cr: string; aderencia: number; esperados: number; preenchidos: number }[]
  /** Preenchimentos conformes vs não conformes (para o donut). */
  conformidade: { conformes: number; naoConformes: number }
  semPreenchimento: (SemPreenchimento & { _cr: string })[]
  naoConformidades: (NaoConformidade & { _cr: string })[]
  lideresPendentes: LiderPendencia[]
  lideresEmDia: { nome: string; authUserId: string }[]
  turnosSemSessao: (TurnoSemSessao & { _cr: string })[]
}

function diasDoMes(mes: string): string[] {
  const [a, m] = mes.split("-").map(Number)
  const ultimo = new Date(Date.UTC(a, m, 0)).getUTCDate()
  return Array.from({ length: ultimo }, (_, i) => `${mes}-${String(i + 1).padStart(2, "0")}`)
}

type ItemResposta = { itemId?: string; rotulo?: string; conforme?: boolean }

export async function acompanhamentoMensal(mes: string): Promise<AcompanhamentoMes> {
  const hoje = hojeSaoPaulo().iso
  const dias = diasDoMes(mes).filter((d) => d <= hoje)
  const todosDias = diasDoMes(mes)
  const inicio = new Date(`${mes}-01T00:00:00.000Z`)
  const fim = new Date(`${todosDias.at(-1)}T23:59:59.999Z`)

  const [turnos, sessoes, atribs, lideres] = await Promise.all([
    prisma.turno.findMany({
      where: { ativo: true },
      select: { id: true, cr: true, nome: true, diasSemana: true },
    }),
    prisma.sessaoTurno.findMany({
      where: { data: { gte: inicio, lte: fim } },
      select: {
        turnoId: true,
        data: true,
        status: true,
        respostas: { select: { cpfHash: true, nome: true, cr: true, conforme: true, respostas: true } },
        presencas: { select: { cpfHash: true, presente: true } },
      },
    }),
    prisma.atribuicaoTurno.findMany({ where: { fimEm: null }, select: { turnoId: true, cpfHash: true, cr: true } }),
    prisma.liderCr.findMany({ where: { fimEm: null }, select: { cr: true, authUserId: true, nome: true } }),
  ])

  const isoDe = (d: Date) => d.toISOString().slice(0, 10)

  // sessões por turno+dia
  const sessaoPorChave = new Map<string, (typeof sessoes)[number]>()
  for (const s of sessoes) sessaoPorChave.set(`${s.turnoId}|${isoDe(s.data)}`, s)

  // alocados por turno
  const alocPorTurno = new Map<number, string[]>()
  for (const a of atribs) {
    const arr = alocPorTurno.get(a.turnoId) ?? []
    arr.push(a.cpfHash)
    alocPorTurno.set(a.turnoId, arr)
  }

  // nomes por cpfHash (quadro ativo do CR) — para quem não tem snapshot de resposta
  const crs = Array.from(new Set(turnos.map((t) => t.cr)))
  const nomePorHash = new Map<string, string>()
  await Promise.all(
    crs.map(async (cr) => {
      try {
        const roster = await getQuadroAtivoPorCr(cr)
        for (const c of roster) if (!nomePorHash.has(c.cpfHash)) nomePorHash.set(c.cpfHash, c.nome)
      } catch {
        /* CR sem roster ativo: nomes virão dos snapshots quando houver */
      }
    }),
  )
  for (const s of sessoes) for (const r of s.respostas) if (r.nome) nomePorHash.set(r.cpfHash, r.nome)

  let esperados = 0
  let preenchidos = 0
  let validacoesPendentes = 0
  const semPreenchimento: (SemPreenchimento & { _cr: string })[] = []
  const naoConformidades: (NaoConformidade & { _cr: string })[] = []
  const turnosSemSessao: (TurnoSemSessao & { _cr: string })[] = []
  const pendentesPorCr = new Map<string, number>()
  // faltas por pessoa+turno
  const faltasPessoa = new Map<string, { nome: string; cr: string; turno: string; dias: number }>()
  // agregados para os gráficos
  const porDiaMap = new Map<string, { esperados: number; preenchidos: number }>()
  const porCrMap = new Map<string, { esperados: number; preenchidos: number }>()
  const acumDia = (d: string, e: number, p: number) => {
    const a = porDiaMap.get(d) ?? { esperados: 0, preenchidos: 0 }
    a.esperados += e
    a.preenchidos += p
    porDiaMap.set(d, a)
  }
  const acumCr = (cr: string, e: number, p: number) => {
    const a = porCrMap.get(cr) ?? { esperados: 0, preenchidos: 0 }
    a.esperados += e
    a.preenchidos += p
    porCrMap.set(cr, a)
  }

  for (const t of turnos) {
    const alocados = alocPorTurno.get(t.id) ?? []
    const diasEsperados = dias.filter((d) => t.diasSemana.includes(diaDaSemana(d)))
    const semSessao: string[] = []

    for (const d of diasEsperados) {
      const sessao = sessaoPorChave.get(`${t.id}|${d}`)
      if (!sessao) {
        // dia esperado sem nenhuma sessão: conta no esperado (baixa a aderência) e vira alerta 4
        esperados += alocados.length
        acumDia(d, alocados.length, 0)
        acumCr(t.cr, alocados.length, 0)
        if (alocados.length > 0) semSessao.push(d)
        continue
      }
      if (sessao.status === "AGUARDANDO_VALIDACAO") {
        validacoesPendentes += 1
        pendentesPorCr.set(t.cr, (pendentesPorCr.get(t.cr) ?? 0) + 1)
      }
      const respondeu = new Map(sessao.respostas.map((r) => [r.cpfHash, r]))
      const ausente = new Set(sessao.presencas.filter((p) => !p.presente).map((p) => p.cpfHash))

      for (const hash of alocados) {
        if (ausente.has(hash)) continue // ausente: não é esperado neste dia
        esperados += 1
        const r = respondeu.get(hash)
        acumDia(d, 1, r ? 1 : 0)
        acumCr(t.cr, 1, r ? 1 : 0)
        if (r) {
          preenchidos += 1
          if (!r.conforme) {
            const itens = ((r.respostas as ItemResposta[]) ?? [])
              .filter((i) => i.conforme === false)
              .map((i) => i.rotulo || i.itemId || "item")
            naoConformidades.push({ nome: r.nome, cr: t.cr, data: d, itens, _cr: t.cr })
          }
        } else {
          const chave = `${t.id}|${hash}`
          const atual = faltasPessoa.get(chave) ?? {
            nome: nomePorHash.get(hash) ?? "Colaborador",
            cr: t.cr,
            turno: t.nome,
            dias: 0,
          }
          atual.dias += 1
          faltasPessoa.set(chave, atual)
        }
      }
    }

    if (semSessao.length > 0) turnosSemSessao.push({ cr: t.cr, turno: t.nome, dias: semSessao, _cr: t.cr })
  }

  for (const f of faltasPessoa.values())
    semPreenchimento.push({ nome: f.nome, cr: f.cr, turno: f.turno, diasFaltantes: f.dias, _cr: f.cr })
  semPreenchimento.sort((a, b) => b.diasFaltantes - a.diasFaltantes)
  naoConformidades.sort((a, b) => (a.data < b.data ? 1 : -1))

  // líderes: soma pendências dos CRs que lidera
  const lideresMap = new Map<string, { nome: string; authUserId: string; pendentes: number }>()
  for (const l of lideres) {
    const atual = lideresMap.get(l.authUserId) ?? { nome: l.nome, authUserId: l.authUserId, pendentes: 0 }
    atual.pendentes += pendentesPorCr.get(l.cr) ?? 0
    lideresMap.set(l.authUserId, atual)
  }
  const lideresPendentes = Array.from(lideresMap.values())
    .filter((l) => l.pendentes > 0)
    .sort((a, b) => b.pendentes - a.pendentes)
  const lideresEmDia = Array.from(lideresMap.values())
    .filter((l) => l.pendentes === 0)
    .map((l) => ({ nome: l.nome, authUserId: l.authUserId }))

  const aderencia = esperados > 0 ? Math.round((preenchidos / esperados) * 100) : 0
  const pct = (p: number, e: number) => (e > 0 ? Math.round((p / e) * 100) : 0)

  const porDia = dias
    .filter((d) => (porDiaMap.get(d)?.esperados ?? 0) > 0)
    .map((d) => {
      const a = porDiaMap.get(d)!
      return { dia: d, esperados: a.esperados, preenchidos: a.preenchidos, aderencia: pct(a.preenchidos, a.esperados) }
    })

  const porCr = Array.from(porCrMap.entries())
    .filter(([, a]) => a.esperados > 0)
    .map(([cr, a]) => ({ cr, esperados: a.esperados, preenchidos: a.preenchidos, aderencia: pct(a.preenchidos, a.esperados) }))
    .sort((x, y) => x.aderencia - y.aderencia)

  const conformidade = {
    conformes: Math.max(0, preenchidos - naoConformidades.length),
    naoConformes: naoConformidades.length,
  }

  return {
    mes,
    kpis: {
      aderencia,
      esperados,
      preenchidos,
      naoConformidades: naoConformidades.length,
      validacoesPendentes,
      turnosSemSessao: turnosSemSessao.reduce((n, t) => n + t.dias.length, 0),
    },
    crs: crs.sort(),
    porDia,
    porCr,
    conformidade,
    semPreenchimento,
    naoConformidades,
    lideresPendentes,
    lideresEmDia,
    turnosSemSessao,
  }
}
