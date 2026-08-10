import { guardaConfig } from "@/lib/epi/guardas"
import { turnoUpdateSchema } from "@/lib/epi/schemas"
import { atualizarTurno } from "@/lib/epi/config"
import { lerCorpo, erroInesperado, ok } from "@/lib/epi/http"

export const dynamic = "force-dynamic"

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const guarda = await guardaConfig()
  if (!guarda.ok) return guarda.response

  const id = Number(params.id)
  if (!Number.isInteger(id)) return erroInesperado({ code: "P2025" })

  const corpo = await lerCorpo(request, turnoUpdateSchema)
  if (!corpo.ok) return corpo.response

  try {
    const turno = await atualizarTurno(id, corpo.dados)
    return ok(turno)
  } catch (e) {
    return erroInesperado(e)
  }
}
