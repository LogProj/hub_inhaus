import { guardaInterno } from "@/lib/treinamentos/guarda"
import { criarTreinamentoSchema } from "@/lib/treinamentos/schemas"
import { criarTreinamento, listarTreinamentos } from "@/lib/treinamentos"
import { lerCorpo, ok, erroInesperado } from "@/lib/epi/http"

export const dynamic = "force-dynamic"

export async function GET() {
  const guarda = await guardaInterno()
  if (!guarda.ok) return guarda.response
  try {
    return ok(await listarTreinamentos())
  } catch (e) {
    return erroInesperado(e)
  }
}

export async function POST(request: Request) {
  const guarda = await guardaInterno()
  if (!guarda.ok) return guarda.response
  const corpo = await lerCorpo(request, criarTreinamentoSchema)
  if (!corpo.ok) return corpo.response
  try {
    const t = await criarTreinamento({ ...corpo.dados, criadoPorId: guarda.autor.authUserId })
    return ok({ id: t.id, tokenPublico: t.tokenPublico })
  } catch (e) {
    return erroInesperado(e)
  }
}
