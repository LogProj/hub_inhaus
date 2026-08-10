import type { Metadata } from "next"
import Link from "next/link"
import { redirect } from "next/navigation"
import { ClipboardCheck, MapPin, ArrowRight, CircleCheck, TriangleAlert } from "lucide-react"

import { getAcessoEpiAtual } from "@/lib/epi/guardas"
import { podeVerValidacoes } from "@/lib/epi/escopo"
import { getSessoesParaValidar } from "@/lib/epi/sessao"
import { EpiHeader, SemAcesso } from "@/components/epi/layout"
import { Badge } from "@/components/ui/badge"
import { InfoIndicador } from "@/components/dashboard/InfoIndicador"

export const metadata: Metadata = { title: "Validações · EPI" }
export const dynamic = "force-dynamic"

export default async function ValidacoesPage() {
  const ctx = await getAcessoEpiAtual()
  if (!ctx) redirect("/login")
  if (!podeVerValidacoes(ctx.escopo)) {
    return <SemAcesso mensagem="Esta área é restrita a líderes e administradores." />
  }

  const sessoes = await getSessoesParaValidar(ctx.escopo)

  return (
    <div className="space-y-8">
      <EpiHeader
        eyebrow="EPI · Validação"
        titulo="Validação de turnos"
        descricao="Revise os checklists preenchidos hoje e valide o turno. O turno validado fica marcado como concluído e permanece aqui até o próximo dia. As não conformidades ficam destacadas."
        icone={ClipboardCheck}
        info={
          <InfoIndicador titulo="Como validar um turno">
            <p>
              Aqui aparecem os turnos <strong>do dia</strong> em que a equipe já preencheu o checklist.
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-4">
              <li>Abra um turno para ver, pessoa por pessoa, o que foi respondido.</li>
              <li>As respostas <strong>não conformes</strong> aparecem destacadas em vermelho.</li>
              <li>Confira e clique em <strong>Validar turno</strong> — isso confirma a conferência e fecha o turno do dia.</li>
            </ul>
          </InfoIndicador>
        }
      />

      {sessoes.length === 0 ? (
        <div className="glass rounded-3xl p-10 text-center text-sm text-muted-foreground">
          Nenhum turno com preenchimento no seu acesso. Assim que a equipe começar a
          responder, os turnos aparecem aqui para validação.
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {sessoes.map((s) => (
            <Link
              key={s.id}
              href={`/dashboards/epi/validacoes/${s.id}`}
              className="glass group rounded-3xl p-6 transition-transform hover:-translate-y-1"
            >
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-teal" />
                <span className="text-xs uppercase text-muted-foreground">{s.cr}</span>
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <h3 className="font-display text-lg font-semibold text-navy">{s.turnoNome}</h3>
                {s.validada ? (
                  <Badge variant="success">
                    <CircleCheck className="h-3 w-3" /> Concluído
                  </Badge>
                ) : s.naoConformes > 0 ? (
                  <Badge variant="danger">
                    <TriangleAlert className="h-3 w-3" /> {s.naoConformes} não conforme(s)
                  </Badge>
                ) : (
                  <Badge variant="teal">Aguardando validação</Badge>
                )}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{s.clienteNome}</p>

              <div className="mt-4 flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  <strong className="text-navy">{s.totalRespostas}</strong> preenchimento(s)
                </span>
                <span className="inline-flex items-center gap-1 text-sm font-medium text-teal">
                  Revisar
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
