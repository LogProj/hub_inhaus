import type { Metadata } from "next"
import { redirect } from "next/navigation"

import { getAcessoEpiAtual } from "@/lib/epi/guardas"
import { podeConfigurar } from "@/lib/epi/papeis"
import { listarMembros, listarClientesComCrs } from "@/lib/epi/config"
import { EpiHeader, SemAcesso } from "@/components/epi/layout"
import { MembrosManager } from "@/components/epi/MembrosManager"

export const metadata: Metadata = { title: "Papéis de acesso · EPI" }
export const dynamic = "force-dynamic"

export default async function MembrosEpiPage() {
  const ctx = await getAcessoEpiAtual()
  if (!ctx) redirect("/login")
  if (!podeConfigurar(ctx.acesso)) return <SemAcesso />

  const [membros, clientes] = await Promise.all([listarMembros(), listarClientesComCrs()])

  const membrosPlain = membros.map((m) => ({
    id: m.id,
    authUserId: m.authUserId,
    papel: m.papel,
    clienteId: m.clienteId,
    cr: m.cr,
  }))
  const clientesPlain = clientes.map((c) => ({
    id: c.id,
    nome: c.nome,
    crs: c.crs.map((cr) => cr.cr),
  }))

  return (
    <div className="space-y-8">
      <EpiHeader
        eyebrow="EPI · Configuração"
        titulo="Papéis de acesso"
        descricao="Conceda os papéis do módulo. O parametrizador aloca colaboradores e parametriza; o líder valida turnos. O administrador do hub já pode tudo."
      />
      <MembrosManager membros={membrosPlain} clientes={clientesPlain} />
    </div>
  )
}
