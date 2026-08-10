import type { Metadata } from "next"
import { redirect } from "next/navigation"

import { getAcessoEpiAtual } from "@/lib/epi/guardas"
import { podeConfigurar } from "@/lib/epi/papeis"
import { listarChecklistsPublicaveis } from "@/lib/epi/config"
import { listarCrsDisponiveis } from "@/lib/epi/colaboradores"
import { SemAcesso } from "@/components/epi/layout"
import { AssistenteConfiguracao } from "@/components/epi/AssistenteConfiguracao"

export const metadata: Metadata = { title: "Configurar EPI" }
export const dynamic = "force-dynamic"

export default async function ConfigurarEpiPage() {
  const ctx = await getAcessoEpiAtual()
  if (!ctx) redirect("/login")
  if (!podeConfigurar(ctx.acesso)) return <SemAcesso />

  // Mostra TODOS os CRs da base (mesma fonte da tela de Líderes). Nomear um líder
  // cria o vínculo do CR ao cliente; se filtrássemos os já vinculados, esses CRs
  // sumiriam daqui — então não filtramos. vincularSetorPorCr é idempotente.
  const [disponiveis, checklists] = await Promise.all([
    listarCrsDisponiveis(),
    listarChecklistsPublicaveis(),
  ])

  return (
    <AssistenteConfiguracao
      crsDisponiveis={disponiveis.map((c) => ({ cr: c.cr, ativos: c.ativos, cliente: c.cliente }))}
      checklists={checklists}
    />
  )
}
