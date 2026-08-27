import { NextResponse } from "next/server"

import { getCurrentSession } from "@/lib/auth-session"
import { acessoLivreLiberado, USUARIO_DEV } from "@/lib/dev-auth"

/**
 * Guarda dos route handlers de TREINAMENTOS. Honra o ACESSO LIVRE de dev (senão daria
 * 401 em dev, onde não há cookie). Módulo interno: exige usuário logado. A visibilidade
 * por tela é responsabilidade das páginas (assertTelaVisivel); a lista de presença não
 * é amarrada por CR (decisão de negócio).
 */
export type Autor = { authUserId: string | null; nome: string | null; isAdmin: boolean }

export type ResultadoGuarda =
  | { ok: true; autor: Autor }
  | { ok: false; response: NextResponse }

export async function guardaInterno(): Promise<ResultadoGuarda> {
  if (acessoLivreLiberado()) {
    return { ok: true, autor: { authUserId: null, nome: USUARIO_DEV.nome, isAdmin: USUARIO_DEV.isAdmin } }
  }
  const sessao = await getCurrentSession()
  if (!sessao) return { ok: false, response: NextResponse.json({ error: "Não autorizado" }, { status: 401 }) }
  return {
    ok: true,
    autor: {
      authUserId: sessao.user.id ?? null,
      nome: sessao.authorization.nome,
      isAdmin: sessao.authorization.isAdmin,
    },
  }
}
