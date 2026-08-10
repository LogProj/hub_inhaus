import { guardaConfig } from "@/lib/epi/guardas"
import { nomearLiderCrSchema, removerLiderCrSchema } from "@/lib/epi/schemas"
import { nomearLiderNoCr, removerLiderDoCr } from "@/lib/epi/config"
import { lerCorpo, erroInesperado, ok } from "@/lib/epi/http"

export const dynamic = "force-dynamic"

// Nomeia um líder para um CR da base (o cliente é resolvido pela base).
export async function POST(request: Request) {
  const guarda = await guardaConfig()
  if (!guarda.ok) return guarda.response

  const corpo = await lerCorpo(request, nomearLiderCrSchema)
  if (!corpo.ok) return corpo.response

  try {
    await nomearLiderNoCr(corpo.dados.cr, corpo.dados.authUserId, corpo.dados.nome)
    return ok()
  } catch (e) {
    return erroInesperado(e)
  }
}

// Remove um líder de um CR específico.
export async function DELETE(request: Request) {
  const guarda = await guardaConfig()
  if (!guarda.ok) return guarda.response

  const corpo = await lerCorpo(request, removerLiderCrSchema)
  if (!corpo.ok) return corpo.response

  try {
    await removerLiderDoCr(corpo.dados.cr, corpo.dados.authUserId)
    return ok()
  } catch (e) {
    return erroInesperado(e)
  }
}
