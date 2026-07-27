// GET /api/auth/session — o client chama no mount para saber se há sessão e o que
// pode ver. Renova tokens por dentro (getCurrentSession) quando necessário.
import { NextResponse } from "next/server"
import { clearAuthCookies, getCurrentSession } from "@/lib/auth-session"

export const dynamic = "force-dynamic"

export async function GET() {
  const sessao = await getCurrentSession()
  if (!sessao) {
    clearAuthCookies()
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 })
  }

  return NextResponse.json({
    user: { name: sessao.user.name ?? null, email: sessao.user.email },
    authorization: sessao.authorization,
  })
}
