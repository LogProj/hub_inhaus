/** Listas de valores dos campos de um desvio (fonte: planilha Controle de Aderência). */
export const RESPONSAVEIS_INTERNOS = ["ACTA", "ACTA / GPS", "CP", "CP / GPS", "GPS"] as const
export const TIPOS = ["Pedido de Venda", "ACS - Kit Conjunto", "CS - Kit Conjunto", "Pedido TMC"] as const
export const DIVISOES = ["BR31", "BR41"] as const
export const MOTIVOS = [
  "Falta de Material", "Envio Divergente", "Falha de faturamento",
  "Necessidade CS", "Não enviado", "Perda de material",
] as const
export const CAUSAS_RAIZ = [
  "Divergencia de Estoque", "Erro na criação de OTB", "Erro no cadastro do cliente",
  "Falha de processo", "Falha na Sep/Conf", "OTB bloqueada no SAP",
] as const

/**
 * Status do desvio. Valor no banco → rótulo na tela. `cor` é a família de cor
 * (badge/gráfico): âmbar = em andamento, vermelho = pendente, verde = concluída.
 */
export const STATUS_DESVIO = [
  { value: "EM_TRATATIVA", label: "Em tratativa", cor: "ambar" },
  { value: "PENDENTE", label: "Pendente", cor: "vermelho" },
  { value: "CONCLUIDA", label: "Concluída", cor: "verde" },
] as const

export type StatusDesvio = (typeof STATUS_DESVIO)[number]["value"]

/** Rótulo de um status a partir do valor gravado. */
export function rotuloStatus(value: string): string {
  return STATUS_DESVIO.find((s) => s.value === value)?.label ?? value
}

/** Mapeia o texto "Caso Resolvido?" da planilha para o valor de status. */
export function statusDoTextoPlanilha(texto: string | null | undefined): string {
  const t = (texto ?? "").trim().toLowerCase()
  if (t === "sim") return "CONCLUIDA"
  if (t === "não" || t === "nao") return "PENDENTE"
  return "EM_TRATATIVA"
}
