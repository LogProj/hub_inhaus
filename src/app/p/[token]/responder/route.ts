import { NextResponse } from "next/server"

import { responderSchema } from "@/lib/epi/schemas"
import { registrarRespostaPublica } from "@/lib/epi/sessao"

// Rota PÚBLICA (sem login) — autorizada pelo token do turno + verificação do CPF.
export const dynamic = "force-dynamic"

export async function POST(request: Request, { params }: { params: { token: string } }) {
  let bruto: unknown
  try {
    bruto = await request.json()
  } catch {
    return NextResponse.json({ error: "Requisição inválida" }, { status: 400 })
  }

  const parsed = responderSchema.safeParse({ ...(bruto as object), token: params.token })
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Dados inválidos" }, { status: 400 })
  }

  try {
    const resultado = await registrarRespostaPublica({
      token: parsed.data.token,
      pessoa: parsed.data.pessoa,
      cpf: parsed.data.cpf,
      respostas: parsed.data.respostas,
    })
    if (!resultado.ok) {
      return NextResponse.json({ error: resultado.erro }, { status: 422 })
    }
    return NextResponse.json({ ok: true, conforme: resultado.conforme })
  } catch (e) {
    const mensagem = e instanceof Error ? e.message : "Falha ao registrar"
    return NextResponse.json({ error: mensagem }, { status: 500 })
  }
}
