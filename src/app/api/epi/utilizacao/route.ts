import { NextResponse } from "next/server"

import { guardaValidador } from "@/lib/epi/guardas"
import { registrarUtilizacaoSchema } from "@/lib/epi/schemas"
import { registrarUtilizacao } from "@/lib/epi/utilizacao"
import { lerCorpo, erroInesperado, ok } from "@/lib/epi/http"

export const dynamic = "force-dynamic"

// O líder registra a utilização de EPIs do turno no dia (por colaborador).
export async function POST(request: Request) {
  const guarda = await guardaValidador()
  if (!guarda.ok) return guarda.response

  const corpo = await lerCorpo(request, registrarUtilizacaoSchema)
  if (!corpo.ok) return corpo.response

  try {
    const r = await registrarUtilizacao(
      corpo.dados.turnoId,
      corpo.dados.data,
      corpo.dados.entradas,
      guarda.usuario,
      guarda.escopo,
    )
    if (!r.ok) return NextResponse.json({ error: r.erro }, { status: 400 })
    return ok({ ok: true })
  } catch (e) {
    return erroInesperado(e)
  }
}
