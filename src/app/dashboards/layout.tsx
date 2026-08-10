import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { DashboardShell } from "@/components/dashboard/DashboardShell"
import { getSessionReadOnly } from "@/lib/auth-session"
import { acessoLivreLiberado, USUARIO_DEV } from "@/lib/dev-auth"
import { resolverAcessoEpi, podeConfigurar } from "@/lib/epi/papeis"
import { escopoDoUsuario, podeVerValidacoes } from "@/lib/epi/escopo"

export default async function DashboardsLayout({ children }: { children: React.ReactNode }) {
  // Acesso livre (dev): pula a guarda inteira e usa o usuário fictício, para
  // revisar as telas sem depender do global_auth estar configurado. Admin fictício
  // enxerga tudo do EPI.
  if (acessoLivreLiberado()) {
    return (
      <DashboardShell nome={USUARIO_DEV.nome} email={null} isAdmin={USUARIO_DEV.isAdmin} epiConfig epiValida>
        {children}
      </DashboardShell>
    )
  }

  // Server Component não pode gravar cookies — usa a checagem somente leitura.
  const resultado = await getSessionReadOnly()

  if (resultado.status === "anonimo") redirect("/login")
  if (resultado.status === "renovar") {
    // access expirado com refresh válido: rotaciona na rota de API e volta.
    const path = headers().get("x-invoke-path") ?? "/dashboards"
    redirect(`/api/auth/refresh?next=${encodeURIComponent(path)}`)
  }

  const { sessao } = resultado

  // Sinais de navegação do EPI, por papel: configurar (admin/Segurança) e validar
  // (admin/Segurança/líder). Definem o que o grupo EPI mostra na sidebar.
  const acessoEpi = await resolverAcessoEpi({
    authUserId: sessao.user.id,
    isAdmin: sessao.authorization.isAdmin,
  })
  const escopoEpi = await escopoDoUsuario(acessoEpi, sessao.user.id)
  const epiConfig = podeConfigurar(acessoEpi)
  const epiValida = podeVerValidacoes(escopoEpi)

  return (
    <DashboardShell
      nome={sessao.authorization.nome}
      email={sessao.user.email}
      isAdmin={sessao.authorization.isAdmin}
      epiConfig={epiConfig}
      epiValida={epiValida}
    >
      {children}
    </DashboardShell>
  )
}
