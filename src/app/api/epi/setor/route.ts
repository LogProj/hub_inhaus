import { guardaConfig } from "@/lib/epi/guardas"
import { setorPorCrSchema } from "@/lib/epi/schemas"
import { vincularSetorPorCr } from "@/lib/epi/config"
import { lerCorpo, erroInesperado, ok } from "@/lib/epi/http"

export const dynamic = "force-dynamic"

// Assistente: escolher o CR resolve o cliente (via dm_cr) e vincula o setor.
export async function POST(request: Request) {
  const guarda = await guardaConfig()
  if (!guarda.ok) return guarda.response

  const corpo = await lerCorpo(request, setorPorCrSchema)
  if (!corpo.ok) return corpo.response

  try {
    const setor = await vincularSetorPorCr(corpo.dados.cr)
    return ok(setor)
  } catch (e) {
    return erroInesperado(e)
  }
}
