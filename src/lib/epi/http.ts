import { NextResponse } from "next/server"
import { ZodError, type ZodSchema } from "zod"

/**
 * Utilitários compartilhados dos route handlers de EPI. Padrão de erro do projeto:
 * sempre `{ error: string }` com o status apropriado (ver src/app/api/auth/*).
 */

export async function lerCorpo<T>(
  request: Request,
  schema: ZodSchema<T>,
): Promise<{ ok: true; dados: T } | { ok: false; response: NextResponse }> {
  let bruto: unknown
  try {
    bruto = await request.json()
  } catch {
    return { ok: false, response: NextResponse.json({ error: "Requisição inválida" }, { status: 400 }) }
  }
  const parsed = schema.safeParse(bruto)
  if (!parsed.success) {
    return { ok: false, response: NextResponse.json({ error: primeiroErro(parsed.error) }, { status: 400 }) }
  }
  return { ok: true, dados: parsed.data }
}

function primeiroErro(erro: ZodError): string {
  return erro.issues[0]?.message ?? "Dados inválidos"
}

/** Converte exceções (inclusive violação de unique do Prisma) numa resposta amigável. */
export function erroInesperado(e: unknown): NextResponse {
  const codigo = (e as { code?: string })?.code
  if (codigo === "P2002") {
    return NextResponse.json({ error: "Registro já existe (valor duplicado)." }, { status: 409 })
  }
  if (codigo === "P2025") {
    return NextResponse.json({ error: "Registro não encontrado." }, { status: 404 })
  }
  const mensagem = e instanceof Error ? e.message : "Falha ao processar a solicitação"
  return NextResponse.json({ error: mensagem }, { status: 500 })
}

export function ok(dados: unknown = { ok: true }): NextResponse {
  return NextResponse.json(dados)
}
