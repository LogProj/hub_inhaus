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

/** Status = "Caso Resolvido?" da planilha. Valor no banco → rótulo na tela. */
export const STATUS_DESVIO = [
  { value: "EM_TRATATIVA", label: "Em tratativa" },
  { value: "NAO", label: "Não" },
  { value: "SIM", label: "Sim" },
] as const

/** Mapeia o texto "Caso Resolvido?" da planilha para o valor de status. */
export function statusDoTextoPlanilha(texto: string | null | undefined): string {
  const t = (texto ?? "").trim().toLowerCase()
  if (t === "sim") return "SIM"
  if (t === "não" || t === "nao") return "NAO"
  return "EM_TRATATIVA"
}
