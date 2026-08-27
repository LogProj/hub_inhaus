import type { Metadata } from "next"
import nextDynamic from "next/dynamic"
import { AlertTriangle } from "lucide-react"

import { assertTelaVisivel } from "@/lib/dashboard-acesso"
import { DesligadosRecentes } from "@/components/clientes/enjoei/DesligadosRecentes"
import { MonthFilter } from "@/components/clientes/enjoei/MonthFilter"
import { TurnoverInfo } from "@/components/clientes/enjoei/TurnoverInfo"
import { TurnoverKpis } from "@/components/clientes/enjoei/TurnoverKpis"
import { getTurnoverData, type TurnoverData } from "@/lib/clientes/enjoei/turnover"

const AdmissoesDesligamentosChart = nextDynamic(() =>
  import("@/components/clientes/enjoei/AdmissoesDesligamentosChart").then(
    (m) => m.AdmissoesDesligamentosChart,
  ),
)
const TurnoverRateChart = nextDynamic(() =>
  import("@/components/clientes/enjoei/TurnoverRateChart").then((m) => m.TurnoverRateChart),
)
const HeadcountDiarioChart = nextDynamic(() =>
  import("@/components/clientes/enjoei/HeadcountDiarioChart").then((m) => m.HeadcountDiarioChart),
)
const MovimentacaoDiariaChart = nextDynamic(() =>
  import("@/components/clientes/enjoei/MovimentacaoDiariaChart").then(
    (m) => m.MovimentacaoDiariaChart,
  ),
)
const TempoCasaChart = nextDynamic(() =>
  import("@/components/clientes/enjoei/TempoCasaChart").then((m) => m.TempoCasaChart),
)

export const metadata: Metadata = {
  title: "Turnover",
}

// Consulta o snapshot de colaboradores a cada requisição (sem prerender no build).
export const dynamic = "force-dynamic"

export default async function TurnoverPage({
  searchParams,
}: {
  searchParams: { mes?: string }
}) {
  await assertTelaVisivel("enjoei-turnover")

  let data: TurnoverData | null = null
  let erro: string | null = null

  try {
    data = await getTurnoverData(searchParams.mes)
  } catch (e) {
    erro = e instanceof Error ? e.message : "Falha ao consultar o turnover."
  }

  return (
    <div className="w-full">
      <div className="reveal flex flex-wrap items-end justify-between gap-4">
        <div>
          <span className="eyebrow">Gestão</span>
          <div className="mt-3 flex items-center gap-2.5">
            <h1 className="font-display text-3xl font-semibold tracking-tight">Turnover</h1>
            <TurnoverInfo />
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Rotatividade da equipe — admissões, desligamentos e taxa de turnover.
          </p>
        </div>
        {data && data.meses.length > 0 && (
          <MonthFilter
            meses={data.meses}
            atual={data.mesAtual}
            basePath="/dashboards/clientes/enjoei/turnover"
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
            <p className="font-semibold">Não foi possível carregar o turnover.</p>
            <p className="mt-1 text-destructive/80">{erro}</p>
          </div>
        </div>
      ) : data && data.meses.length > 0 ? (
        <>
          <TurnoverKpis
            quadroAtivoAtual={data.kpis.quadroAtivoAtual}
            admissoesMes={data.kpis.admissoesMes}
            desligamentosMes={data.kpis.desligamentosMes}
            taxaTurnoverPct={data.kpis.taxaTurnoverPct}
          />

          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <section className="reveal glass flex flex-col rounded-2xl p-5">
              <div>
                <h2 className="font-display text-lg font-semibold">Admissões vs. desligamentos</h2>
                <p className="text-xs text-muted-foreground">
                  Por mês — últimos 12 meses ou desde a primeira admissão registrada
                </p>
              </div>
              <div className="mt-4">
                <AdmissoesDesligamentosChart dados={data.serieMensal} />
              </div>
            </section>

            <section className="reveal delay-1 glass flex flex-col rounded-2xl p-5">
              <div>
                <h2 className="font-display text-lg font-semibold">Taxa de turnover mensal</h2>
                <p className="text-xs text-muted-foreground">
                  Desligados no mês ÷ quadro ativo médio do mês (média dos dias registrados)
                </p>
              </div>
              <div className="mt-4">
                <TurnoverRateChart dados={data.serieMensal} />
              </div>
            </section>
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <section className="reveal delay-1 glass flex flex-col rounded-2xl p-5 lg:col-span-2">
              <div>
                <h2 className="font-display text-lg font-semibold">Headcount por dia</h2>
                <p className="text-xs text-muted-foreground">
                  Colaboradores ativos em cada dia do mês, conforme registrado — dias sem registro ficam sem ponto
                </p>
              </div>
              <div className="mt-4">
                <HeadcountDiarioChart dados={data.headcountDiario} />
              </div>
            </section>

            <section className="reveal delay-2 glass flex flex-col rounded-2xl p-5 lg:col-span-2">
              <div>
                <h2 className="font-display text-lg font-semibold">
                  Admissões e desligamentos por dia
                </h2>
                <p className="text-xs text-muted-foreground">
                  Entradas e saídas no dia exato em que ocorreram, no mês selecionado
                </p>
              </div>
              <div className="mt-4">
                <MovimentacaoDiariaChart dados={data.movimentacaoDiaria} />
              </div>
            </section>
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
            <section className="reveal delay-2 glass flex flex-col rounded-2xl p-5">
              <div>
                <h2 className="font-display text-lg font-semibold">Tempo de casa</h2>
                <p className="text-xs text-muted-foreground">
                  Distribuição dos colaboradores ativos no último dia registrado (
                  {data.kpis.quadroAtivoAtual})
                </p>
              </div>
              <div className="mt-4">
                <TempoCasaChart dados={data.tempoCasa} />
              </div>
            </section>

            <section className="reveal delay-3 glass flex flex-col rounded-2xl p-5">
              <div>
                <h2 className="font-display text-lg font-semibold">Desligamentos recentes</h2>
                <p className="text-xs text-muted-foreground">Últimos desligamentos registrados no relatório</p>
              </div>
              <div className="mt-4">
                <DesligadosRecentes dados={data.desligadosRecentes} />
              </div>
            </section>
          </div>
        </>
      ) : (
        <div className="mt-8 rounded-2xl border border-enjoei/10 bg-enjoei-mist/50 p-6 text-sm text-muted-foreground">
          Nenhum registro de colaboradores encontrado.
        </div>
      )}
    </div>
  )
}
