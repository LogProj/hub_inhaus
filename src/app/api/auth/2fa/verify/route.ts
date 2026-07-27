// POST /api/auth/2fa/verify — troca tempToken + código TOTP por tokens definitivos
// e abre a sessão (cookies httpOnly).
import { NextResponse } from "next/server"
import { GlobalAuthError, getGlobalAuthUser, verifyTwoFactorLogin } from "@/lib/global-auth"
import { montarSessaoDoUsuario, setAuthCookies } from "@/lib/auth-session"

export const dynamic = "force-dynamic"

export async function POST(request: Request) {
  let body: { tempToken?: string; totpCode?: string }
  try {
    body = (await request.json()) as { tempToken?: string; totpCode?: string }
  } catch {
    return NextResponse.json({ error: "Requisição inválida" }, { status: 400 })
  }

  if (!body.tempToken || !body.totpCode) {
    return NextResponse.json({ error: "Informe o código de verificação" }, { status: 400 })
  }

  try {
    const tokens = await verifyTwoFactorLogin(body.tempToken, body.totpCode)
    const user = await getGlobalAuthUser(tokens.accessToken)
    const sessao = await montarSessaoDoUsuario(user)
    if (!sessao) {
      return NextResponse.json({ error: "Usuário sem acesso a este sistema" }, { status: 403 })
    }

    setAuthCookies(tokens)
    return NextResponse.json({
      user: { name: sessao.user.name ?? null, email: sessao.user.email },
      authorization: sessao.authorization,
    })
  } catch (error) {
    const status = error instanceof GlobalAuthError ? error.status : 500
    const message = error instanceof Error ? error.message : "Falha na verificação"
    return NextResponse.json({ error: message }, { status })
  }
}
