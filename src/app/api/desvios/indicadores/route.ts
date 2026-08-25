import { NextResponse } from "next/server"
import { escopoContratanteAtual } from "@/lib/desvios/escopo-usuario"
import { indicadoresDesvios, mesesDisponiveis } from "@/lib/desvios"

export const dynamic = "force-dynamic"

// GET — indicadores do painel. `mes` (YYYY-MM) filtra tudo menos a evolução por mês.
// Sem `mes`, usa o mês mais recente com dados. Retorna também a lista de meses.
export async function GET(request: Request) {
  const { escopo } = await escopoContratanteAtual()
  const meses = await mesesDisponiveis(escopo)
  const pedido = new URL(request.url).searchParams.get("mes")
  const mes = pedido && meses.includes(pedido) ? pedido : (meses[0] ?? null)
  const indicadores = await indicadoresDesvios(escopo, mes)
  return NextResponse.json({ indicadores, meses, mes })
}
