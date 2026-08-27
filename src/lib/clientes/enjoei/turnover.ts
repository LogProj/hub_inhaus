import { inhausPool } from "@/lib/db-inhaus"
import { assertLinhasNoEscopo, type EscopoDados } from "@/lib/seguranca/escopo-dados"

/** CR único do portal Enjoei (valor bruto da coluna `cr`). Ponto único de manutenção. */
export const CR_ENJOEI = "68732 - SP - LOG - ENJOEI - CABREUVA"

/** Escopo fail-closed do portal Enjoei: apenas o código de CR 68732. */
const ESCOPO_ENJOEI: EscopoDados = { tipo: "lista", crs: ["68732"] }

/**
 * Leitura do Turnover da Enjoei no db_inhaus. Fonte ÚNICA e oficial:
 * public.vw_sra_geral — o relatório diário de colaboradores (snapshot
 * CONGELADO por dia, chave cpf + data_referencia: cada execução grava a "foto"
 * daquele dia sem sobrescrever dias anteriores), filtrado no CR
 * '68732 - SP - LOG - ENJOEI - CABREUVA'.
 *
 * Isolamento por CR com DUAS travas: (1) filtro `where cr = $1` em toda query
 * ao banco; (2) `assertLinhasNoEscopo` conferindo defensivamente, na leitura
 * das pessoas, que nenhuma linha veio de fora do escopo.
 *
 * Regra: o dashboard mostra a REALIDADE DA VIEW. Nada é reconstruído/estimado.
 *  - Quadro ativo do dia = colaboradores distintos no snapshot daquele dia com
 *    dt_demissao IS NULL. Dia SEM snapshot fica sem valor (null) — o gráfico
 *    mantém o dia no eixo, mas com lacuna, em vez de inventar um número.
 *  - Admissões e desligamentos vêm das datas registradas na própria view
 *    (dt_admissao / dt_demissao), contando CPFs distintos — por dia e por mês.
 *    Como varre todos os snapshots (e não só a foto mais recente), quem entrou e
 *    saiu no meio do período continua contabilizado.
 *
 * "situacao" na view é NORMAL/FÉRIAS/AFASTADO — não indica desligamento, então
 * não é usada para essa regra. Desligado = dt_demissao IS NOT NULL.
 */

export type Pessoa = {
  nome: string
  cpf: string
  dtAdmissao: string | null // YYYY-MM-DD
  dtDemissao: string | null // YYYY-MM-DD
  descricaoFuncao: string | null
  situacao: string | null
}

type LinhaBanco = {
  nome: string | null
  cpf: string
  cr: string | null
  dt_admissao: string | null
  dt_demissao: string | null
  descricao_funcao: string | null
  situacao: string | null
}

/** Meses (YYYY-MM) que têm pelo menos um dia registrado na view diária, do mais recente para o mais antigo. */
export async function getMesesDisponiveis(): Promise<string[]> {
  const { rows } = await inhausPool.query<{ mes: string }>(
    `select distinct to_char(data_referencia, 'YYYY-MM') as mes
       from public.vw_sra_geral
      where cr = $1
      order by mes desc`,
    [CR_ENJOEI],
  )
  return rows.map((r) => r.mes)
}

/** Uma linha por pessoa (cpf), usando o snapshot mais recente disponível de cada uma. */
async function getPessoas(): Promise<Pessoa[]> {
  const { rows } = await inhausPool.query<LinhaBanco>(
    `select distinct on (cpf)
            nome, cpf, cr,
            to_char(dt_admissao, 'YYYY-MM-DD') as dt_admissao,
            to_char(dt_demissao, 'YYYY-MM-DD') as dt_demissao,
            descricao_funcao,
            situacao
       from public.vw_sra_geral
      where cr = $1
      order by cpf, data_referencia desc`,
    [CR_ENJOEI],
  )
  assertLinhasNoEscopo(rows, (r) => r.cr, ESCOPO_ENJOEI)
  return rows.map((r) => ({
    nome: (r.nome ?? "—").trim(),
    cpf: r.cpf,
    dtAdmissao: r.dt_admissao,
    dtDemissao: r.dt_demissao,
    descricaoFuncao: r.descricao_funcao,
    situacao: r.situacao,
  }))
}

/**
 * Quadro ativo por dia registrado na view (YYYY-MM-DD → colaboradores distintos
 * com dt_demissao IS NULL naquele snapshot). Só existem as datas em que o
 * relatório diário foi de fato gravado — dias ausentes ficam sem valor.
 */
