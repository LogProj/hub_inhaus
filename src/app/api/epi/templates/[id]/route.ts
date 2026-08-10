import { NextResponse } from "next/server"

import { guardaConfig } from "@/lib/epi/guardas"
import { checklistTemplateUpdateSchema } from "@/lib/epi/schemas"
import { renomearTemplate, excluirTemplate } from "@/lib/epi/config"
import { lerCorpo, erroInesperado, ok } from "@/lib/epi/http"

export const dynamic = "force-dynamic"

// Renomeia um checklist da biblioteca.
export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const guarda = await guardaConfig()
  if (!guarda.ok) return guarda.response

  const id = Number(params.id)
  if (!Number.isInteger(id)) return erroInesperado({ code: "P2025" })

  const corpo = await lerCorpo(request, checklistTemplateUpdateSchema)
  if (!corpo.ok) return corpo.response

  try {
    const template = await renomearTemplate(id, corpo.dados.nome)
    return ok(template)
  } catch (e) {
    return erroInesperado(e)
  }
}

// Exclui (arquiva) um checklist. Bloqueia se estiver vinculado a algum setor.
export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  const guarda = await guardaConfig()
  if (!guarda.ok) return guarda.response

  const id = Number(params.id)
  if (!Number.isInteger(id)) return erroInesperado({ code: "P2025" })

  try {
    const resultado = await excluirTemplate(id)
    if (!resultado.ok) return NextResponse.json({ error: resultado.erro }, { status: 409 })
    return ok()
  } catch (e) {
    return erroInesperado(e)
  }
}
