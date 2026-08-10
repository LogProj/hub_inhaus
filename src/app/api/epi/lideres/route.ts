import { guardaConfig } from "@/lib/epi/guardas"
import { liderCrsSchema, removerLiderSchema } from "@/lib/epi/schemas"
import { definirLiderCrs, removerLiderDoCliente, listarLideresDoCr } from "@/lib/epi/config"
import { lerCorpo, erroInesperado, ok } from "@/lib/epi/http"

export const dynamic = "force-dynamic"

// Lista os líderes vigentes de um CR (?cr=...) — usado pelo assistente para mostrar
// quem já responde pelo CR selecionado.
export async function GET(request: Request) {
  const guarda = await guardaConfig()
  if (!guarda.ok) return guarda.response

  const cr = new URL(request.url).searchParams.get("cr")?.trim()
  if (!cr) return ok({ lideres: [] })

  try {
    return ok({ lideres: await listarLideresDoCr(cr) })
  } catch (e) {
    return erroInesperado(e)
  }
}

// Define os CRs que um líder responde num cliente (substituir ou adicionar).
export async function POST(request: Request) {
  const guarda = await guardaConfig()
  if (!guarda.ok) return guarda.response

  const corpo = await lerCorpo(request, liderCrsSchema)
  if (!corpo.ok) return corpo.response

  try {
    await definirLiderCrs(
      corpo.dados.clienteId,
      corpo.dados.authUserId,
      corpo.dados.nome,
      corpo.dados.crs,
      corpo.dados.modo,
    )
    return ok()
  } catch (e) {
    return erroInesperado(e)
  }
}

// Remove um líder de um cliente (encerra todas as suas responsabilidades).
export async function DELETE(request: Request) {
  const guarda = await guardaConfig()
  if (!guarda.ok) return guarda.response

  const corpo = await lerCorpo(request, removerLiderSchema)
  if (!corpo.ok) return corpo.response

  try {
    await removerLiderDoCliente(corpo.dados.clienteId, corpo.dados.authUserId)
    return ok()
  } catch (e) {
    return erroInesperado(e)
  }
}