async function getQuadroDiarioView(): Promise<Map<string, number>> {
  const { rows } = await inhausPool.query<{ iso: string; ativos: string }>(
    `select to_char(data_referencia, 'YYYY-MM-DD') as iso,
            count(distinct cpf) filter (where dt_demissao is null) as ativos
       from public.vw_sra_geral
      where cr = $1
      group by 1`,
    [CR_ENJOEI],
  )
  return new Map(rows.map((r) => [r.iso, Number(r.ativos)]))
}

/**
 * Admissões e desligamentos por DIA (YYYY-MM-DD → CPFs distintos), lidos das
 * datas registradas na view diária. Varre todos os snapshots, então também
 * conta quem já saiu da foto mais recente.
 */
async function getMovimentacoesPorDia(): Promise<{
  admissoes: Map<string, number>
  desligamentos: Map<string, number>
}> {
  const [adm, desl] = await Promise.all([
    inhausPool.query<{ iso: string; qtd: string }>(
      `select to_char(dt_admissao, 'YYYY-MM-DD') as iso, count(distinct cpf) as qtd
         from public.vw_sra_geral
        where cr = $1 and dt_admissao is not null
        group by 1`,
      [CR_ENJOEI],
    ),
    inhausPool.query<{ iso: string; qtd: string }>(
      `select to_char(dt_demissao, 'YYYY-MM-DD') as iso, count(distinct cpf) as qtd
         from public.vw_sra_geral
        where cr = $1 and dt_demissao is not null
        group by 1`,
      [CR_ENJOEI],
    ),
  ])
  return {
    admissoes: new Map(adm.rows.map((r) => [r.iso, Number(r.qtd)])),
    desligamentos: new Map(desl.rows.map((r) => [r.iso, Number(r.qtd)])),
  }
}

/** Soma de um mapa diário (iso → qtd) dentro de um mês (YYYY-MM). */
function somaNoMes(mapa: Map<string, number>, mes: string): number {
  let total = 0
  mapa.forEach((qtd, iso) => {
    if (iso.slice(0, 7) === mes) total += qtd
  })
  return total
}

function mesDe(iso: string | null): string | null {
  return iso ? iso.slice(0, 7) : null
}

function ativoEm(p: Pessoa, dataRef: string): boolean {
  if (!p.dtAdmissao || p.dtAdmissao > dataRef) return false
  if (p.dtDemissao && p.dtDemissao <= dataRef) return false
  return true
}

/**
 * Dias (YYYY-MM-DD) do mês `mes`, do dia 1 até o fim do mês — ou até `hojeIso`
 * quando o mês selecionado é o mês corrente (dias futuros não entram).
 */
function diasDoMesAteHoje(mes: string, hojeIso: string): string[] {
  const [anoStr, mesStr] = mes.split("-")
  const ano = Number(anoStr)
  const mesNum = Number(mesStr)
  const totalDias = new Date(ano, mesNum, 0).getDate()
  const dias: string[] = []
  for (let d = 1; d <= totalDias; d++) {
    const iso = `${anoStr}-${mesStr}-${String(d).padStart(2, "0")}`
    if (iso > hojeIso) break
    dias.push(iso)
  }
  return dias
}

/**
 * Quadro médio do mês = média do quadro ativo dos dias em que existe registro
 * na view. Dias sem relatório não entram na conta (não são estimados) — se o
 * mês não tem nenhum dia registrado, não há quadro médio (null).
 */
function quadroMedioDoMes(mes: string, quadroDiario: Map<string, number>): number | null {
  let soma = 0
  let dias = 0
  quadroDiario.forEach((ativos, iso) => {
    if (iso.slice(0, 7) !== mes) return
    soma += ativos
    dias += 1
  })
  return dias > 0 ? soma / dias : null
}

export type TurnoverKpis = {
  quadroAtivoAtual: number
  admissoesMes: number
  desligamentosMes: number
  /**
   * Taxa de turnover mensal = (desligados no mês ÷ quadro ativo médio do mês)
   * × 100. O quadro médio é a média do quadro ativo dos dias registrados na
   * view. `null` quando o mês não tem nenhum dia registrado (sem base para o
   * cálculo) — o dashboard mostra "—" em vez de 0.
   */
  taxaTurnoverPct: number | null
}

