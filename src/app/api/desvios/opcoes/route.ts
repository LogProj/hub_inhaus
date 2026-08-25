import { NextResponse } from "next/server"
import { guardAdmin } from "@/lib/admin-guard"
import { getUsuarioAtual } from "@/lib/epi/guardas"
import { contratanteAtlasId } from "@/lib/desvios"
import {
  opcoesEfetivas,
  opcoesCustom,
  adicionarOpcao,
  removerOpcao,
  ehCampoLista,
  CAMPOS_LISTA,
  CAMPOS_LISTA_KEYS,
} from "@/lib/desvios/opcoes-cliente"

export const dynamic = "force-dynamic"

const CAMPOS = CAMPOS_LISTA_KEYS.map((key) => ({ key, label: CAMPOS_LISTA[key].label }))

// GET — opções efetivas (padrão + extras) e os extras (removíveis). Qualquer usuário
// autenticado (ou acesso livre de dev) que enxerga o formulário pode ler.
export async function GET() {
  const u = await getUsuarioAtual()
  if (!u) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  const contratanteId = await contratanteAtlasId()
  if (!contratanteId) return NextResponse.json({ error: "Cliente não configurado." }, { status: 503 })
  const [opcoes, custom] = await Promise.all([
    opcoesEfetivas(contratanteId),
    opcoesCustom(contratanteId),
  ])
  return NextResponse.json({ opcoes, custom, campos: CAMPOS })
}

async function corpoValido(request: Request) {
  let corpo: unknown
  try {
    corpo = await request.json()
  } catch {
    return { erro: "Requisição inválida" as const }
  }
  const c = corpo as { campo?: string; valor?: string }
  if (!c.campo || !ehCampoLista(c.campo)) return { erro: "Campo inválido" as const }
  if (typeof c.valor !== "string" || !c.valor.trim()) return { erro: "Informe um valor." as const }
  return { campo: c.campo, valor: c.valor.trim() }
}

// POST — adiciona um valor extra a uma lista (só admin).
export async function POST(request: Request) {
  const g = await guardAdmin()
  if (!g.ok) return g.response
  const contratanteId = await contratanteAtlasId()
  if (!contratanteId) return NextResponse.json({ error: "Cliente não configurado." }, { status: 503 })
  const parsed = await corpoValido(request)
  if ("erro" in parsed) return NextResponse.json({ error: parsed.erro }, { status: 400 })
  await adicionarOpcao(contratanteId, parsed.campo, parsed.valor)
  const custom = await opcoesCustom(contratanteId)
  return NextResponse.json({ custom, opcoes: await opcoesEfetivas(contratanteId) })
}

// DELETE — remove um valor extra (padrões não são removíveis; só admin).
export async function DELETE(request: Request) {
  const g = await guardAdmin()
  if (!g.ok) return g.response
  const contratanteId = await contratanteAtlasId()
  if (!contratanteId) return NextResponse.json({ error: "Cliente não configurado." }, { status: 503 })
  const parsed = await corpoValido(request)
  if ("erro" in parsed) return NextResponse.json({ error: parsed.erro }, { status: 400 })
  await removerOpcao(contratanteId, parsed.campo, parsed.valor)
  const custom = await opcoesCustom(contratanteId)
  return NextResponse.json({ custom, opcoes: await opcoesEfetivas(contratanteId) })
}
