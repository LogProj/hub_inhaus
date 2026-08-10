import { guardaConfig } from "@/lib/epi/guardas"
import { responsavelTurnoSchema } from "@/lib/epi/schemas"
import { adicionarResponsavel } from "@/lib/epi/config"
import { lerCorpo, erroInesperado, ok } from "@/lib/epi/http"

export const dynamic = "force-dynamic"

export async function POST(request: Request) {
  const guarda = await guardaConfig()
  if (!guarda.ok) return guarda.response

  const corpo = await lerCorpo(request, responsavelTurnoSchema)
  if (!corpo.ok) return corpo.response

  try {
    const responsavel = await adicionarResponsavel(corpo.dados)
    return ok(responsavel)
  } catch (e) {
    return erroInesperado(e)
  }
}
