import type { Metadata } from "next"
import { notFound, redirect } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, MapPin } from "lucide-react"

import { getAcessoEpiAtual } from "@/lib/epi/guardas"
import { podeVerValidacoes } from "@/lib/epi/escopo"
import { getDetalheSessao } from "@/lib/epi/sessao"
import { dataBR } from "@/lib/epi/datas"
import { tituloNome } from "@/lib/nomes"
import { EpiHeader, SemAcesso } from "@/components/epi/layout"
import { ValidacaoDetalhe } from "@/components/epi/ValidacaoDetalhe"

export const metadata: Metadata = { title: "Revisar turno · EPI" }
export const dynamic = "force-dynamic"

export default async function ValidacaoDetalhePage({ params }: { params: { id: string } }) {
  const ctx = await getAcessoEpiAtual()
  if (!ctx) redirect("/login")
  if (!podeVerValidacoes(ctx.escopo)) {
    return <SemAcesso mensagem="Esta área é restrita a líderes e administradores." />
  }

  const id = Number(params.id)
  if (!Number.isInteger(id)) notFound()

  const detalhe = await getDetalheSessao(id, ctx.escopo)
  if (!detalhe) notFound()

  return (
    <div className="space-y-6">
      <Link
        href="/dashboards/epi/validacoes"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-teal"
      >
        <ArrowLeft className="h-4 w-4" /> Voltar para as validações
      </Link>

      <EpiHeader
        eyebrow="EPI · Validação"
        titulo={detalhe.turnoNome}
        descricao={`${detalhe.clienteNome} · ${dataBR(detalhe.dataIso)}`}
      />
      <p className="-mt-4 flex items-center gap-1.5 text-sm uppercase text-muted-foreground">
        <MapPin className="h-4 w-4 text-teal" /> {detalhe.cr}
      </p>

      <ValidacaoDetalhe
        sessaoId={detalhe.id}
        validada={detalhe.validada}
        pessoas={detalhe.pessoas.map((p) => ({
          ...p,
          nome: tituloNome(p.nome),
          cargo: p.cargo ? tituloNome(p.cargo) : null,
        }))}
      />
    </div>
  )
}
