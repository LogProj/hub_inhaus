// POST /api/auth/login — autentica no global_auth e abre a sessão (cookies httpOnly).
// Trata o ramo 2FA: se o usuário tem 2FA, devolve { requiresTwoFactor, tempToken } e
// o client segue para /api/auth/2fa/verify.
import { NextResponse } from "next/server"
import { GlobalAuthError, getGlobalAuthUser, loginWithGlobalAuth } from "@/lib/global-auth"
import { montarSessaoDoUsuario, setAuthCookies } from "@/lib/auth-session"

export const dynamic = "force-dynamic"

export async function POST(request: Request) {
  let body: { email?: string; password?: string }
  try {
    body = (await request.json()) as { email?: string; password?: string }
  } catch {
    return NextResponse.json({ error: "Requisição inválida" }, { status: 400 })
  }

  if (!body.email || !body.password) {
    return NextResponse.json({ error: "Informe e-mail e senha" }, { status: 400 })
  }

  // IP real do cliente para o BruteForceGuard do global_auth não tratar todos os
  // acessos atrás do proxy (Vercel) como um único IP.
  const forwardedFor = request.headers.get("x-forwarded-for") ?? request.headers.get("x-real-ip")

  try {
    const result = await loginWithGlobalAuth(body.email, body.password, forwardedFor)

    if ("requiresTwoFactor" in result) {
      return NextResponse.json({ requiresTwoFactor: true, tempToken: result.tempToken })
    }

    const user = await getGlobalAuthUser(result.accessToken)
    const sessao = await montarSessaoDoUsuario(user)
    if (!sessao) {
      return NextResponse.json({ error: "Usuário sem acesso a este sistema" }, { status: 403 })
    }

    setAuthCookies(result)
    return NextResponse.json({
      user: { name: sessao.user.name ?? null, email: sessao.user.email },
      authorization: sessao.authorization,
    })
  } catch (error) {
    const status = error instanceof GlobalAuthError ? error.status : 500
    const message = error instanceof Error ? error.message : "Falha no login"
    return NextResponse.json({ error: message }, { status })
  }
}
