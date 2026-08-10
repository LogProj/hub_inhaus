import { randomBytes } from "crypto"

/**
 * Tokens opacos do módulo de EPI (token público do turno, token da sessão).
 * URL-safe, sem depender de lib externa. Não são segredos criptográficos de alto
 * valor — são identificadores difíceis de adivinhar para o link público.
 */
export function gerarToken(bytes = 16): string {
  return randomBytes(bytes).toString("base64url")
}
