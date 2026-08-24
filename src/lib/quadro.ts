import { inhausPool } from "@/lib/db-inhaus"
import {
  predicadoSraCr,
  assertLinhasNoEscopo,
  type EscopoDados,
} from "@/lib/seguranca/escopo-dados"

/**
 * Indicador CONTROLE DE QUADRO.
 *
 * Regra de negócio (mantida em sincronia com o texto do botão "info" da tela):
 *  - Sempre a equipe do gerente regional Lucas Rodrigues da Silva (fixo).
 *  - Filtros de múltipla escolha: gerente(s), centro(s) de resultado, mês(es) e
 *    cargos. Filtro vazio = todos.
 *  - Cada pessoa é contada UMA única vez (por matrícula distinta).
 *  - "Último dia disponível": a fotografia mais recente dentro do(s) mês(es)
 *    filtrado(s); sem mês, a fotografia mais recente de todas.
 *  - Cargos podem ser DESMARCADOS para sair da conta.
 *  - Todas as situações contam (em atividade, férias, afastados).
 *  - Total por CR e por cargo: no último dia disponível, top posições.
 *  - Linha do tempo: quadro ativo em cada data de referência (fotografia real).
 *  - Quadro médio por mês: média das fotografias do mês.
 *  - Desligamentos no mês: por data de demissão, cada pessoa uma vez.
 *  - Turnover (rotatividade) do mês: desligamentos do mês ÷ quadro médio do mês,
 *    em %. Quadro médio = média das fotografias do mês (sem histórico, usa o total
 *    atual). Ex.: 18 desligamentos sobre um quadro médio de 1.800 = 1,0%.
 */

export const GERENTE_REGIONAL_FIXO = "Lucas Rodrigues da Silva"

/** Quantas posições trazer nos rankings por CR e por cargo. */
const TOP_RANKING = 15

export type Fatia = { rotulo: string; total: number }
export type PontoLinha = { dia: string; total: number }

export type FiltrosQuadro = {
  gerentes: string[]
  crs: string[]
  meses: string[] // "YYYY-MM"
  cargosExcluidos: string[]
}

export type OpcoesQuadro = {
  gerentes: string[]
  meses: { valor: string; rotulo: string }[]
  crs: string[]
  cargos: string[]
}

export type ControleQuadro = {
  dataReferencia: string | null
  totalQuadro: number
  desligamentosMes: number
  /** Quadro médio (média das fotografias) do(s) mês(es) de referência. Base do turnover. */
  quadroMedioMes: number
  /** Rotatividade do mês, em %: desligamentos ÷ quadro médio do mês. */
  turnoverMes: number
  porSituacao: Fatia[]
  porCr: Fatia[]
  porCargo: Fatia[]
  linhaDoTempo: PontoLinha[]
  quadroMedioMensal: PontoLinha[]
}

const ORDEM_SITUACAO: Record<string, number> = {
  NORMAL: 0,
  "FÉRIAS": 1,
  FERIAS: 1,
  AFASTADO: 2,
}

const MESES_PT = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
]

function rotuloMes(valor: string): string {
  const [ano, mes] = valor.split("-")
  return `${MESES_PT[Number(mes) - 1] ?? mes} / ${ano}`
}

function paraNumero(v: unknown): number {
  const n = typeof v === "string" ? parseInt(v, 10) : Number(v)
  return Number.isFinite(n) ? n : 0
}

/** Fotografia mais recente dentro do(s) mês(es); sem mês, a mais recente de todas. */
async function resolverDataReferencia(meses: string[]): Promise<string | null> {
  if (meses.length > 0) {
    const r = await inhausPool.query(
      "select max(data_referencia)::text d from vw_sra_geral where to_char(data_referencia,'YYYY-MM') = any($1::text[])",
      [meses],
    )
    return r.rows[0]?.d ?? null
  }
  const r = await inhausPool.query("select max(data_referencia)::text d from vw_sra_geral")
  return r.rows[0]?.d ?? null
}

