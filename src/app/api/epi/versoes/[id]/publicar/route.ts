import { guardaConfig } from "@/lib/epi/guardas"
import { publicarVersao } from "@/lib/epi/config"
import { erroInesperado, ok } from "@/lib/epi/http"

export const dynamic = "force-dynamic"

export async function POST(_request: Request, { params }: { params: { id: string } }) {
  const guarda = await guardaConfig()
  if (!guarda.ok) return guarda.response

  const id = Number(params.id)
  if (!Number.isInteger(id)) return erroInesperado({ code: "P2025" })

  try {
    const versao = await publicarVersao(id)
    return ok(versao)
  } catch (e) {
    return erroInesperado(e)
  }
}
