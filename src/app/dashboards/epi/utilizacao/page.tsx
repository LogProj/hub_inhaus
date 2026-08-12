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

  const hoje = hojeSaoPaulo().iso
  const dataIso = searchParams.data && /^\d{4}-\d{2}-\d{2}$/.test(searchParams.data) ? searchParams.data : hoje

  // Carrega os dados com degradação: se algo falhar (ex.: banco), mostra a mensagem
  // real na tela em vez de estourar um "server-side exception" opaco.
  let turnos: Awaited<ReturnType<typeof getTurnosParaUtilizacao>> = []
  let grade: Awaited<ReturnType<typeof getGradeUtilizacao>> = null
  let turnoId: number | null = null
  let erro: string | null = null
  try {
    turnos = await getTurnosParaUtilizacao(ctx.escopo)
    turnoId = searchParams.turno ? Number(searchParams.turno) : turnos[0]?.id ?? null
    grade = turnoId ? await getGradeUtilizacao(turnoId, dataIso, ctx.escopo) : null
  } catch (e) {
    erro = e instanceof Error ? e.message : "Falha ao carregar a utilização."
  }

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
      {erro ? (
        <div className="glass rounded-3xl border border-red-500/30 bg-red-500/5 p-6">
          <p className="text-sm font-semibold text-red-600">Não foi possível carregar a Utilização de EPIs.</p>
          <p className="mt-2 break-words font-mono text-xs text-red-700/90">{erro}</p>
          <p className="mt-3 text-xs text-muted-foreground">
            Se a mensagem citar uma coluna/tabela ausente, o banco de produção está sem a migração do EPI; se citar
            timeout de conexão, é o pool. Envie esta mensagem para o suporte técnico.
          </p>
        </div>
      ) : (
        <UtilizacaoEpi key={`${turnoId}-${dataIso}`} turnos={turnos} grade={grade} dataIso={dataIso} turnoId={turnoId} hoje={hoje} />
      )}
    </div>
  )
}
