import { createHmac, timingSafeEqual } from "crypto"

/**
 * Identidade do colaborador no módulo de EPI.
 *
 * Regra de negócio / privacidade (LGPD): o CPF é a única chave que identifica a
 * pessoa de forma estável na SRA (a matrícula colide entre CRs). Mas NUNCA
 * guardamos o CPF em claro nem o colocamos em URL — guardamos apenas o HMAC-SHA256
 * dele (`cpfHash`), com um segredo do servidor (`EPI_CPF_SECRET`). Para verificar
 * quem preencheu o checklist, comparamos hash com hash.
 *
 * Módulo server-only (usa `crypto` e lê o segredo do ambiente).
 */

/** Mantém apenas os dígitos do CPF (o relatório às vezes vem com pontos/traços). */
export function normalizarCpf(entrada: string): string {
  return (entrada ?? "").replace(/\D/g, "")
}

/** Um CPF válido para uso aqui = exatamente 11 dígitos. Não valida dígito verificador
 * de propósito: a fonte é o cadastro da SRA, não um formulário aberto. */
export function cpfTemFormato(entrada: string): boolean {
  return normalizarCpf(entrada).length === 11
}

function segredo(): string {
  const s = process.env.EPI_CPF_SECRET
  if (!s) {
    throw new Error(
      "EPI_CPF_SECRET não configurado. Defina no .env.local — é o segredo do HMAC do CPF do módulo de EPI.",
    )
  }
  return s
}

/** HMAC-SHA256 do CPF (só dígitos), em hex. Identidade estável do colaborador. */
export function hmacCpf(cpf: string): string {
  const digitos = normalizarCpf(cpf)
  return createHmac("sha256", segredo()).update(digitos).digest("hex")
}

/** Comparação em tempo constante de dois hashes hex (evita timing attack na verificação do QR). */
export function hashIguais(a: string, b: string): boolean {
  if (typeof a !== "string" || typeof b !== "string" || a.length !== b.length) return false
  try {
    return timingSafeEqual(Buffer.from(a, "hex"), Buffer.from(b, "hex"))
  } catch {
    return false
  }
}
