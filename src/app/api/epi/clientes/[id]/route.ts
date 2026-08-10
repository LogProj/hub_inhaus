import { guardaConfig } from "@/lib/epi/guardas"
import { clienteUpdateSchema } from "@/lib/epi/schemas"
import { atualizarCliente } from "@/lib/epi/config"
import { lerCorpo, erroInesperado, ok } from "@/lib/epi/http"

export const dynamic = "force-dynamic"

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const guarda = await guardaConfig()
  if (!guarda.ok) return guarda.response

  const id = Number(params.id)
  if (!Number.isInteger(id)) return erroInesperado({ code: "P2025" })

  const corpo = await lerCorpo(request, clienteUpdateSchema)
  if (!corpo.ok) return corpo.response

  try {
    const cliente = await atualizarCliente(id, corpo.dados)
    return ok(cliente)
  } catch (e) {
    return erroInesperado(e)
  }
}
