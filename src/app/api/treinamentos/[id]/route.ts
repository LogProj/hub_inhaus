import { guardaInterno } from "@/lib/treinamentos/guarda"
import { encerrarSchema } from "@/lib/treinamentos/schemas"
import { encerrarTreinamento } from "@/lib/treinamentos"
import { lerCorpo, ok, erroInesperado } from "@/lib/epi/http"

export const dynamic = "force-dynamic"

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const guarda = await guardaInterno()
  if (!guarda.ok) return guarda.response
  const corpo = await lerCorpo(request, encerrarSchema)
  if (!corpo.ok) return corpo.response
  try {
    await encerrarTreinamento(params.id)
    return ok()
  } catch (e) {
    return erroInesperado(e)
  }
}
