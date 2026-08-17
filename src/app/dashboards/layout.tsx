import { DashboardShell } from "@/components/dashboard/DashboardShell"
import { resolverPapeisDashboard } from "@/lib/dashboard-acesso"

export default async function DashboardsLayout({ children }: { children: React.ReactNode }) {
  const papeis = await resolverPapeisDashboard()

  return (
    <DashboardShell
      nome={papeis.nome}
      email={papeis.email}
      isAdmin={papeis.isAdmin}
      epiConfig={papeis.epiConfig}
      epiValida={papeis.epiValida}
      soPreenche={papeis.soPreenche}
    >
      {children}
    </DashboardShell>
  )
}
