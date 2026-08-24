/**
 * NÚCLEO DE SEGURANÇA — isolamento de dados por CR/cliente.
 *
 * Regras (em sincronia com o spec 2026-08-24 e com os textos de InfoIndicador):
 *  - A chave de isolamento é o CÓDIGO do CR (5 chars, casa com dm_cr.cr).
 *  - O `cr` bruto da SRA é texto "CODIGO - Nome"; o código é o trecho antes do
 *    primeiro " - ", com zero-pad à esquerda até 5 chars quando tem menos.
 *  - Escopo `todos` = sem filtro (admin interno). `lista` = só os CRs informados.
 *    Lista vazia = NADA (fail-closed).
 *
 * Módulo server-only.
 */

/** Deriva o código de 5 chars a partir do CR bruto (texto da SRA ou já o código). */
export function codigoCr(crBruto: string | null | undefined): string | null {
  if (!crBruto) return null
  const cod = crBruto.split(" - ")[0]?.trim() ?? ""
  if (!cod) return null
  return cod.length < 5 ? cod.padStart(5, "0") : cod
}