/** Opções dos filtros, no escopo do gerente regional fixo + fotografia atual. */
export async function getOpcoesQuadro(meses: string[], escopoDados: EscopoDados): Promise<OpcoesQuadro> {
  const dref = await resolverDataReferencia(meses)
  const pred = predicadoSraCr(escopoDados, "cr", 3) // $1 gerente, $2 data, $3 escopo
  const condOpc = `where upper(gerente_regional)=upper($1) and data_referencia=$2${pred.sql}`

  const [listaMeses, gerentes, crs, cargos] = await Promise.all([
    inhausPool.query(
      "select distinct to_char(data_referencia,'YYYY-MM') m from vw_sra_geral order by m desc",
    ),
    dref
      ? inhausPool.query(
          `select distinct gerente g from vw_sra_geral ${condOpc} and gerente is not null order by g`,
          [GERENTE_REGIONAL_FIXO, dref, ...pred.params],
        )
      : Promise.resolve({ rows: [] as { g: string }[] }),
    dref
      ? inhausPool.query(
          `select distinct cr from vw_sra_geral ${condOpc} and cr is not null order by cr`,
          [GERENTE_REGIONAL_FIXO, dref, ...pred.params],
        )
      : Promise.resolve({ rows: [] as { cr: string }[] }),
    dref
      ? inhausPool.query(
          `select distinct descricao_funcao f from vw_sra_geral ${condOpc} and descricao_funcao is not null order by f`,
          [GERENTE_REGIONAL_FIXO, dref, ...pred.params],
        )
      : Promise.resolve({ rows: [] as { f: string }[] }),
  ])

  return {
    gerentes: gerentes.rows.map((r) => r.g as string),
    meses: listaMeses.rows.map((r) => ({ valor: r.m as string, rotulo: rotuloMes(r.m as string) })),
    crs: crs.rows.map((r) => r.cr as string),
    cargos: cargos.rows.map((r) => r.f as string),
  }
}

