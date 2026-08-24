import { NextResponse } from "next/server"

import { getSessionReadOnly } from "@/lib/auth-session"
import { acessoLivreLiberado } from "@/lib/dev-auth"
import { guardaParametrizador } from "@/lib/epi/guardas"
import { getPainelAlocacao } from "@/lib/epi/atribuicao"
import { codigoCr, resolverEscopoDados, type EscopoDados } from "@/lib/seguranca/escopo-dados"

export const dynamic = "force-dynamic"

// GET /api/epi/colaboradores?cr=<cr> — quadro ativo do CR com o turno atual de cada
// pessoa (para o passo de alocação do assistente).
export async function GET(request: Request) {
  const guarda = await guardaParametrizador()
  if (!guarda.ok) return guarda.response

  const cr = new URL(request.url).searchParams.get("cr")
  if (!cr) return NextResponse.json({ error: "Informe o setor (CR)." }, { status: 400 })

  // Barreira de segurança: mesmo tendo poder de parametrizar, o usuário só pode
  // enxergar o quadro dos CRs dentro do seu escopo de dados. Acesso livre de dev
  // (admin interno sem cookie) enxerga tudo.
  let escopo: EscopoDados = { tipo: "todos" }
  if (!acessoLivreLiberado()) {
    const r = await getSessionReadOnly()
    if (r.status !== "ok") {
      escopo = { tipo: "lista", crs: [] }
    } else {
      escopo = await resolverEscopoDados({
        authUserId: r.sessao.user.id,
        isAdmin: r.sessao.authorization.isAdmin,
        classificacao: r.sessao.authorization.classificacao,
      })
    }
  }
  if (escopo.tipo === "lista") {
    const cod = codigoCr(cr)
    if (!cod || !escopo.crs.includes(cod)) {
      return NextResponse.json({ error: "Sem acesso a este setor (CR)." }, { status: 403 })
    }
  }

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
