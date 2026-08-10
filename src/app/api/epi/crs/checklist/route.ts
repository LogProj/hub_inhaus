import { guardaConfig } from "@/lib/epi/guardas"
import { vincularChecklistSchema } from "@/lib/epi/schemas"
import { vincularChecklistAoCr } from "@/lib/epi/config"
import { lerCorpo, erroInesperado, ok } from "@/lib/epi/http"

export const dynamic = "force-dynamic"

// Vincula (ou desvincula com null) um checklist da biblioteca a um CR.
export async function POST(request: Request) {
  const guarda = await guardaConfig()
  if (!guarda.ok) return guarda.response

  const corpo = await lerCorpo(request, vincularChecklistSchema)
  if (!corpo.ok) return corpo.response

  try {
    await vincularChecklistAoCr(corpo.dados.cr, corpo.dados.checklistTemplateId)
    return ok()
  } catch (e) {
    return erroInesperado(e)
  }
}
