import type { Metadata } from "next"
import { redirect } from "next/navigation"

import { getAcessoEpiAtual } from "@/lib/epi/guardas"
import { podeVerValidacoes } from "@/lib/epi/escopo"
import { getTurnosParaUtilizacao, getGradeUtilizacao } from "@/lib/epi/utilizacao"
import { hojeSaoPaulo } from "@/lib/epi/datas"
import { EpiHeader, SemAcesso } from "@/components/epi/layout"
import { InfoIndicador } from "@/components/dashboard/InfoIndicador"
import { UtilizacaoEpi } from "@/components/epi/UtilizacaoEpi"

export const metadata: Metadata = { title: "Utilização de EPIs" }
export const dynamic = "force-dynamic"

export default async function UtilizacaoPage({
  searchParams,
}: {
  searchParams: { turno?: string; data?: string }
}) {
  const ctx = await getAcessoEpiAtual()
  if (!ctx) redirect("/login")
  if (!podeVerValidacoes(ctx.escopo))
    return <SemAcesso mensagem="Esta área é dos líderes e da Segurança." />

  const turnos = await getTurnosParaUtilizacao(ctx.escopo)
  const hoje = hojeSaoPaulo().iso
  const dataIso = searchParams.data && /^\d{4}-\d{2}-\d{2}$/.test(searchParams.data) ? searchParams.data : hoje
  const turnoId = searchParams.turno ? Number(searchParams.turno) : turnos[0]?.id ?? null
  const grade = turnoId ? await getGradeUtilizacao(turnoId, dataIso, ctx.escopo) : null

  return (
    <div className="space-y-8">
      <EpiHeader
        eyebrow="EPI"
        titulo="Utilização de EPIs"
        descricao="Registre, por colaborador do seu turno, o uso dos EPIs no dia — Conforme, Não conforme ou Ausente."
        info={
          <InfoIndicador titulo="Como registrar a utilização">
            <p>Todo dia, o <strong>líder</strong> registra o uso de EPIs do seu turno.</p>
            <ul className="mt-2 list-disc space-y-1 pl-4">
              <li>Para cada colaborador, marque cada EPI como <strong>Conforme</strong> ou <strong>Não conforme</strong>.</li>
              <li>Se a pessoa não estava no turno, marque <strong>Ausente</strong> (não precisa preencher os EPIs).</li>
              <li>Os EPIs são definidos pela Segurança na aba <strong>Checklists</strong>.</li>
              <li>Um registro por turno/dia — dá para reabrir e ajustar.</li>
            </ul>
          </InfoIndicador>
        }
      />
      <UtilizacaoEpi key={`${turnoId}-${dataIso}`} turnos={turnos} grade={grade} dataIso={dataIso} turnoId={turnoId} hoje={hoje} />
    </div>
  )
}
