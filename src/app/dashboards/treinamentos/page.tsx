import type { Metadata } from "next"
import { GraduationCap, Users, Clock, Gauge, ClipboardList, Building2, Briefcase, BookOpen, LineChart } from "lucide-react"

import { assertTelaVisivel } from "@/lib/dashboard-acesso"
import { getControleCapacitacao, type Capacitacao } from "@/lib/capacitacao"
import { FiltrosCapacitacao } from "@/components/treinamentos/FiltrosCapacitacao"
import { BarrasCapacitacao } from "@/components/treinamentos/BarrasCapacitacao"
import { InfoCapacitacao } from "@/components/treinamentos/InfoCapacitacao"
import { TabelaTreinamentos } from "@/components/treinamentos/TabelaTreinamentos"
import { LinhaQuadro } from "@/components/dashboard/LinhaQuadro"

export const metadata: Metadata = { title: "Controle de Capacitação" }
export const dynamic = "force-dynamic"

function lista(v: string | string[] | undefined): string[] {
  if (!v) return []
  return (Array.isArray(v) ? v : [v]).filter((s) => s.trim())
}

const nf = (n: number) => n.toLocaleString("pt-BR", { maximumFractionDigits: 1 })

type SearchParams = { [k: string]: string | string[] | undefined }

function CardKpi({
  icone: Icone,
  rotulo,
  valor,
  rodape,
  atraso = 0,
}: {
  icone: typeof Users
  rotulo: string
  valor: string
  rodape?: string
  atraso?: number
}) {
  return (
    <div className="glass reveal relative overflow-hidden rounded-3xl p-6" style={{ animationDelay: `${atraso}s` }}>
      <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-teal-tint text-teal">
        <Icone className="h-5 w-5" />
      </span>
      <p className="mt-4 text-sm font-medium text-muted-foreground">{rotulo}</p>
      <p className="mt-1 font-display text-3xl font-semibold tracking-tight text-foreground">{valor}</p>
      {rodape && <p className="mt-1 text-xs text-muted-foreground">{rodape}</p>}
    </div>
  )
}

function Painel({
  titulo,
  icone: Icone,
  children,
  vazio,
  temDados,
}: {
  titulo: string
  icone: typeof Building2
  children: React.ReactNode
  vazio: string
  temDados: boolean
}) {
  return (
    <div className="glass reveal rounded-3xl p-6">
      <h3 className="mb-4 flex items-center gap-2 font-semibold text-navy">
        <Icone className="h-4 w-4 text-teal" />
        {titulo}
      </h3>
      {temDados ? (
        <div className="max-h-[420px] overflow-y-auto pr-1">{children}</div>
      ) : (
        <p className="text-sm text-navy/60">{vazio}</p>
      )}
    </div>
  )
}

export default async function ControleCapacitacaoPage({ searchParams }: { searchParams: SearchParams }) {
  await assertTelaVisivel("treinamentos-visao-geral")

  const filtros = {
    meses: lista(searchParams.mes),
    clientes: lista(searchParams.cli),
    crs: lista(searchParams.cr),
    responsaveis: lista(searchParams.resp),
  }

  let dados: Capacitacao | null = null
  try {
    dados = await getControleCapacitacao(filtros)
  } catch {
    dados = null
  }

  return (
    <div className="space-y-8">
      <section className="reveal">
        <span className="eyebrow">
          <GraduationCap className="h-3.5 w-3.5" />
          Treinamentos
        </span>
        <div className="mt-4 flex items-center gap-3">
          <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            Controle de Capacitação
          </h1>
          <InfoCapacitacao />
        </div>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Visão gerencial dos treinamentos realizados — pessoas capacitadas e horas de treinamento, por
          mês, cliente, CR, cargo e responsável.
        </p>
      </section>

      {!dados ? (
        <div className="glass reveal rounded-3xl p-8">
          <p className="text-navy/70">Não foi possível carregar o painel agora. Tente novamente.</p>
        </div>
      ) : (
        <>
          <FiltrosCapacitacao opcoes={dados.opcoes} atual={filtros} />

          {/* Cards principais */}
          <section className="grid grid-cols-2 gap-5 lg:grid-cols-4">
            <CardKpi
              icone={Users}
              rotulo="Colaboradores treinados"
              valor={nf(dados.colaboradoresTreinados)}
              rodape="pessoas distintas"
            />
            <CardKpi
              icone={Clock}
              rotulo="Horas treinadas"
              valor={nf(dados.horasTreinadas)}
              rodape="soma de todas as presenças"
              atraso={0.05}
            />
            <CardKpi
              icone={Gauge}
              rotulo="Média por colaborador"
              valor={`${nf(dados.mediaHorasPorColaborador)} h`}
              rodape="carga horária per capita"
              atraso={0.1}
            />
            <CardKpi
              icone={ClipboardList}
              rotulo="Treinamentos realizados"
              valor={nf(dados.treinamentosRealizados)}
              rodape={`${dados.treinamentosAbertos} em aberto · ${dados.naoLocalizados} não localizado(s)`}
              atraso={0.15}
            />
          </section>

          {/* Linha do tempo */}
          <section className="glass reveal rounded-3xl p-6">
            <h3 className="mb-4 flex items-center gap-2 font-semibold text-navy">
              <LineChart className="h-4 w-4 text-teal" />
              Horas treinadas por mês
            </h3>
            {dados.linhaMensal.length > 0 ? (
              <LinhaQuadro dados={dados.linhaMensal} formato="mes" sufixoTooltip="horas" gradId="grad-capacitacao" />
            ) : (
              <p className="text-sm text-navy/60">Sem horas registradas no recorte atual.</p>
            )}
          </section>

          {/* Rankings */}
          <section className="grid gap-5 lg:grid-cols-2">
            <Painel titulo="Horas e pessoas por CR" icone={Building2} temDados={dados.porCr.length > 0} vazio="Sem dados de CR no recorte.">
              <BarrasCapacitacao dados={dados.porCr} sufixo="horas" sufixoSecundario="pessoas" larguraRotulo={220} maxRotulo={0} />
            </Painel>
            <Painel titulo="Horas por cargo" icone={Briefcase} temDados={dados.porCargo.length > 0} vazio="Sem dados de cargo no recorte.">
              <BarrasCapacitacao dados={dados.porCargo} sufixo="horas" sufixoSecundario="presenças" larguraRotulo={200} />
            </Painel>
          </section>

          <section className="glass reveal rounded-3xl p-6">
            <h3 className="mb-4 flex items-center gap-2 font-semibold text-navy">
              <BookOpen className="h-4 w-4 text-teal" />
              Horas por treinamento
            </h3>
            {dados.porTreinamento.length > 0 ? (
              <div className="max-h-[420px] overflow-y-auto pr-1">
                <BarrasCapacitacao dados={dados.porTreinamento} sufixo="horas" sufixoSecundario="presenças" larguraRotulo={240} maxRotulo={0} />
              </div>
            ) : (
              <p className="text-sm text-navy/60">Sem treinamentos no recorte.</p>
            )}
          </section>

          {/* Tabela */}
          <section className="glass reveal rounded-3xl p-6">
            <h3 className="mb-4 font-semibold text-navy">Treinamentos no recorte</h3>
            <TabelaTreinamentos treinamentos={dados.tabela} editavel={false} />
          </section>
        </>
      )}
    </div>
  )
}
