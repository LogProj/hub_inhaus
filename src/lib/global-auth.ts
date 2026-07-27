// Cliente HTTP do global_auth — ÚNICA forma deste projeto falar com o provedor de
// identidade. TUDO aqui é server-side: a X-Api-Key NUNCA pode chegar ao browser.
// O global_auth diz "quem é o usuário e se a senha confere"; quem decide o que ele
// pode VER é este projeto (camada de autorização/RBAC local — fora deste arquivo).
//
// >>> NÃO altere o contrato com o global_auth. Este projeto é apenas consumidor;
//     o banco/serviço global_auth é compartilhado e não deve ser modificado daqui.

export type GlobalAuthTokens = {
  accessToken: string
  refreshToken: string
  tokenType?: string
  expiresIn?: string
}

export type GlobalAuthTwoFactor = {
  requiresTwoFactor: true
  tempToken: string
}

export type GlobalAuthLoginResult = GlobalAuthTokens | GlobalAuthTwoFactor

export type GlobalAuthUser = {
  id: string
  name?: string | null
  email: string
  cpf?: string | null
  type?: "INTERNAL" | "CLIENT" | string | null
  isActive: boolean
  emailVerified?: boolean
  lastLoginAt?: string | null
  createdAt?: string
  updatedAt?: string
}

export class GlobalAuthError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.name = "GlobalAuthError"
    this.status = status
  }
}

function getBaseUrl() {
  const base = process.env.AUTH_BASE_URL
  if (!base) throw new GlobalAuthError("AUTH_BASE_URL não configurado", 500)
  return base.replace(/\/+$/, "")
}

// AUTH_BASE_URL é a base SEM /api/v1; o prefixo é adicionado aqui. Se a env já vier
// com /api/v1 no fim, não duplica.
function getAuthUrl(path: string) {
  const base = getBaseUrl()
  const root = /\/api\/v1$/.test(base) ? base : `${base}/api/v1`
  return `${root}/auth/${path.replace(/^\/+/, "")}`
}

function getUsersUrl() {
  const base = getBaseUrl()
  const root = /\/api\/v1$/.test(base) ? base : `${base}/api/v1`
  return `${root}/users`
}

function getApiKeyHeaders(): Record<string, string> {
  const key = process.env.AUTH_API_KEY
  if (!key) throw new GlobalAuthError("AUTH_API_KEY não configurado", 500)
  return { "X-Api-Key": key }
}

// Erros vêm envelopados: {statusCode, path, error:{message, error, statusCode}}.
export function parseGaError(payload: unknown, fallback: string): string {
  if (!payload || typeof payload !== "object") return fallback
  const obj = payload as Record<string, unknown>
  const inner = obj.error
  if (inner && typeof inner === "object") {
    const msg = (inner as Record<string, unknown>).message
    if (Array.isArray(msg)) return (msg[0] as string) || fallback
    if (typeof msg === "string") return msg || fallback
  } else if (typeof inner === "string") {
    return inner || fallback
  }
  return (typeof obj.message === "string" ? obj.message : null) || fallback
}

async function readJson(response: Response): Promise<unknown> {
  return response.json().catch(() => ({}))
}

export function normalizeEmail(email: string) {
  return email.toLowerCase().trim()
}

// POST /auth/login — NÃO usa X-Api-Key (só BruteForceGuard). Pode retornar tokens
// OU { requiresTwoFactor, tempToken } quando o usuário tem 2FA habilitado.
export async function loginWithGlobalAuth(
  email: string,
  password: string,
  forwardedFor?: string | null,
): Promise<GlobalAuthLoginResult> {
  const headers: Record<string, string> = { "Content-Type": "application/json" }
  // ENVIAR X-Forwarded-For com o IP real do cliente, senão o BruteForceGuard do
  // global_auth conta as falhas por trás do proxy (Vercel) como um único IP.
  if (forwardedFor) headers["X-Forwarded-For"] = forwardedFor

  const response = await fetch(getAuthUrl("login"), {
    method: "POST",
    cache: "no-store",
    headers,
    body: JSON.stringify({ email: normalizeEmail(email), password }),
  })
  const json = await readJson(response)
  if (!response.ok) throw new GlobalAuthError(parseGaError(json, "Login não autorizado"), response.status)
  return json as GlobalAuthLoginResult
}

