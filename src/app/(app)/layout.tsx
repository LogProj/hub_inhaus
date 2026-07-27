import type { ReactNode } from "react"
import { redirect } from "next/navigation"
import { getSessionReadOnly } from "@/lib/auth-session"
import { Atmosphere } from "@/components/atmosphere/Atmosphere"
import { AppSidebar } from "@/components/shell/AppSidebar"
import { AppTopbar } from "@/components/shell/AppTopbar"
import { CommandPalette } from "@/components/shell/CommandPalette"

/**
 * Shell protegido do hub: sidebar + topbar (uma peça só, navy contínuo) e o
 * canvas de conteúdo. Vale para qualquer rota dentro do grupo `(app)`.
 *
 * Sessão: usamos `getSessionReadOnly()`, não `getCurrentSession()`. O motivo
 * está documentado no próprio `src/lib/auth-session.ts` — `getCurrentSession`
 * pode ROTACIONAR ou LIMPAR os cookies (setAuthCookies/clearAuthCookies), e o
 * Next 14 não permite gravar cookies durante a renderização de um Server
 * Component (só em Server Action ou Route Handler). Chamar `getCurrentSession`
 * aqui quebraria em runtime toda vez que o access token estivesse expirado —
 * exatamente o caso que a rota `/api/auth/refresh` (Route Handler) já existe
 * para resolver.
 */
export default async function AppLayout({ children }: { children: ReactNode }) {
  const resultado = await getSessionReadOnly()

  if (resultado.status === "anonimo") {
    redirect("/login")
  }

  if (resultado.status === "renovar") {
    // Access expirado mas há refresh token: quem rotaciona os cookies é o
    // Route Handler, que devolve o usuário para cá já com a sessão renovada.
    redirect("/api/auth/refresh")
  }

  const { sessao } = resultado
  const nome = sessao.authorization.nome ?? sessao.user.name ?? sessao.user.email
  const { isAdmin, visibleScreens } = sessao.authorization

  return (
    <div className="grid h-dvh grid-cols-[auto_1fr]">
      <AppSidebar nome={nome} isAdmin={isAdmin} visibleScreens={visibleScreens} />

      <div className="flex min-w-0 flex-col">
        <AppTopbar />
        <main className="relative flex-1 overflow-y-auto bg-background">
          <Atmosphere intensidade="homeopatica" />
          <div className="relative mx-auto max-w-[1440px] px-10 py-10">{children}</div>
        </main>
      </div>

      <CommandPalette />
    </div>
  )
}
