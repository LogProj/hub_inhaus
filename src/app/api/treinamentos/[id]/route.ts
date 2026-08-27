import { guardaInterno } from "@/lib/treinamentos/guarda"
import { atualizarTreinamentoSchema } from "@/lib/treinamentos/schemas"
import { encerrarTreinamento, editarTreinamento } from "@/lib/treinamentos"
import { lerCorpo, ok, erroInesperado } from "@/lib/epi/http"

export const dynamic = "force-dynamic"

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const guarda = await guardaInterno()
  if (!guarda.ok) return guarda.response
  const corpo = await lerCorpo(request, atualizarTreinamentoSchema)
  if (!corpo.ok) return corpo.response
  try {
    if ("status" in corpo.dados) {
      await encerrarTreinamento(params.id)
    } else {
      await editarTreinamento(params.id, corpo.dados)
    }
    return ok()
  } catch (e) {
    return erroInesperado(e)
  }
}