export type PontoMensal = {
  mes: string // YYYY-MM
  label: string // MM/AA
  admissoes: number
  desligamentos: number
  taxaTurnoverPct: number | null
}

export type PontoHeadcountDiario = {
  iso: string // YYYY-MM-DD
  dia: string // DD
  label: string // DD/MM
  /** Quadro ativo registrado no dia; null quando não há relatório daquele dia. */
  ativos: number | null
}

export type PontoMovimentacaoDiaria = {
  iso: string // YYYY-MM-DD
  dia: string // DD
  label: string // DD/MM
  admissoes: number
  desligamentos: number
}

export type FaixaTempoCasa = {
  faixa: string
  quantidade: number
}

export type Desligado = {
  nome: string
  funcao: string | null
  dtAdmissao: string
  dtDemissao: string
  tempoCasa: string
}

export type TurnoverData = {
  meses: string[]
  mesAtual: string
  kpis: TurnoverKpis
  serieMensal: PontoMensal[]
  headcountDiario: PontoHeadcountDiario[]
  movimentacaoDiaria: PontoMovimentacaoDiaria[]
  tempoCasa: FaixaTempoCasa[]
  desligadosRecentes: Desligado[]
}

function labelMes(mes: string): string {
  const [ano, m] = mes.split("-")
  return `${m}/${ano.slice(2)}`
}

/** Lista contígua de meses (YYYY-MM), do mais antigo ao mais recente, entre `de` e `ate` (inclusive). */
function mesesEntre(de: string, ate: string): string[] {
  const out: string[] = []
  let [ano, mes] = de.split("-").map(Number)
  const [anoFim, mesFim] = ate.split("-").map(Number)
  while (ano < anoFim || (ano === anoFim && mes <= mesFim)) {
    out.push(`${ano}-${String(mes).padStart(2, "0")}`)
    mes += 1
    if (mes > 12) {
      mes = 1
      ano += 1
    }
  }
  return out
}

function tempoCasaTexto(dtAdmissao: string, dataRef: string): string {
  const inicio = new Date(dtAdmissao)
  const fim = new Date(dataRef)
  let meses = (fim.getFullYear() - inicio.getFullYear()) * 12 + (fim.getMonth() - inicio.getMonth())
  if (fim.getDate() < inicio.getDate()) meses -= 1
  meses = Math.max(0, meses)
  if (meses < 12) return `${meses} ${meses === 1 ? "mês" : "meses"}`
  const anos = Math.floor(meses / 12)
  const resto = meses % 12
  return resto === 0
    ? `${anos} ${anos === 1 ? "ano" : "anos"}`
    : `${anos}a ${resto}m`
}

export function faixaTempoCasa(dtAdmissao: string, dataRef: string): string {
  const inicio = new Date(dtAdmissao)
  const fim = new Date(dataRef)
  const meses = (fim.getFullYear() - inicio.getFullYear()) * 12 + (fim.getMonth() - inicio.getMonth())
  if (meses < 3) return "< 3 meses"
  if (meses < 6) return "3–6 meses"
  if (meses < 12) return "6–12 meses"
  if (meses < 24) return "1–2 anos"
  return "2+ anos"
}

const ORDEM_FAIXAS = ["< 3 meses", "3–6 meses", "6–12 meses", "1–2 anos", "2+ anos"]

function arredonda1(v: number): number {
  return Math.round((v + Number.EPSILON) * 10) / 10
}

/** Taxa de turnover do mês: desligados ÷ quadro médio × 100 (1 casa). null sem base. */
export function calcTaxaTurnover(desligados: number, quadroMedio: number | null): number | null {
  return quadroMedio && quadroMedio > 0 ? arredonda1((desligados / quadroMedio) * 100) : null
}

