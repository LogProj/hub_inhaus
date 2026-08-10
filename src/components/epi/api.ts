/**
 * Helper client-side para chamar os route handlers de EPI. Padroniza o header
 * JSON e desembrulha o erro `{ error }` do backend numa exceção com mensagem.
 */

async function chamar(url: string, init: RequestInit): Promise<unknown> {
  let res: Response
  try {
    res = await fetch(url, {
      headers: { "Content-Type": "application/json" },
      ...init,
    })
  } catch {
    // Falha de rede (servidor fora do ar, conexão instável): mensagem amigável.
    throw new Error("Sem conexão com o servidor. Verifique a internet e tente novamente.")
  }
  const dados = await res.json().catch(() => ({}))
  if (!res.ok) {
    const mensagem = (dados as { error?: string })?.error ?? "Falha na operação"
    throw new Error(mensagem)
  }
  return dados
}

export const postJson = (url: string, body: unknown) =>
  chamar(url, { method: "POST", body: JSON.stringify(body) })

export const patchJson = (url: string, body: unknown) =>
  chamar(url, { method: "PATCH", body: JSON.stringify(body) })

export const delJson = (url: string, body?: unknown) =>
  chamar(url, { method: "DELETE", body: body ? JSON.stringify(body) : undefined })
