import { guardaValidador } from "@/lib/epi/guardas"
import { validarSessaoIdSchema } from "@/lib/epi/schemas"
import { validarSessao } from "@/lib/epi/sessao"
import { lerCorpo, erroInesperado, ok } from "@/lib/epi/http"
import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

export async function POST(request: Request) {
  const guarda = await guardaValidador()
  if (!guarda.ok) return guarda.response

  const corpo = await lerCorpo(request, validarSessaoIdSchema)
  if (!corpo.ok) return corpo.response

  try {
    const resultado = await validarSessao(
      corpo.dados.sessaoId,
      guarda.usuario,
      guarda.escopo,
      corpo.dados.presencas,
    )
    if (!resultado.ok) return NextResponse.json({ error: resultado.erro }, { status: 422 })
    return ok()
  } catch (e) {
    return erroInesperado(e)
  }
}