// POST /auth/2fa/verify — troca o tempToken + código TOTP por tokens definitivos.
export async function verifyTwoFactorLogin(tempToken: string, totpCode: string): Promise<GlobalAuthTokens> {
  const response = await fetch(getAuthUrl("2fa/verify"), {
    method: "POST",
    cache: "no-store",
    headers: { "Content-Type": "application/json", ...getApiKeyHeaders() },
    body: JSON.stringify({ tempToken, totpCode }),
  })
  const json = await readJson(response)
  if (!response.ok) throw new GlobalAuthError(parseGaError(json, "Código 2FA inválido"), response.status)
  return json as GlobalAuthTokens
}

// GET /users — lista TODOS os usuários do global_auth (leitura) usando o Bearer do
// admin logado. NÃO usa X-Api-Key aqui e NÃO cria/altera identidade. Quem pode ver
// é regra do projeto (autorização local).
export async function listGlobalAuthUsers(accessToken: string): Promise<GlobalAuthUser[]> {
  const response = await fetch(getUsersUrl(), {
    method: "GET",
    cache: "no-store",
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  const json = await readJson(response)
  if (!response.ok)
    throw new GlobalAuthError(parseGaError(json, "Não foi possível listar os usuários"), response.status)
  return Array.isArray(json) ? (json as GlobalAuthUser[]) : []
}

// POST /users — cria a IDENTIDADE no global_auth (name, email, cpf e password são
// obrigatórios). Usa X-Api-Key (server-only). Conceder ACESSO é separado (banco local).
export async function createGlobalAuthUser(input: {
  name: string
  email: string
  cpf: string
  password: string
  type?: "INTERNAL" | "CLIENT"
}): Promise<GlobalAuthUser> {
  const response = await fetch(getUsersUrl(), {
    method: "POST",
    cache: "no-store",
    headers: { "Content-Type": "application/json", ...getApiKeyHeaders() },
    body: JSON.stringify({ ...input, email: normalizeEmail(input.email) }),
  })
  const json = await readJson(response)
  if (!response.ok)
    throw new GlobalAuthError(parseGaError(json, "Não foi possível cadastrar"), response.status)
  return json as GlobalAuthUser
}

// GET /auth/me — valida o accessToken e devolve a identidade atual.
export async function getGlobalAuthUser(accessToken: string): Promise<GlobalAuthUser> {
  const response = await fetch(getAuthUrl("me"), {
    method: "GET",
    cache: "no-store",
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  const json = await readJson(response)
  if (!response.ok) throw new GlobalAuthError(parseGaError(json, "Sessão inválida"), response.status)
  return json as GlobalAuthUser
}

// POST /auth/refresh — ROTACIONA o refresh token: o chamador DEVE persistir sempre
// o novo refreshToken retornado (o antigo é invalidado).
export async function refreshGlobalAuthSession(refreshToken: string): Promise<GlobalAuthTokens> {
  const response = await fetch(getAuthUrl("refresh"), {
    method: "POST",
    cache: "no-store",
    headers: { "Content-Type": "application/json", ...getApiKeyHeaders() },
    body: JSON.stringify({ refreshToken }),
  })
  const json = await readJson(response)
  if (!response.ok)
    throw new GlobalAuthError(parseGaError(json, "Não foi possível renovar a sessão"), response.status)
  return json as GlobalAuthTokens
}

// POST /auth/logout — revoga o refresh token no global_auth. O logout local
// (limpar cookies) não pode falhar por causa do servidor remoto.
export async function logoutGlobalAuth(refreshToken: string): Promise<void> {
  try {
    await fetch(getAuthUrl("logout"), {
      method: "POST",
      cache: "no-store",
      headers: { "Content-Type": "application/json", ...getApiKeyHeaders() },
      body: JSON.stringify({ refreshToken }),
    })
  } catch {
    // silencioso de propósito
  }
}
