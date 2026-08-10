import type { Metadata } from "next"
import { redirect } from "next/navigation"

import { getAcessoEpiAtual } from "@/lib/epi/guardas"
import { podeConfigurar } from "@/lib/epi/papeis"
import { crsJaMapeados, listarChecklistsPublicaveis } from "@/lib/epi/config"
import { listarCrsDisponiveis } from "@/lib/epi/colaboradores"
import { SemAcesso } from "@/components/epi/layout"
import { AssistenteConfiguracao } from "@/components/epi/AssistenteConfiguracao"

export const metadata: Metadata = { title: "Configurar EPI" }
export const dynamic = "force-dynamic"

export default async function ConfigurarEpiPage() {
  const ctx = await getAcessoEpiAtual()
  if (!ctx) redirect("/login")
  if (!podeConfigurar(ctx.acesso)) return <SemAcesso />

  const [disponiveis, mapeados, checklists] = await Promise.all([
    listarCrsDisponiveis(),
    crsJaMapeados(),
    listarChecklistsPublicaveis(),
  ])

  return (
    <AssistenteConfiguracao
      crsDisponiveis={disponiveis
        .filter((c) => !mapeados.has(c.cr))
        .map((c) => ({ cr: c.cr, ativos: c.ativos, cliente: c.cliente }))}
      checklists={checklists}
    />
  )
}
