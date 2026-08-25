import { NextResponse } from "next/server"
import { escopoContratanteAtual } from "@/lib/desvios/escopo-usuario"
import { listarDesvios, contarPorStatus, criarDesvio, contratanteAtlasId } from "@/lib/desvios"
import { criarDesvioSchema } from "@/lib/desvios/schemas"

export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  const { escopo } = await escopoContratanteAtual()
  const url = new URL(request.url)
  const pagina = Math.max(1, Number(url.searchParams.get("pagina") ?? "1") || 1)
  const porPagina = Math.min(100, Math.max(10, Number(url.searchParams.get("porPagina") ?? "20") || 20))
  const [lista, contadores] = await Promise.all([
    listarDesvios(escopo, {
      status: url.searchParams.get("status"),
      clienteFinal: url.searchParams.get("cliente"),
      tipo: url.searchParams.get("tipo"),
      busca: url.searchParams.get("busca"),
      pagina,
      porPagina,
    }),
    contarPorStatus(escopo),
  ])
  return NextResponse.json({ ...lista, contadores, pagina, porPagina })
}

export async function POST(request: Request) {
  const { escopo, autor } = await escopoContratanteAtual()
  let corpo: unknown
  try {
    corpo = await request.json()
  } catch {
    return NextResponse.json({ error: "Requisição inválida" }, { status: 400 })
  }
  const parsed = criarDesvioSchema.safeParse(corpo)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Dados inválidos" },
      { status: 400 },
    )
  }
  const contratanteId = await contratanteAtlasId()
  if (!contratanteId) {
    return NextResponse.json({ error: "Cliente contratante não configurado." }, { status: 503 })
  }
  try {
    const desvio = await criarDesvio(escopo, contratanteId, parsed.data, autor)
    return NextResponse.json({ desvio })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Falha ao criar" },
      { status: 400 },
    )
  }
}
