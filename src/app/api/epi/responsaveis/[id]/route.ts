import { guardaConfig } from "@/lib/epi/guardas"
import { encerrarResponsavel } from "@/lib/epi/config"
import { erroInesperado, ok } from "@/lib/epi/http"

export const dynamic = "force-dynamic"

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  const guarda = await guardaConfig()
  if (!guarda.ok) return guarda.response

  const id = Number(params.id)
  if (!Number.isInteger(id)) return erroInesperado({ code: "P2025" })

  try {
    await encerrarResponsavel(id)
    return ok()
  } catch (e) {
    return erroInesperado(e)
  }
}
