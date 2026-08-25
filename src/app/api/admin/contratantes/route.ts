import { NextResponse } from "next/server"
import { guardAdmin } from "@/lib/admin-guard"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

// Lista clientes contratantes (multi-tenant) ativos, para os seletores de escopo
// da tela de Usuários.
export async function GET() {
  const g = await guardAdmin()
  if (!g.ok) return g.response
  const contratantes = await prisma.clienteContratante.findMany({
    where: { ativo: true },
    orderBy: { nome: "asc" },
    select: { id: true, nome: true },
  })
  return NextResponse.json({ contratantes })
}
