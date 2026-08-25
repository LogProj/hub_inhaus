import { headers } from "next/headers"
import { redirect } from "next/navigation"

import { DashboardShell } from "@/components/dashboard/DashboardShell"
import { resolverPapeisDashboard } from "@/lib/dashboard-acesso"
import { telasVisiveis } from "@/lib/domains"

export default async function DashboardsLayout({ children }: { children: React.ReactNode }) {
  const papeis = await resolverPapeisDashboard()

  // TRAVA CENTRAL DO CLIENTE (defesa em profundidade): um usuário CLIENTE só pode
  // acessar caminhos das telas concedidas a ele — nem por URL vê outra área/cliente.
  // (Internos seguem pelas guardas de página; admin passa sempre.)
  if (papeis.classificacao === "CLIENTE" && !papeis.isAdmin) {
    const path = headers().get("x-pathname") ?? ""
    const visiveis = telasVisiveis({
      isAdmin: papeis.isAdmin,
      visibleScreens: papeis.visibleScreens,
    }).filter((t) => t.key !== "home")
    const permitido =
      path === "/dashboards" ||
      visiveis.some((t) => path === t.href || path.startsWith(`${t.href}/`))
    if (!permitido) redirect(visiveis[0]?.href ?? "/dashboards")
  }

  return (
    <DashboardShell
      nome={papeis.nome}
      email={papeis.email}
      isAdmin={papeis.isAdmin}
      epiConfig={papeis.epiConfig}
      epiValida={papeis.epiValida}
      soPreenche={papeis.soPreenche}
      visibleScreens={papeis.visibleScreens}
      classificacao={papeis.classificacao}
    >
      {children}
    </DashboardShell>
  )
}
