import { NextResponse } from "next/server"

import { getCurrentSession } from "@/lib/auth-session"
import { acessoLivreLiberado, USUARIO_DEV } from "@/lib/dev-auth"

/**
 * Guarda dos route handlers de TREINAMENTOS. Honra o ACESSO LIVRE de dev (senão daria
 * 401 em dev, onde não há cookie). Módulo interno: exige usuário logado E com a TELA
 * de Treinamentos concedida (admin passa sempre) — senão qualquer interno logado poderia
 * criar/encerrar treinamento chamando a API direto, mesmo sem a tela. A lista de presença
 * não é amarrada por CR (decisão de negócio).
 */
export const TELA_TREINAMENTOS = "treinamentos-registro"

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

  const { isAdmin, visibleScreens } = sessao.authorization
  if (!isAdmin && !visibleScreens.includes(TELA_TREINAMENTOS)) {
    return { ok: false, response: NextResponse.json({ error: "Acesso restrito" }, { status: 403 }) }
  }

  return {
    ok: true,
    autor: {
      authUserId: sessao.user.id ?? null,
      nome: sessao.authorization.nome,
      isAdmin,
    },
  }
}
