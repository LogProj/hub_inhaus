"use client"

import * as React from "react"
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { Maximize2, Minimize2 } from "lucide-react"

import { Combobox } from "@/components/ui/Combobox"
import { TabelaResumoDesvios } from "@/components/desvios/TabelaResumoDesvios"
import { STATUS_DESVIO, rotuloStatus } from "@/lib/desvios/opcoes"
import type { Contagem, IndicadoresDesvios } from "@/lib/desvios"

const TEAL = "#027193"
const CORES_STATUS: Record<string, string> = {
  EM_TRATATIVA: "#f59e0b",
  PENDENTE: "#ef4444",
  CONCLUIDA: "#10b981",
}

function formatarMoeda(valor: number): string {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
}

/** "YYYY-MM" → "MM/AAAA" */
function formatarMesLongo(chave: string): string {
  const [ano, mes] = chave.split("-")
  if (!ano || !mes) return chave
  return `${mes}/${ano}`
}

/** "YYYY-MM" → "MM/AA" (eixo compacto) */
function formatarMesCurto(chave: string): string {
  const [ano, mes] = chave.split("-")
  if (!ano || !mes) return chave
  return `${mes}/${ano.slice(2)}`
}

function encurtar(texto: string, max = 26): string {
  return texto.length > max ? texto.slice(0, max - 1).trimEnd() + "…" : texto
}

function TooltipPadrao({
  active,
  payload,
  label,
  sufixo = "",
}: {
  active?: boolean
  payload?: Array<{ payload: { rotulo?: string; total: number } }>
  label?: string
  sufixo?: string
}) {
  if (!active || !payload?.length) return null
  const item = payload[0].payload
  return (
    <div className="max-w-xs rounded-xl border border-navy/10 bg-white px-3 py-2 shadow-card">
      <p className="text-xs font-medium text-navy">{item.rotulo ?? label}</p>
      <p className="text-sm font-semibold text-teal">
        {item.total.toLocaleString("pt-BR")}
        {sufixo}
      </p>
    </div>
  )
}

