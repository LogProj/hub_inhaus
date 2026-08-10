import { guardaConfig } from "@/lib/epi/guardas"
import { clienteSchema } from "@/lib/epi/schemas"
import { criarCliente } from "@/lib/epi/config"
import { lerCorpo, erroInesperado, ok } from "@/lib/epi/http"

export const dynamic = "force-dynamic"

export async function POST(request: Request) {
  const guarda = await guardaConfig()
  if (!guarda.ok) return guarda.response

  const corpo = await lerCorpo(request, clienteSchema)
  if (!corpo.ok) return corpo.response

  try {
    const cliente = await criarCliente(corpo.dados.nome)
    return ok(cliente)
  } catch (e) {
    return erroInesperado(e)
  }
}
