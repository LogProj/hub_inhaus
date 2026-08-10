// Guard das rotas de administração de usuários. Honra o ACESSO LIVRE de dev (igual
// ao módulo de EPI): em dev, o "Visitante" é admin e a tela abre sem global_auth —
// mas sem accessToken as chamadas ao global_auth degradam com aviso.
//
// Fora de dev, exige sessão real + isAdmin (requireAdmin). Módulo server-only.

import { NextResponse } from "next/server"
import { requireAdmin, getAccessTokenFromCookies } from "@/lib/auth-session"
import { acessoLivreLiberado } from "@/lib/dev-auth"

export type AdminCtx = {
  /** Bearer do admin logado (para GET /users no global_auth). Null no acesso livre. */
  accessToken: string | null
  /** E-mail do admin logado — base da trava anti-lockout. Null no acesso livre. */
  email: string | null
  /** Verdadeiro quando entrou via acesso livre de dev (sem sessão real). */
  dev: boolean
}

export async function guardAdmin(): Promise<
  { ok: true; ctx: AdminCtx } | { ok: false; response: NextResponse }
> {
  if (acessoLivreLiberado()) {
    return { ok: true, ctx: { accessToken: getAccessTokenFromCookies(), email: null, dev: true } }
  }
  const guarda = await requireAdmin()
  if (!guarda.ok) return { ok: false, response: guarda.response }
  return {
    ok: true,
    ctx: { accessToken: getAccessTokenFromCookies(), email: guarda.sessao.user.email, dev: false },
  }
}
