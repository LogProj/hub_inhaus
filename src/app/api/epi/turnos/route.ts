import { guardaConfig } from "@/lib/epi/guardas"
import { turnoSchema } from "@/lib/epi/schemas"
import { criarTurno } from "@/lib/epi/config"
import { lerCorpo, erroInesperado, ok } from "@/lib/epi/http"

export const dynamic = "force-dynamic"

export async function POST(request: Request) {
  const guarda = await guardaConfig()
  if (!guarda.ok) return guarda.response

  const corpo = await lerCorpo(request, turnoSchema)
  if (!corpo.ok) return corpo.response

  try {
    const turno = await criarTurno(corpo.dados)
    return ok(turno)
  } catch (e) {
    return erroInesperado(e)
  }
}
