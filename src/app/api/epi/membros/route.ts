import { guardaConfig } from "@/lib/epi/guardas"
import { membroEpiSchema } from "@/lib/epi/schemas"
import { criarMembro } from "@/lib/epi/config"
import { lerCorpo, erroInesperado, ok } from "@/lib/epi/http"

export const dynamic = "force-dynamic"

export async function POST(request: Request) {
  const guarda = await guardaConfig()
  if (!guarda.ok) return guarda.response

  const corpo = await lerCorpo(request, membroEpiSchema)
  if (!corpo.ok) return corpo.response

  try {
    const membro = await criarMembro(corpo.dados)
    return ok(membro)
  } catch (e) {
    return erroInesperado(e)
  }
}
