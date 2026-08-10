/**
 * Data de NEGÓCIO do módulo de EPI, no fuso America/Sao_Paulo.
 *
 * Regra: a sessão de um turno pertence ao dia (em São Paulo) em que é aberta.
 * Turno noturno que cruza a meia-noite pertence ao dia em que começa — como a
 * sessão é criada na primeira leitura do QR (início do turno), isso já cai certo.
 * Nunca usar a data crua do servidor (fuso do host pode diferir).
 */

const FUSO = "America/Sao_Paulo"

export type DataNegocio = {
  /** "YYYY-MM-DD" no fuso de São Paulo. */
  iso: string
  /** Date em UTC representando esse dia (para gravar em coluna DATE). */
  data: Date
  /** 0=domingo … 6=sábado. */
  diaSemana: number
}

export function hojeSaoPaulo(agora: Date = new Date()): DataNegocio {
  const partes = new Intl.DateTimeFormat("en-CA", {
    timeZone: FUSO,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(agora)
  const get = (t: string) => partes.find((p) => p.type === t)?.value ?? "01"
  const iso = `${get("year")}-${get("month")}-${get("day")}`
  // Meio-dia UTC evita que o dia "escorregue" por fuso ao gravar como DATE.
  const data = new Date(`${iso}T12:00:00.000Z`)
  const diaSemana = diaDaSemana(iso)
  return { iso, data, diaSemana }
}

/** Dia da semana (0-6) de uma data "YYYY-MM-DD", sem depender de fuso local. */
export function diaDaSemana(iso: string): number {
  const [ano, mes, dia] = iso.split("-").map(Number)
  return new Date(Date.UTC(ano, mes - 1, dia)).getUTCDay()
}

const DIAS_PT = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"]
export function nomeDiaSemana(diaSemana: number): string {
  return DIAS_PT[diaSemana] ?? ""
}

/** Formata "YYYY-MM-DD" como "DD/MM/AAAA". */
export function dataBR(iso: string): string {
  const [a, m, d] = iso.split("-")
  return `${d}/${m}/${a}`
}
