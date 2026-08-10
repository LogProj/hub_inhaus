import { guardaConfig } from "@/lib/epi/guardas"
import { clienteCrSchema } from "@/lib/epi/schemas"
import { criarClienteCr } from "@/lib/epi/config"
import { lerCorpo, erroInesperado, ok } from "@/lib/epi/http"

export const dynamic = "force-dynamic"

export async function POST(request: Request) {
  const guarda = await guardaConfig()
  if (!guarda.ok) return guarda.response

  const corpo = await lerCorpo(request, clienteCrSchema)
  if (!corpo.ok) return corpo.response

  try {
    const vinculo = await criarClienteCr(corpo.dados.clienteId, corpo.dados.cr)
    return ok(vinculo)
  } catch (e) {
    return erroInesperado(e)
  }
}
