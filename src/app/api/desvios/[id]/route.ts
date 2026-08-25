import { NextResponse } from "next/server"
import { escopoContratanteAtual } from "@/lib/desvios/escopo-usuario"
import { atualizarDesvio } from "@/lib/desvios"
import { atualizarDesvioSchema } from "@/lib/desvios/schemas"

export const dynamic = "force-dynamic"

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const id = Number(params.id)
  if (!Number.isInteger(id)) return NextResponse.json({ error: "id inválido" }, { status: 400 })
  const { escopo, autor } = await escopoContratanteAtual()
  let corpo: unknown
  try {
    corpo = await request.json()
  } catch {
    return NextResponse.json({ error: "Requisição inválida" }, { status: 400 })
  }
  const parsed = atualizarDesvioSchema.safeParse(corpo)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Dados inválidos" },
      { status: 400 },
    )
  }
  try {
    const desvio = await atualizarDesvio(escopo, id, parsed.data, autor)
    return NextResponse.json({ desvio })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Falha ao atualizar" },
      { status: 400 },
    )
  }
}
