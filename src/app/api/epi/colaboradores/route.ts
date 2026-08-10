import { NextResponse } from "next/server"

import { guardaParametrizador } from "@/lib/epi/guardas"
import { getPainelAlocacao } from "@/lib/epi/atribuicao"

export const dynamic = "force-dynamic"

// GET /api/epi/colaboradores?cr=<cr> — quadro ativo do CR com o turno atual de cada
// pessoa (para o passo de alocação do assistente).
export async function GET(request: Request) {
  const guarda = await guardaParametrizador()
  if (!guarda.ok) return guarda.response

  const cr = new URL(request.url).searchParams.get("cr")
  if (!cr) return NextResponse.json({ error: "Informe o setor (CR)." }, { status: 400 })

  try {
    const painel = await getPainelAlocacao(cr)
    return NextResponse.json({
      colaboradores: painel.map((l) => ({
        cpfHash: l.colaborador.cpfHash,
        nome: l.colaborador.nome,
        cargo: l.colaborador.cargo,
        matricula: l.colaborador.matricula,
        turnoId: l.turnoId,
      })),
    })
  } catch (e) {
    const mensagem = e instanceof Error ? e.message : "Falha ao carregar"
    return NextResponse.json({ error: mensagem }, { status: 500 })
  }
}
