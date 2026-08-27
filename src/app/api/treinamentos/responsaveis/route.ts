import { guardaInterno } from "@/lib/treinamentos/guarda"
import { responsavelSchema } from "@/lib/treinamentos/schemas"
import { adicionarResponsavel, listarResponsaveis } from "@/lib/treinamentos"
import { lerCorpo, ok, erroInesperado } from "@/lib/epi/http"

export const dynamic = "force-dynamic"

export async function GET() {
  const guarda = await guardaInterno()
  if (!guarda.ok) return guarda.response
  try {
    return ok(await listarResponsaveis())
  } catch (e) {
    return erroInesperado(e)
  }
}

export async function POST(request: Request) {
  const guarda = await guardaInterno()
  if (!guarda.ok) return guarda.response
  const corpo = await lerCorpo(request, responsavelSchema)
  if (!corpo.ok) return corpo.response
  try {
    return ok(await adicionarResponsavel(corpo.dados.nome))
  } catch (e) {
    return erroInesperado(e)
  }
}