export async function getControleQuadro(filtros: FiltrosQuadro, escopo: EscopoDados): Promise<ControleQuadro> {
  const { gerentes, crs, meses, cargosExcluidos } = filtros
  const dataReferencia = await resolverDataReferencia(meses)

  const base: ControleQuadro = {
    dataReferencia,
    totalQuadro: 0,
    desligamentosMes: 0,
    quadroMedioMes: 0,
    turnoverMes: 0,
    porSituacao: [],
    porCr: [],
    porCargo: [],
    linhaDoTempo: [],
    quadroMedioMensal: [],
  }
  if (!dataReferencia) return base

  // Filtros sobre a fotografia (dref): $1 gerente regional · $2 data ·
  // $3 cargos excluídos · $4 CRs · $5 gerentes.
  const predFoto = predicadoSraCr(escopo, "cr", 6)
  const condFoto = `where upper(gerente_regional)=upper($1)
      and data_referencia=$2
      and descricao_funcao <> all($3::text[])
      and (cardinality($4::text[])=0 or cr = any($4::text[]))
      and (cardinality($5::text[])=0 or gerente = any($5::text[]))${predFoto.sql}`
  const argsFoto = [GERENTE_REGIONAL_FIXO, dataReferencia, cargosExcluidos, crs, gerentes, ...predFoto.params]

  // Filtros sobre o histórico (sem fixar data): $1 gerente regional ·
  // $2 cargos excluídos · $3 CRs · $4 gerentes · $5 meses.
  const predHist = predicadoSraCr(escopo, "cr", 6)
  const condHist = `where upper(gerente_regional)=upper($1)
      and descricao_funcao <> all($2::text[])
      and (cardinality($3::text[])=0 or cr = any($3::text[]))
      and (cardinality($4::text[])=0 or gerente = any($4::text[]))
      and (cardinality($5::text[])=0 or to_char(data_referencia,'YYYY-MM') = any($5::text[]))${predHist.sql}`
  const argsHist = [GERENTE_REGIONAL_FIXO, cargosExcluidos, crs, gerentes, meses, ...predHist.params]

  // Desligamentos: mês(es) selecionado(s), ou o mês da fotografia atual.
  const mesesDeslig = meses.length > 0 ? meses : [dataReferencia.slice(0, 7)]
  const predDeslig = predicadoSraCr(escopo, "cr", 6)

  const [total, situacao, porCr, porCargo, deslig, linha, mensal] = await Promise.all([
    inhausPool.query(`select count(distinct matricula)::int q from vw_sra_geral ${condFoto}`, argsFoto),
    inhausPool.query(
      `select situacao, count(distinct matricula)::int q from vw_sra_geral ${condFoto} group by situacao`,
      argsFoto,
    ),
    inhausPool.query(
      `select cr, count(distinct matricula)::int q from vw_sra_geral ${condFoto}
       and cr is not null group by cr order by q desc limit ${TOP_RANKING}`,
      argsFoto,
    ),
    inhausPool.query(
      `select descricao_funcao, count(distinct matricula)::int q from vw_sra_geral ${condFoto}
       and descricao_funcao is not null group by descricao_funcao order by q desc limit ${TOP_RANKING}`,
      argsFoto,
    ),
    inhausPool.query(
      `select count(distinct matricula)::int q from vw_sra_geral
       where upper(gerente_regional)=upper($1)
         and descricao_funcao <> all($2::text[])
         and (cardinality($3::text[])=0 or cr = any($3::text[]))
         and (cardinality($4::text[])=0 or gerente = any($4::text[]))
         and dt_demissao is not null
         and to_char(dt_demissao,'YYYY-MM') = any($5::text[])${predDeslig.sql}`,
      [GERENTE_REGIONAL_FIXO, cargosExcluidos, crs, gerentes, mesesDeslig, ...predDeslig.params],
    ),
    inhausPool.query(
      `select to_char(data_referencia,'YYYY-MM-DD') dia, count(distinct matricula)::int q
       from vw_sra_geral ${condHist} group by data_referencia order by data_referencia`,
      argsHist,
    ),
    inhausPool.query(
      `with diario as (
         select data_referencia, count(distinct matricula)::numeric q
         from vw_sra_geral ${condHist} group by data_referencia
       )
       select to_char(data_referencia,'YYYY-MM') dia, round(avg(q))::int q
       from diario group by to_char(data_referencia,'YYYY-MM') order by 1`,
      argsHist,
    ),
  ])

  // Trava 2: nenhuma linha de CR fora do escopo pode escapar.
  assertLinhasNoEscopo(porCr.rows, (r) => r.cr as string, escopo)

  const desligamentosMes = paraNumero(deslig.rows[0]?.q)
  const totalQuadro = paraNumero(total.rows[0]?.q)
  // Quadro médio dos meses de referência: média das fotografias desses meses.
  // Sem histórico de fotografias, cai para o total da fotografia atual.
  const mediasRef = mensal.rows
    .filter((r) => mesesDeslig.includes(r.dia as string))
    .map((r) => paraNumero(r.q))
  const quadroMedioMes = mediasRef.length
    ? Math.round(mediasRef.reduce((s, n) => s + n, 0) / mediasRef.length)
    : totalQuadro
  const turnoverMes = quadroMedioMes > 0 ? Math.round((desligamentosMes / quadroMedioMes) * 1000) / 10 : 0

  return {
    ...base,
    totalQuadro,
    desligamentosMes,
    quadroMedioMes,
    turnoverMes,
    porSituacao: situacao.rows
      .map((r) => ({ rotulo: (r.situacao as string) ?? "—", total: paraNumero(r.q) }))
      .sort((a, b) => (ORDEM_SITUACAO[a.rotulo] ?? 99) - (ORDEM_SITUACAO[b.rotulo] ?? 99)),
    porCr: porCr.rows.map((r) => ({ rotulo: (r.cr as string) ?? "—", total: paraNumero(r.q) })),
    porCargo: porCargo.rows.map((r) => ({
      rotulo: (r.descricao_funcao as string) ?? "—",
      total: paraNumero(r.q),
    })),
    linhaDoTempo: linha.rows.map((r) => ({ dia: r.dia as string, total: paraNumero(r.q) })),
    quadroMedioMensal: mensal.rows.map((r) => ({ dia: r.dia as string, total: paraNumero(r.q) })),
  }
}
