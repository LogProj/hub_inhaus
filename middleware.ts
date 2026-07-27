// PRIMEIRA camada de defesa (defesa em profundidade) — checagem BARATA, só olha a
// PRESENÇA do cookie de sessão; não toca no banco nem valida o token. É apenas uma
// otimização de UX (evita renderizar a rota para quem obviamente não tem cookie).
// A validação REAL (token válido no global_auth + autorização local) acontece
// server-side no layout protegido (src/app/(app)/layout.tsx via getCurrentSession)
// e nas rotas via requireSession/requireAdmin. NUNCA confie só neste middleware
// para proteger uma rota.
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

const COOKIE_PREFIX = "inhaus"
const ACCESS_COOKIE = `${COOKIE_PREFIX}_access_token`
const REFRESH_COOKIE = `${COOKIE_PREFIX}_refresh_token`

/** Onde o usuário logado cai. É a Home "mission control". */
export const ROTA_INICIAL = "/home"

// Tudo que NÃO exige sessão. O resto do app é protegido por padrão — assim,
// adicionar um domínio novo não exige lembrar de atualizar esta lista.
const rotasPublicas = ["/login"]

/**
 * Acesso livre de desenvolvimento. A checagem é repetida aqui em vez de
 * importar `@/lib/dev-auth` porque o middleware roda no Edge Runtime, com
 * bundle próprio — manter esta linha independente evita arrastar o módulo
 * inteiro para o Edge. As duas travas são as mesmas.
 */
function acessoLivreLiberado(): boolean {
  return process.env.NODE_ENV !== "production" && process.env.HUB_ACESSO_LIVRE === "1"
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (acessoLivreLiberado()) return NextResponse.next()

  const temSessao =
    request.cookies.has(ACCESS_COOKIE) || request.cookies.has(REFRESH_COOKIE)

  const ehPublica = rotasPublicas.some(
    (rota) => pathname === rota || pathname.startsWith(`${rota}/`),
  )

  if (!ehPublica && !temSessao) {
    const url = new URL("/login", request.url)
    url.searchParams.set("next", pathname)
    return NextResponse.redirect(url)
  }

  // Já logado tentando abrir /login → manda para o app.
  if (pathname === "/login" && temSessao) {
    return NextResponse.redirect(new URL(ROTA_INICIAL, request.url))
  }

  return NextResponse.next()
}

export const config = {
  // Ignora as rotas de autenticação, os assets do Next e os arquivos estáticos.
  matcher: ["/((?!api/auth|_next/static|_next/image|favicon.ico|.*\\.svg$).*)"],
}
