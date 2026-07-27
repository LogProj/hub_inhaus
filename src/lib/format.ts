/**
 * Formatação de números no padrão pt-BR: vírgula decimal, ponto de milhar.
 * Usado por qualquer componente que exiba métrica ou variação — nunca formatar
 * número "na mão" em componente.
 */

/** Sinal de menos tipográfico (U+2212) — nunca o hífen (U+002D). */
const SINAL_MENOS = "−"

export function formatarNumero(valor: number, casas = 0): string {
  return valor.toLocaleString("pt-BR", {
    minimumFractionDigits: casas,
    maximumFractionDigits: casas,
  })
}

export function formatarPercentual(valor: number, casas = 1): string {
  return `${formatarNumero(valor, casas)}%`
}

/**
 * Formata uma variação percentual com sinal explícito: "+3,2%" quando sobe,
 * "−1,8%" quando cai (menos tipográfico, não hífen). Variação que arredonda
 * para zero na casa pedida devolve "0,0%" sem sinal — não é nem alta, nem
 * queda, é estabilidade.
 */
export function formatarVariacao(valor: number, casas = 1): string {
  const arredondado = Number(valor.toFixed(casas))

  if (arredondado === 0) {
    return formatarPercentual(0, casas)
  }

  const sinal = arredondado > 0 ? "+" : SINAL_MENOS
  return `${sinal}${formatarPercentual(Math.abs(arredondado), casas)}`
}
