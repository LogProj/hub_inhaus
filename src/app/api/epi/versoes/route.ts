import { guardaConfig } from "@/lib/epi/guardas"
import { checklistVersaoSchema } from "@/lib/epi/schemas"
import { criarVersaoChecklist } from "@/lib/epi/config"
import { lerCorpo, erroInesperado, ok } from "@/lib/epi/http"

export const dynamic = "force-dynamic"

export async function POST(request: Request) {
  const guarda = await guardaConfig()
  if (!guarda.ok) return guarda.response

  const corpo = await lerCorpo(request, checklistVersaoSchema)
  if (!corpo.ok) return corpo.response

  try {
    const versao = await criarVersaoChecklist(corpo.dados.templateId, corpo.dados.itens)
    return ok(versao)
  } catch (e) {
    return erroInesperado(e)
  }
}
