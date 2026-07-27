// POST /api/auth/logout — revoga o refresh no global_auth e limpa os cookies locais.
import { NextResponse } from "next/server"
import { logoutGlobalAuth } from "@/lib/global-auth"
import { clearAuthCookies, getRefreshTokenFromCookies } from "@/lib/auth-session"

export const dynamic = "force-dynamic"

export async function POST() {
  const refreshToken = getRefreshTokenFromCookies()
  if (refreshToken) await logoutGlobalAuth(refreshToken)
  clearAuthCookies()
  return NextResponse.json({ ok: true })
}
