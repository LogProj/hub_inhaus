import { confirmarPresencaSchema } from "@/lib/treinamentos/schemas"
import { confirmarPresenca } from "@/lib/treinamentos"
import { lerCorpo, ok, erroInesperado } from "@/lib/epi/http"
import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

export async function POST(request: Request, { params }: { params: { token: string } }) {
  const corpo = await lerCorpo(request, confirmarPresencaSchema)
  if (!corpo.ok) return corpo.response
  try {
    const r = await confirmarPresenca(params.token, corpo.dados.cpf)
    if (r === null) return NextResponse.json({ error: "Treinamento não encontrado" }, { status: 404 })
    if (r.estado === "encerrado")
      return NextResponse.json({ error: "Este treinamento já foi encerrado." }, { status: 409 })
    return ok(r)
  } catch (e) {
    return erroInesperado(e)
  }
}