function GraficoBarrasHorizontais({ dados, altura = 300 }: { dados: Contagem[]; altura?: number }) {
  if (dados.length === 0) {
    return <p className="py-8 text-center text-sm text-muted-foreground">Sem dados.</p>
  }
  const preparados = dados.map((d) => ({ rotulo: d.chave || "Não informado", total: d.total }))
  return (
    <ResponsiveContainer width="100%" height={altura}>
      <BarChart
        layout="vertical"
        data={preparados}
        margin={{ top: 2, right: 48, bottom: 2, left: 4 }}
        barCategoryGap={8}
      >
        <XAxis type="number" hide />
        <YAxis
          type="category"
          dataKey="rotulo"
          width={160}
          tickLine={false}
          axisLine={false}
          tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
          tickFormatter={(v: string) => encurtar(v)}
        />
        <Tooltip cursor={{ fill: "rgba(2,113,147,0.06)" }} content={<TooltipPadrao />} />
        <Bar dataKey="total" radius={[0, 6, 6, 0]} maxBarSize={20} fill={TEAL}>
          <LabelList
            dataKey="total"
            position="right"
            className="fill-foreground text-[11px] font-medium"
            formatter={(value: React.ReactNode) => Number(value).toLocaleString("pt-BR")}
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

function CartaoGrafico({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div className="glass rounded-3xl p-5">
      <h2 className="mb-3 text-sm font-semibold text-navy">{titulo}</h2>
      {children}
    </div>
  )
}

export function PainelDesvios({ info }: { info: React.ReactNode }) {
  const [dados, setDados] = React.useState<IndicadoresDesvios | null>(null)
  const [meses, setMeses] = React.useState<string[]>([])
  const [mes, setMes] = React.useState<string | null>(null)
  const [carregando, setCarregando] = React.useState(true)
  const [tela, setTela] = React.useState(false)

  const containerRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    let cancelado = false
    setCarregando(true)
    const params = mes ? `?mes=${encodeURIComponent(mes)}` : ""
    fetch(`/api/desvios/indicadores${params}`)
      .then((r) => r.json())
      .then((json: { indicadores: IndicadoresDesvios; meses: string[]; mes: string | null }) => {
        if (cancelado) return
        setDados(json.indicadores)
        setMeses(json.meses)
        setMes(json.mes)
      })
      .finally(() => {
        if (!cancelado) setCarregando(false)
      })
    return () => {
      cancelado = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mes])

  React.useEffect(() => {
    function aoMudar() {
      setTela(Boolean(document.fullscreenElement))
    }
    document.addEventListener("fullscreenchange", aoMudar)
    return () => document.removeEventListener("fullscreenchange", aoMudar)
  }, [])

  function alternarTelaCheia() {
    if (!containerRef.current) return
    if (document.fullscreenElement) {
      document.exitFullscreen?.()
    } else {
      containerRef.current.requestFullscreen?.()
    }
  }

  const opcoesMeses = meses.map((m) => ({ value: m, label: formatarMesLongo(m) }))

  const concluidas = dados?.porStatus.CONCLUIDA ?? 0
  const total = dados?.total ?? 0
  const aderencia = total > 0 ? (concluidas / total) * 100 : 0

  const statusGrafico = STATUS_DESVIO.map((s) => ({
    rotulo: s.label,
    total: dados?.porStatus[s.value] ?? 0,
    value: s.value,
  }))

  const mesesGrafico = (dados?.porMes ?? []).map((m) => ({
    rotulo: formatarMesCurto(m.chave),
    total: m.total,
  }))

  return (
    <div
      ref={containerRef}
      className={`space-y-6 bg-navy-mist ${tela ? "min-h-screen overflow-y-auto p-6" : "p-1"}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-semibold text-navy">Painel de Desvios</h1>
          {info}
        </div>
        <div className="flex items-center gap-2">
          <Combobox
            value={mes}
            onChange={(v) => setMes(v)}
            options={opcoesMeses}
            placeholder="Mês"
            ariaLabel="Filtrar por mês"
            className="w-40"
          />
          <button
            type="button"
            onClick={alternarTelaCheia}
            aria-label={tela ? "Sair da tela cheia" : "Tela cheia"}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-input bg-white/80 text-navy transition-colors hover:border-teal/40"
          >
            {tela ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {!dados || (total === 0 && !carregando) ? (
        <div className="glass rounded-3xl p-10 text-center text-muted-foreground">
          {carregando ? "Carregando…" : "Sem desvios para o período."}
        </div>
      ) : (
        <>
          {/* KPIs */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="glass rounded-3xl bg-inhaus-grad p-5 text-white">
              <p className="text-sm text-white/80">Aderência</p>
              <p className="mt-1 text-3xl font-semibold">{aderencia.toFixed(1)}%</p>
              <p className="text-xs text-white/70">Concluídas ÷ total de desvios</p>
            </div>
            <div className="glass rounded-3xl p-5">
              <p className="text-sm text-muted-foreground">Total de desvios</p>
              <p className="mt-1 text-2xl font-semibold text-navy">
                {total.toLocaleString("pt-BR")}
              </p>
            </div>
            <div className="glass rounded-3xl p-5">
              <p className="text-sm text-muted-foreground">Valor total</p>
              <p className="mt-1 text-2xl font-semibold text-navy">
                {formatarMoeda(dados.valorTotal)}
              </p>
            </div>
            <div className="glass rounded-3xl p-5">
              <p className="text-sm text-muted-foreground">Valor pendente</p>
              <p className="mt-1 text-2xl font-semibold text-navy">
                {formatarMoeda(dados.valorPendente)}
              </p>
            </div>
          </div>

          {/* Gráficos */}
          <div className="grid gap-4 lg:grid-cols-5">
            <div className="lg:col-span-2">
            <CartaoGrafico titulo="Desvios por status">
              {statusGrafico.every((s) => s.total === 0) ? (
                <p className="py-8 text-center text-sm text-muted-foreground">Sem dados.</p>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={statusGrafico}
                      dataKey="total"
                      nameKey="rotulo"
                      innerRadius={55}
                      outerRadius={85}
                      paddingAngle={2}
                      label={(props: { value?: number }) =>
                        (props.value ?? 0).toLocaleString("pt-BR")
                      }
                    >
                      {statusGrafico.map((s) => (
                        <Cell key={s.value} fill={CORES_STATUS[s.value] ?? TEAL} />
                      ))}
                    </Pie>
                    <Legend
                      formatter={(_valor, entrada) =>
                        rotuloStatus((entrada?.payload as { value: string })?.value ?? "")
                      }
                    />
                    <Tooltip content={<TooltipPadrao />} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </CartaoGrafico>
            </div>

            <div className="lg:col-span-3">
            <CartaoGrafico titulo="Evolução por mês">
              {mesesGrafico.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">Sem dados.</p>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={mesesGrafico} margin={{ top: 16, right: 16, bottom: 2, left: -16 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(2,36,67,0.08)" vertical={false} />
                    <XAxis
                      dataKey="rotulo"
                      tickLine={false}
                      axisLine={false}
                      tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                    />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                    />
                    <Tooltip content={<TooltipPadrao />} />
                    <Line type="monotone" dataKey="total" stroke={TEAL} strokeWidth={2} dot={{ r: 3, fill: TEAL }}>
                      <LabelList
                        dataKey="total"
                        position="top"
                        className="fill-foreground text-[11px] font-medium"
                        formatter={(value: React.ReactNode) => Number(value).toLocaleString("pt-BR")}
                      />
                    </Line>
                  </LineChart>
                </ResponsiveContainer>
              )}
            </CartaoGrafico>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <CartaoGrafico titulo="Desvios por motivo">
              <GraficoBarrasHorizontais dados={dados.porMotivo} />
            </CartaoGrafico>

            <CartaoGrafico titulo="Desvios por causa raiz">
              <GraficoBarrasHorizontais dados={dados.porCausaRaiz} />
            </CartaoGrafico>

            <CartaoGrafico titulo="Top clientes">
              <GraficoBarrasHorizontais dados={dados.porCliente} />
            </CartaoGrafico>
          </div>

          {/* Tabela paginada dos desvios do período, com "Ver" para o detalhe. */}
          <TabelaResumoDesvios mes={mes} />
        </>
      )}
    </div>
  )
}
