import { inhausPool } from "@/lib/db-inhaus"

/**
 * Indicador CONTROLE DE QUADRO.
 *
 * Regra de negócio (mantida em sincronia com o texto do botão "info" da tela):
 *  - Mostra quantas pessoas fazem parte da equipe, com filtros de gerente
 *    regional, centro de resultado (CR), mês e cargo.
 *  - Cada pessoa é contada UMA única vez, mesmo que apareça em mais de um
 *    centro de resultado (contamos por matrícula distinta).
 *  - O mês escolhe a fotografia mais recente daquele mês; sem mês, usa a
 *    fotografia mais recente disponível.
 *  - Cargos podem ser DESMARCADOS para sair da conta (o usuário escolhe quais
 *    cargos entram na análise).
 *  - Todas as situações entram no total: em atividade, em férias e afastados
 *    continuam fazendo parte do quadro.
 *
 * Filtro padrão: gerente regional "Lucas Rodrigues da Silva".
 */

export const GERENTE_REGIONAL_PADRAO = "Lucas Rodrigues da Silva"

export type Fatia = { rotulo: string; total: number }

export type FiltrosQuadro = {
  gerenteRegional: string
  cr: string | null
  mes: string | null // "YYYY-MM"
  cargosExcluidos: string[]
}

export type OpcoesQuadro = {
  gerentes: string[]
  meses: { valor: string; rotulo: string }[]
  crs: string[]
  cargos: string[]
}

export type ControleQuadro = {
  gerenteRegional: string
  cr: string | null
  dataReferencia: string | null
  totalQuadro: number
  porSituacao: Fatia[]
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
  const nome = MESES_PT[Number(mes) - 1] ?? mes
  return `${nome} / ${ano}`
}

function paraNumero(v: unknown): number {
  const n = typeof v === "string" ? parseInt(v, 10) : Number(v)
  return Number.isFinite(n) ? n : 0
}

/** Data de referência (fotografia) a usar: a mais recente do mês, ou a global. */
async function resolverDataReferencia(mes: string | null): Promise<string | null> {
  if (mes) {
    const r = await inhausPool.query(
      "select max(data_referencia)::text d from vw_sra_geral where to_char(data_referencia,'YYYY-MM') = $1",
      [mes],
    )
    return r.rows[0]?.d ?? null
  }
  const r = await inhausPool.query("select max(data_referencia)::text d from vw_sra_geral")
  return r.rows[0]?.d ?? null
}

/** Opções para os filtros, no escopo do gerente + mês selecionados. */
export async function getOpcoesQuadro(
  gerenteRegional: string,
  mes: string | null,
): Promise<OpcoesQuadro> {
  const dref = await resolverDataReferencia(mes)

  const [gerentes, meses, crs, cargos] = await Promise.all([
    inhausPool.query(
      `select distinct gerente_regional g from vw_sra_geral
       where gerente_regional is not null order by g`,
    ),
    inhausPool.query(
      "select distinct to_char(data_referencia,'YYYY-MM') m from vw_sra_geral order by m desc",
    ),
    dref
      ? inhausPool.query(
          `select distinct cr from vw_sra_geral
           where upper(gerente_regional)=upper($1) and data_referencia=$2 and cr is not null
           order by cr`,
          [gerenteRegional, dref],
        )
      : Promise.resolve({ rows: [] as { cr: string }[] }),
    dref
      ? inhausPool.query(
          `select distinct descricao_funcao f from vw_sra_geral
           where upper(gerente_regional)=upper($1) and data_referencia=$2 and descricao_funcao is not null
           order by f`,
          [gerenteRegional, dref],
        )
      : Promise.resolve({ rows: [] as { f: string }[] }),
  ])

  return {
    gerentes: gerentes.rows.map((r) => r.g as string),
    meses: meses.rows.map((r) => ({ valor: r.m as string, rotulo: rotuloMes(r.m as string) })),
    crs: crs.rows.map((r) => r.cr as string),
    cargos: cargos.rows.map((r) => r.f as string),
  }
}

/** Total do quadro e quebra por situação, respeitando todos os filtros. */
export async function getControleQuadro(
  filtros: FiltrosQuadro,
): Promise<ControleQuadro> {
  const { gerenteRegional, cr, mes, cargosExcluidos } = filtros
  const dataReferencia = await resolverDataReferencia(mes)

  const base: ControleQuadro = {
    gerenteRegional,
    cr,
    dataReferencia,
    totalQuadro: 0,
    porSituacao: [],
  }
  if (!dataReferencia) return base

  // $1 gerente · $2 data · $3 cargos excluídos (array) · $4 cr (ou null)
  const cond = `where upper(gerente_regional)=upper($1)
      and data_referencia=$2
      and descricao_funcao <> ALL($3::text[])
      and ($4::text is null or cr = $4)`
  const args = [gerenteRegional, dataReferencia, cargosExcluidos, cr]

  const [total, situacao] = await Promise.all([
    inhausPool.query(`select count(distinct matricula)::int q from vw_sra_geral ${cond}`, args),
    inhausPool.query(
      `select situacao, count(distinct matricula)::int q from vw_sra_geral ${cond} group by situacao`,
      args,
    ),
  ])

  return {
    ...base,
    totalQuadro: paraNumero(total.rows[0]?.q),
    porSituacao: situacao.rows
      .map((r) => ({ rotulo: (r.situacao as string) ?? "—", total: paraNumero(r.q) }))
      .sort((a, b) => (ORDEM_SITUACAO[a.rotulo] ?? 99) - (ORDEM_SITUACAO[b.rotulo] ?? 99)),
  }
}