export async function getTurnoverData(mesSelecionado?: string): Promise<TurnoverData> {
  const [meses, pessoas, quadroDiario, movimentacoes] = await Promise.all([
    getMesesDisponiveis(),
    getPessoas(),
    getQuadroDiarioView(),
    getMovimentacoesPorDia(),
  ])

  const hojeIso = new Date().toISOString().slice(0, 10)
  const mesAtualCalendario = hojeIso.slice(0, 7)

  const mes =
    mesSelecionado && meses.includes(mesSelecionado) ? mesSelecionado : meses[0] ?? mesAtualCalendario

  // --- KPIs ---
  // Quadro ativo atual = o último dia efetivamente registrado na view.
  const ultimoDiaRegistrado = Array.from(quadroDiario.keys()).sort().pop() ?? null
  const quadroAtivoAtual = ultimoDiaRegistrado ? quadroDiario.get(ultimoDiaRegistrado) ?? 0 : 0

  const admissoesMes = somaNoMes(movimentacoes.admissoes, mes)
  const desligamentosMes = somaNoMes(movimentacoes.desligamentos, mes)

  const quadroMedioMes = quadroMedioDoMes(mes, quadroDiario)
  const taxaTurnoverPct = calcTaxaTurnover(desligamentosMes, quadroMedioMes)

  // --- Headcount por dia (mês selecionado) ---
  // Todos os dias do mês continuam no eixo; dias sem relatório ficam com lacuna.
  const diasMesSelecionado = diasDoMesAteHoje(mes, hojeIso)
  const headcountDiario: PontoHeadcountDiario[] = diasMesSelecionado.map((iso) => {
    const dia = iso.slice(8, 10)
    const mesLbl = iso.slice(5, 7)
    return {
      iso,
      dia,
      label: `${dia}/${mesLbl}`,
      ativos: quadroDiario.get(iso) ?? null,
    }
  })

  // --- Admissões e desligamentos por dia (mês selecionado) ---
  const movimentacaoDiaria: PontoMovimentacaoDiaria[] = diasMesSelecionado.map((iso) => {
    const dia = iso.slice(8, 10)
    const mesLbl = iso.slice(5, 7)
    return {
      iso,
      dia,
      label: `${dia}/${mesLbl}`,
      admissoes: movimentacoes.admissoes.get(iso) ?? 0,
      desligamentos: movimentacoes.desligamentos.get(iso) ?? 0,
    }
  })

  // --- Série mensal (últimos 12 meses corridos, ou desde a primeira admissão se for mais recente) ---
  const primeiraAdmissao = Array.from(movimentacoes.admissoes.keys()).sort()[0]
  const doze = new Date(hojeIso)
  doze.setMonth(doze.getMonth() - 11)
  const inicioJanela = doze.toISOString().slice(0, 7)
  const mesInicioSerie =
    primeiraAdmissao && mesDe(primeiraAdmissao)! > inicioJanela ? mesDe(primeiraAdmissao)! : inicioJanela

  const meseSerie = mesesEntre(mesInicioSerie, mesAtualCalendario)
  const serieMensal: PontoMensal[] = meseSerie.map((m) => {
    const adm = somaNoMes(movimentacoes.admissoes, m)
    const desl = somaNoMes(movimentacoes.desligamentos, m)
    const qMedio = quadroMedioDoMes(m, quadroDiario)
    const taxa = calcTaxaTurnover(desl, qMedio)
    return { mes: m, label: labelMes(m), admissoes: adm, desligamentos: desl, taxaTurnoverPct: taxa }
  })

  // --- Tempo de casa (distribuição dos ativos no último dia registrado) ---
  const dataRefTempoCasa = ultimoDiaRegistrado ?? hojeIso
  const ativos = pessoas.filter((p) => ativoEm(p, dataRefTempoCasa) && p.dtAdmissao)
  const contagem = new Map<string, number>(ORDEM_FAIXAS.map((f) => [f, 0]))
  for (const p of ativos) {
    const f = faixaTempoCasa(p.dtAdmissao as string, dataRefTempoCasa)
    contagem.set(f, (contagem.get(f) ?? 0) + 1)
  }
  const tempoCasa: FaixaTempoCasa[] = ORDEM_FAIXAS.map((f) => ({ faixa: f, quantidade: contagem.get(f) ?? 0 }))

  // --- Desligados recentes ---
  const desligadosRecentes: Desligado[] = pessoas
    .filter((p) => p.dtDemissao && p.dtAdmissao)
    .sort((a, b) => (b.dtDemissao as string).localeCompare(a.dtDemissao as string))
    .slice(0, 20)
    .map((p) => ({
      nome: p.nome,
      funcao: p.descricaoFuncao,
      dtAdmissao: p.dtAdmissao as string,
      dtDemissao: p.dtDemissao as string,
      tempoCasa: tempoCasaTexto(p.dtAdmissao as string, p.dtDemissao as string),
    }))

  return {
    meses,
    mesAtual: mes,
    kpis: { quadroAtivoAtual, admissoesMes, desligamentosMes, taxaTurnoverPct },
    serieMensal,
    headcountDiario,
    movimentacaoDiaria,
    tempoCasa,
    desligadosRecentes,
  }
}
