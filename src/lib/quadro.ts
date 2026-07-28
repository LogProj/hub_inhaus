import { inhausPool } from "@/lib/db-inhaus"

/**
 * Indicador CONTROLE DE QUADRO.
 *
 * Regra de negócio (mantida em sincronia com o texto do botão "info" da tela):
 *  - Sempre a equipe do gerente regional Lucas Rodrigues da Silva (fixo).
 *  - Mostra quantas pessoas fazem parte do quadro, com filtros de gerente,
 *    centro de resultado (CR), mês e cargo.
 *  - Cada pessoa é contada UMA única vez, mesmo que apareça em mais de um
 *    centro de resultado (por matrícula distinta).
 *  - O mês escolhe a fotografia mais recente daquele mês; sem mês, usa a
 *    fotografia mais recente disponível.
 *  - Cargos podem ser DESMARCADOS para sair da conta.
 *  - Todas as situações entram no total (em atividade, férias, afastados).
 *  - Linha do tempo do quadro ativo por dia: para cada dia, conta quem já havia
 *    sido admitido até aquela data (com base na data de admissão do quadro atual).
 *  - Desligamentos no mês: pessoas com data de demissão dentro do mês (contadas
 *    uma única vez).
 */

/** Gerente regional fixo deste indicador. Nunca vira filtro. */
export const GERENTE_REGIONAL_FIXO = "Lucas Rodrigues da Silva"

export type Fatia = { rotulo: string; total: number }
export type PontoLinha = { dia: string; total: number }

