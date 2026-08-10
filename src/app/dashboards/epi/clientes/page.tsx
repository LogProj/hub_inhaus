import type { Metadata } from "next"
import { redirect } from "next/navigation"

import { getAcessoEpiAtual } from "@/lib/epi/guardas"
import { podeConfigurar } from "@/lib/epi/papeis"
import { listarClientesComCrs, crsJaMapeados } from "@/lib/epi/config"
import { listarCrsDisponiveis } from "@/lib/epi/colaboradores"
import { EpiHeader, SemAcesso } from "@/components/epi/layout"
import { ClientesManager } from "@/components/epi/ClientesManager"

export const metadata: Metadata = { title: "Clientes e CRs · EPI" }
export const dynamic = "force-dynamic"

export default async function ClientesEpiPage() {
  const ctx = await getAcessoEpiAtual()
  if (!ctx) redirect("/login")
  if (!podeConfigurar(ctx.acesso)) return <SemAcesso />

  const [clientes, crsDisponiveis, mapeados] = await Promise.all([
    listarClientesComCrs(),
    listarCrsDisponiveis(),
    crsJaMapeados(),
  ])

  const disponiveis = crsDisponiveis
    .filter((c) => !mapeados.has(c.cr))
    .map((c) => ({ cr: c.cr, ativos: c.ativos }))

  const clientesPlain = clientes.map((cl) => ({
    id: cl.id,
    nome: cl.nome,
    ativo: cl.ativo,
    crs: cl.crs.map((cr) => ({ id: cr.id, cr: cr.cr, ativo: cr.ativo })),
  }))

  return (
    <div className="space-y-8">
      <EpiHeader
        eyebrow="EPI · Configuração"
        titulo="Clientes e CRs"
        descricao="Cadastre os clientes e vincule os Centros de Resultado (setores) que eles atendem. O checklist de EPI é sempre isolado por CR."
      />
      <ClientesManager clientesIniciais={clientesPlain} crsDisponiveis={disponiveis} />
    </div>
  )
}
