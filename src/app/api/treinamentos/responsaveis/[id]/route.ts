import { guardaInterno } from "@/lib/treinamentos/guarda"
import { removerResponsavel } from "@/lib/treinamentos"
import { ok, erroInesperado } from "@/lib/epi/http"

export const dynamic = "force-dynamic"

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  const guarda = await guardaInterno()
  if (!guarda.ok) return guarda.response
  try {
    await removerResponsavel(params.id)
    return ok()
  } catch (e) {
    return erroInesperado(e)
  }
}
