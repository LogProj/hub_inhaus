import { NextResponse } from "next/server"
import { guardAdmin } from "@/lib/admin-guard"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

// Lista os grupos de cliente e os CRs da dm_cr para os seletores da tela de Usuários.
export async function GET() {
  const g = await guardAdmin()
  if (!g.ok) return g.response

  const linhas = await prisma.$queryRaw<{ cr: string; nome_grp_cliente: string | null; descri_cr: string | null }[]>`
    select cr, nome_grp_cliente, descri_cr from dm_cr order by nome_grp_cliente nulls last, cr
  `
  const clientes = Array.from(
    new Set(linhas.map((l) => l.nome_grp_cliente).filter((v): v is string => !!v)),
  )
  const crs = linhas.map((l) => ({
    cr: l.cr,
    cliente: l.nome_grp_cliente,
    descricao: l.descri_cr,
  }))
  return NextResponse.json({ clientes, crs })
}
