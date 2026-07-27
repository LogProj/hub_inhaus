import { NextRequest, NextResponse } from "next/server"
import { getCurrentSession } from "@/lib/auth-session"

const ROTA_INICIAL = "/home"

// Rotaciona a sessão (Route Handler PODE gravar cookies) e volta para `next`.
// Usado pelo layout do app quando o access token expira mas ainda há refresh
// token — Server Components não podem rotacionar cookies.
export async function GET(request: NextRequest) {
  const nextParam = request.nextUrl.searchParams.get("next") ?? ROTA_INICIAL
  // Evita open redirect: só caminhos internos.
  const destino =
    nextParam.startsWith("/") && !nextParam.startsWith("//") ? nextParam : ROTA_INICIAL

  const sessao = await getCurrentSession() // valida + rotaciona/limpa cookies
  return NextResponse.redirect(new URL(sessao ? destino : "/login", request.url))
}
