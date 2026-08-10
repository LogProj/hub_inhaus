import type { Metadata } from "next"
import { redirect } from "next/navigation"

import { getAcessoEpiAtual } from "@/lib/epi/guardas"
import { podeParametrizar } from "@/lib/epi/papeis"
import { listarCrsMapeados, listarTurnosPorCr } from "@/lib/epi/config"
import { getPainelAlocacao } from "@/lib/epi/atribuicao"
import { EpiHeader, SemAcesso } from "@/components/epi/layout"
import { AlocacoesManager } from "@/components/epi/AlocacoesManager"

export const metadata: Metadata = { title: "Alocações · EPI" }
export const dynamic = "force-dynamic"

export default async function AlocacoesEpiPage({
  searchParams,
}: {
  searchParams: { cr?: string }
}) {
  const ctx = await getAcessoEpiAtual()
  if (!ctx) redirect("/login")
  if (!podeParametrizar(ctx.acesso)) return <SemAcesso mensagem="Esta área é restrita a administradores e parametrizadores." />

  const crs = await listarCrsMapeados()
  const crSelecionado = searchParams.cr && crs.some((c) => c.cr === searchParams.cr)
    ? searchParams.cr
    : crs[0]?.cr ?? null

  const [painel, turnos] = crSelecionado
    ? await Promise.all([getPainelAlocacao(crSelecionado), listarTurnosPorCr(crSelecionado)])
    : [[], []]

  const linhas = painel.map((l) => ({
    cpfHash: l.colaborador.cpfHash,
    nome: l.colaborador.nome,
    cargo: l.colaborador.cargo,
    matricula: l.colaborador.matricula,
    turnoId: l.turnoId,
  }))

  return (
    <div className="space-y-8">
      <EpiHeader
        eyebrow="EPI · Configuração"
        titulo="Alocações de turno"
        descricao="Aloque os colaboradores ativos do CR em turnos, em lote. Quem está ativo mas sem turno aparece sinalizado como não alocado. A lista segue o quadro ativo — desligados somem sozinhos."
      />
      <AlocacoesManager
        crs={crs.map((c) => ({ cr: c.cr, clienteNome: c.clienteNome }))}
        crSelecionado={crSelecionado}
        turnos={turnos}
        linhas={linhas}
      />
    </div>
  )
}
