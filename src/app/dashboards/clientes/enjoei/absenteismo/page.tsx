import type { Metadata } from "next"
import nextDynamic from "next/dynamic"
import { AlertTriangle } from "lucide-react"

import { assertTelaVisivel } from "@/lib/dashboard-acesso"
import { AttendanceGrid } from "@/components/clientes/enjoei/AttendanceGrid"
import { HeadcountKpis } from "@/components/clientes/enjoei/HeadcountKpis"
import { MonthFilter } from "@/components/clientes/enjoei/MonthFilter"
import { RegrasInfo } from "@/components/clientes/enjoei/RegrasInfo"
import {
  getHeadcount,
  getMesesDisponiveis,
  getPresencasTimeline,
  type Headcount,
  type PresencasTimeline as TimelineData,
} from "@/lib/clientes/enjoei/absenteismo"

const AderenciaChart = nextDynamic(() =>
  import("@/components/clientes/enjoei/AderenciaChart").then((m) => m.AderenciaChart),
)
const AbsenteismoChart = nextDynamic(() =>
  import("@/components/clientes/enjoei/AbsenteismoChart").then((m) => m.AbsenteismoChart),
)
const FaltasChart = nextDynamic(() =>
  import("@/components/clientes/enjoei/FaltasChart").then((m) => m.FaltasChart),
)

export const metadata: Metadata = {
  title: "Absenteísmo",
}

// Consulta o ponto real a cada requisição (sem prerender no build).
export const dynamic = "force-dynamic"

export default async function AbsenteismoPage({
  searchParams,
}: {
  searchParams: { mes?: string }
}) {
  await assertTelaVisivel("enjoei-absenteismo")

  let meses: string[] = []
  let data: Headcount | null = null
  let timeline: TimelineData | null = null
  let erro: string | null = null

  try {
    meses = await getMesesDisponiveis()
    const mesSelecionado =
      searchParams.mes && meses.includes(searchParams.mes) ? searchParams.mes : meses[0]
    if (mesSelecionado) {
      ;[data, timeline] = await Promise.all([
        getHeadcount(mesSelecionado),
        getPresencasTimeline(mesSelecionado),
      ])
    }
  } catch (e) {
    erro = e instanceof Error ? e.message : "Falha ao consultar o ponto."
  }

  const mesAtual =
    searchParams.mes && meses.includes(searchParams.mes) ? searchParams.mes : meses[0]

  return (
    <div className="w-full">
      <div className="reveal flex flex-wrap items-end justify-between gap-4">
        <div>
          <span className="eyebrow">Gestão</span>
          <div className="mt-3 flex items-center gap-2.5">
            <h1 className="font-display text-3xl font-semibold tracking-tight">Absenteísmo</h1>
            <RegrasInfo />
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Presenças da equipe registradas no ponto
            {data?.periodo ? ` — ${data.periodo.inicio} a ${data.periodo.fim}` : ""}.
          </p>
        </div>
        {meses.length > 0 && mesAtual && (
          <MonthFilter
            meses={meses}
            atual={mesAtual}
            basePath="/dashboards/clientes/enjoei/absenteismo"
          />
        )}
      </div>

      {erro ? (
        <div
          role="alert"
          className="mt-8 flex items-start gap-3 rounded-2xl border border-destructive/20 bg-destructive/5 p-5 text-sm text-destructive"
        >
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
          <div>
            <p className="font-semibold">Não foi possível carregar o ponto.</p>
            <p className="mt-1 text-destructive/80">{erro}</p>
          </div>
        </div>
      ) : data && data.colaboradores.length > 0 ? (
        <>
          <HeadcountKpis
            quadro={data.quadro}
            aderenciaGeral={timeline?.aderenciaMediaGeral ?? 0}
            mediaAbsenteismo={timeline?.mediaAbsenteismo ?? 0}
            totalFaltas={data.totalFaltas}
          />

          {timeline && (
            <>
              <section className="reveal glass mt-6 flex flex-col rounded-2xl p-5">
                <div>
                  <h2 className="font-display text-lg font-semibold">Aderência por dia</h2>
                  <p className="text-xs text-muted-foreground">
                    Presenças ÷ escalados no dia
                  </p>
                </div>
                <div className="mt-4">
                  <AderenciaChart dados={timeline} />
                </div>
              </section>

              <div className="mt-6 grid gap-6 lg:grid-cols-2">
                <section className="reveal glass flex flex-col rounded-2xl p-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h2 className="font-display text-lg font-semibold">Absenteísmo por dia</h2>
                      <p className="text-xs text-muted-foreground">
                        Faltas ÷ escalados no dia
                      </p>
                    </div>
                  </div>
                  <div className="mt-4">
                    <AbsenteismoChart dados={timeline} />
                  </div>
                </section>

                <section className="reveal delay-1 glass flex flex-col rounded-2xl p-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h2 className="font-display text-lg font-semibold">Faltas por dia</h2>
                      <p className="text-xs text-muted-foreground">
                        Quantidade de faltas registradas em cada dia do mês
                      </p>
                    </div>
                    <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                      <span className="h-2.5 w-2.5 rounded-full bg-red-500" aria-hidden />
                      Faltas
                    </span>
                  </div>
                  <div className="mt-4">
                    <FaltasChart dados={timeline} />
                  </div>
                </section>
              </div>
            </>
          )}

          <section className="reveal delay-2 glass mt-6 rounded-2xl p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-display text-lg font-semibold">Presenças no período</h2>
                <p className="text-xs text-muted-foreground">
                  Cada quadradinho é um dia por colaborador · passe o mouse para ver o motivo
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-3.5 w-3.5 rounded-[4px] bg-enjoei/85" aria-hidden />
                  Presença
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-3.5 w-3.5 rounded-[4px] bg-red-500/85" aria-hidden />
                  Falta
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-3.5 w-3.5 rounded-[4px] bg-amber-400/90" aria-hidden />
                  Férias
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-3.5 w-3.5 rounded-[4px] bg-slate-200/80" aria-hidden />
                  Folga
                </span>
              </div>
            </div>

            <div className="mt-5">
              <AttendanceGrid
                colaboradores={data.colaboradores}
                dias={data.dias}
                celulas={data.celulas}
              />
            </div>
          </section>
        </>
      ) : (
        <div className="mt-8 rounded-2xl border border-enjoei/10 bg-enjoei-mist/50 p-6 text-sm text-muted-foreground">
          Nenhum registro de ponto encontrado.
        </div>
      )}
    </div>
  )
}
