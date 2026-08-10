import type { Metadata } from "next"
import { redirect } from "next/navigation"

import { getAcessoEpiAtual } from "@/lib/epi/guardas"
import { podeConfigurar } from "@/lib/epi/papeis"
import { listarClientesComCrs, listarTurnosPorCliente } from "@/lib/epi/config"
import { EpiHeader, SemAcesso } from "@/components/epi/layout"
import { TurnosManager } from "@/components/epi/TurnosManager"

export const metadata: Metadata = { title: "Turnos e líderes · EPI" }
export const dynamic = "force-dynamic"

export default async function TurnosEpiPage({
  searchParams,
}: {
  searchParams: { cliente?: string }
}) {
  const ctx = await getAcessoEpiAtual()
  if (!ctx) redirect("/login")
  if (!podeConfigurar(ctx.acesso)) return <SemAcesso />

  const clientes = await listarClientesComCrs()
  const selecionadoId = Number(searchParams.cliente) || clientes[0]?.id || null

  const turnos = selecionadoId ? await listarTurnosPorCliente(selecionadoId) : []

  const clientesPlain = clientes.map((c) => ({
    id: c.id,
    nome: c.nome,
    crs: c.crs.map((cr) => cr.cr),
  }))
  const turnosPlain = turnos.map((t) => ({
    id: t.id,
    cr: t.cr,
    nome: t.nome,
    diasSemana: t.diasSemana,
    ativo: t.ativo,
    tokenPublico: t.tokenPublico,
    responsaveis: t.responsaveis.map((r) => ({ id: r.id, nome: r.nome, authUserId: r.authUserId })),
  }))

  return (
    <div className="space-y-8">
      <EpiHeader
        eyebrow="EPI · Configuração"
        titulo="Turnos e líderes"
        descricao="Defina os turnos de cada CR (a base não informa turno) e quem é responsável por validar cada um. O líder sempre tem acesso ao sistema."
      />
      <TurnosManager
        clientes={clientesPlain}
        selecionadoId={selecionadoId}
        turnos={turnosPlain}
      />
    </div>
  )
}
