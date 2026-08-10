import { guardaConfig } from "@/lib/epi/guardas"
import { checklistTemplateSchema } from "@/lib/epi/schemas"
import { criarTemplate } from "@/lib/epi/config"
import { lerCorpo, erroInesperado, ok } from "@/lib/epi/http"

export const dynamic = "force-dynamic"

// Cria um checklist na biblioteca global (sem versões ainda).
export async function POST(request: Request) {
  const guarda = await guardaConfig()
  if (!guarda.ok) return guarda.response

  const corpo = await lerCorpo(request, checklistTemplateSchema)
  if (!corpo.ok) return corpo.response

  try {
    const template = await criarTemplate(corpo.dados.nome)
    return ok(template)
  } catch (e) {
    return erroInesperado(e)
  }
}