export type FiltrosQuadro = {
  gerente: string | null
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
  dataReferencia: string | null
  mesReferencia: string | null
  totalQuadro: number
  desligamentosMes: number
  porSituacao: Fatia[]
  /** Quadro ativo em cada data de referência (fotografia real). */
  linhaDoTempo: PontoLinha[]
  /** Quadro médio de ativos por mês (média das fotografias do mês). `dia` = "YYYY-MM". */
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

/** Opções dos filtros, no escopo do gerente regional fixo + mês selecionado. */
export async function getOpcoesQuadro(mes: string | null): Promise<OpcoesQuadro> {
  const dref = await resolverDataReferencia(mes)
  const escopo = "where upper(gerente_regional)=upper($1) and data_referencia=$2"

  const [meses, gerentes, crs, cargos] = await Promise.all([
    inhausPool.query(
      "select distinct to_char(data_referencia,'YYYY-MM') m from vw_sra_geral order by m desc",
    ),
    dref
      ? inhausPool.query(
          `select distinct gerente g from vw_sra_geral ${escopo} and gerente is not null order by g`,
          [GERENTE_REGIONAL_FIXO, dref],
        )
      : Promise.resolve({ rows: [] as { g: string }[] }),
    dref
      ? inhausPool.query(
          `select distinct cr from vw_sra_geral ${escopo} and cr is not null order by cr`,
          [GERENTE_REGIONAL_FIXO, dref],
        )
      : Promise.resolve({ rows: [] as { cr: string }[] }),
    dref
      ? inhausPool.query(
          `select distinct descricao_funcao f from vw_sra_geral ${escopo} and descricao_funcao is not null order by f`,
          [GERENTE_REGIONAL_FIXO, dref],
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

export async function getControleQuadro(filtros: FiltrosQuadro): Promise<ControleQuadro> {
  const { gerente, cr, mes, cargosExcluidos } = filtros
  const dataReferencia = await resolverDataReferencia(mes)
  const mesReferencia = mes ?? (dataReferencia ? dataReferencia.slice(0, 7) : null)

  const base: ControleQuadro = {
    dataReferencia,
    mesReferencia,
    totalQuadro: 0,
    desligamentosMes: 0,
    porSituacao: [],
    linhaDoTempo: [],
    quadroMedioMensal: [],
  }
  if (!dataReferencia) return base

  // Filtros comuns: $1 gerente regional fixo · $2 data · $3 cargos excluídos ·
  // $4 cr (ou null) · $5 gerente (ou null).
  const cond = `where upper(gerente_regional)=upper($1)
      and data_referencia=$2
      and descricao_funcao <> ALL($3::text[])
      and ($4::text is null or cr = $4)
      and ($5::text is null or upper(gerente) = upper($5))`
  const args = [GERENTE_REGIONAL_FIXO, dataReferencia, cargosExcluidos, cr, gerente]

  const [total, situacao, deslig, linha, mensal] = await Promise.all([
    inhausPool.query(`select count(distinct matricula)::int q from vw_sra_geral ${cond}`, args),
    inhausPool.query(
      `select situacao, count(distinct matricula)::int q from vw_sra_geral ${cond} group by situacao`,
      args,
    ),
    // Desligamentos no mês: por DATA DE DEMISSÃO, contando cada pessoa uma vez.
    // Lista de parâmetros PRÓPRIA (não usa a data $2), senão o Postgres não
    // consegue inferir o tipo de um parâmetro que não aparece na query.
    inhausPool.query(
      `select count(distinct matricula)::int q from vw_sra_geral
       where upper(gerente_regional)=upper($1)
         and descricao_funcao <> ALL($2::text[])
         and ($3::text is null or cr = $3)
         and ($4::text is null or upper(gerente) = upper($4))
         and dt_demissao is not null
         and to_char(dt_demissao,'YYYY-MM') = $5`,
      [GERENTE_REGIONAL_FIXO, cargosExcluidos, cr, gerente, mesReferencia],
    ),
    // Linha do tempo: quadro ativo em cada DATA DE REFERÊNCIA (fotografia real).
    // Só aparecem os dias em que houve fotografia do quadro — dias sem coleta
    // não são inventados. Lista de parâmetros própria ($1..$5).
    inhausPool.query(
      `select to_char(data_referencia,'YYYY-MM-DD') dia, count(distinct matricula)::int q
       from vw_sra_geral
       where upper(gerente_regional)=upper($1)
         and descricao_funcao <> ALL($2::text[])
         and ($3::text is null or cr = $3)
         and ($4::text is null or upper(gerente) = upper($4))
         and ($5::text is null or to_char(data_referencia,'YYYY-MM') = $5)
       group by data_referencia order by data_referencia`,
      [GERENTE_REGIONAL_FIXO, cargosExcluidos, cr, gerente, mes],
    ),
    // Quadro MÉDIO de ativos por mês: média das fotografias (dias) de cada mês.
    inhausPool.query(
      `with diario as (
         select data_referencia, count(distinct matricula)::numeric q
         from vw_sra_geral
         where upper(gerente_regional)=upper($1)
           and descricao_funcao <> ALL($2::text[])
           and ($3::text is null or cr = $3)
           and ($4::text is null or upper(gerente) = upper($4))
           and ($5::text is null or to_char(data_referencia,'YYYY-MM') = $5)
         group by data_referencia
       )
       select to_char(data_referencia,'YYYY-MM') dia, round(avg(q))::int q
       from diario group by to_char(data_referencia,'YYYY-MM') order by 1`,
      [GERENTE_REGIONAL_FIXO, cargosExcluidos, cr, gerente, mes],
    ),
  ])

  return {
    ...base,
    totalQuadro: paraNumero(total.rows[0]?.q),
    desligamentosMes: paraNumero(deslig.rows[0]?.q),
    porSituacao: situacao.rows
      .map((r) => ({ rotulo: (r.situacao as string) ?? "—", total: paraNumero(r.q) }))
      .sort((a, b) => (ORDEM_SITUACAO[a.rotulo] ?? 99) - (ORDEM_SITUACAO[b.rotulo] ?? 99)),
    linhaDoTempo: linha.rows.map((r) => ({ dia: r.dia as string, total: paraNumero(r.q) })),
    quadroMedioMensal: mensal.rows.map((r) => ({ dia: r.dia as string, total: paraNumero(r.q) })),
  }
}
