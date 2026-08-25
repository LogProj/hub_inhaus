"use client"

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

import { StatusBadge } from "@/components/desvios/StatusBadge"
import { STATUS_DESVIO } from "@/lib/desvios/opcoes"
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

function formatarMes(chave: string): string {
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

function GraficoBarrasHorizontais({ dados }: { dados: Contagem[] }) {
  if (dados.length === 0) {
    return <p className="py-8 text-center text-sm text-muted-foreground">Sem dados.</p>
  }
  const altura = Math.max(120, dados.length * 36)
  const preparados = dados.map((d) => ({ rotulo: d.chave || "Não informado", total: d.total }))
  return (
    <ResponsiveContainer width="100%" height={altura}>
      <BarChart
        layout="vertical"
        data={preparados}
        margin={{ top: 2, right: 40, bottom: 2, left: 4 }}
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
        <Bar dataKey="total" radius={[0, 6, 6, 0]} maxBarSize={20} fill={TEAL} />
      </BarChart>
    </ResponsiveContainer>
  )
}

export function PainelDesvios({ dados }: { dados: IndicadoresDesvios }) {
  if (dados.total === 0) {
    return (
      <div className="glass rounded-3xl p-10 text-center text-muted-foreground">
        Sem desvios no seu acesso.
      </div>
    )
  }

  const concluidas = dados.porStatus.CONCLUIDA ?? 0
  const aderencia = dados.total > 0 ? (concluidas / dados.total) * 100 : 0

  const statusGrafico = STATUS_DESVIO.map((s) => ({
    rotulo: s.label,
    total: dados.porStatus[s.value] ?? 0,
    value: s.value,
  }))

  const mesesGrafico = dados.porMes.map((m) => ({ rotulo: formatarMes(m.chave), total: m.total }))

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="glass rounded-3xl p-5">
          <p className="text-sm text-muted-foreground">Total de desvios</p>
          <p className="mt-1 text-2xl font-semibold text-navy">
            {dados.total.toLocaleString("pt-BR")}
          </p>
        </div>
        {STATUS_DESVIO.map((s) => {
          const total = dados.porStatus[s.value] ?? 0
          const pct = dados.total > 0 ? (total / dados.total) * 100 : 0
          return (
            <div key={s.value} className="glass rounded-3xl p-5">
              <StatusBadge status={s.value} />
              <p className="mt-2 text-2xl font-semibold text-navy">
                {total.toLocaleString("pt-BR")}
              </p>
              <p className="text-xs text-muted-foreground">{pct.toFixed(1)}% do total</p>
            </div>
          )
        })}
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="glass rounded-3xl bg-inhaus-grad p-5 text-white">
          <p className="text-sm text-white/80">Aderência</p>
          <p className="mt-1 text-3xl font-semibold">{aderencia.toFixed(1)}%</p>
          <p className="text-xs text-white/70">Concluídas ÷ total de desvios</p>
        </div>
        <div className="glass rounded-3xl p-5">
          <p className="text-sm text-muted-foreground">Valor pendente</p>
          <p className="mt-1 text-2xl font-semibold text-navy">
            {formatarMoeda(dados.valorPendente)}
          </p>
        </div>
        <div className="glass rounded-3xl p-5">
          <p className="text-sm text-muted-foreground">Valor total</p>
          <p className="mt-1 text-2xl font-semibold text-navy">
            {formatarMoeda(dados.valorTotal)}
          </p>
        </div>
      </div>

      {/* Gráficos */}
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="glass rounded-3xl p-5">
          <h2 className="mb-3 text-sm font-semibold text-navy">Desvios por status</h2>
          {statusGrafico.every((s) => s.total === 0) ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Sem dados.</p>
          ) : (
            <ResponsiveContainer width="100%" height={Math.max(120, statusGrafico.length * 40)}>
              <BarChart
                layout="vertical"
                data={statusGrafico}
                margin={{ top: 2, right: 40, bottom: 2, left: 4 }}
                barCategoryGap={12}
              >
                <XAxis type="number" hide />
                <YAxis
                  type="category"
                  dataKey="rotulo"
                  width={110}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                />
                <Tooltip cursor={{ fill: "rgba(2,113,147,0.06)" }} content={<TooltipPadrao />} />
                <Bar dataKey="total" radius={[0, 6, 6, 0]} maxBarSize={26}>
                  {statusGrafico.map((s) => (
                    <Cell key={s.value} fill={CORES_STATUS[s.value] ?? TEAL} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="glass rounded-3xl p-5">
          <h2 className="mb-3 text-sm font-semibold text-navy">Evolução por mês</h2>
          {mesesGrafico.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Sem dados.</p>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={mesesGrafico} margin={{ top: 8, right: 16, bottom: 2, left: -16 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(2,36,67,0.08)" vertical={false} />
                <XAxis
                  dataKey="rotulo"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                />
                <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                <Tooltip content={<TooltipPadrao />} />
                <Line
                  type="monotone"
                  dataKey="total"
                  stroke={TEAL}
                  strokeWidth={2}
                  dot={{ r: 3, fill: TEAL }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="glass rounded-3xl p-5">
          <h2 className="mb-3 text-sm font-semibold text-navy">Desvios por motivo</h2>
          <div className="max-h-80 overflow-y-auto">
            <GraficoBarrasHorizontais dados={dados.porMotivo} />
          </div>
        </div>

        <div className="glass rounded-3xl p-5">
          <h2 className="mb-3 text-sm font-semibold text-navy">Desvios por causa raiz</h2>
          <div className="max-h-80 overflow-y-auto">
            <GraficoBarrasHorizontais dados={dados.porCausaRaiz} />
          </div>
        </div>

        <div className="glass rounded-3xl p-5 lg:col-span-2">
          <h2 className="mb-3 text-sm font-semibold text-navy">Top clientes</h2>
          <div className="max-h-80 overflow-y-auto">
            <GraficoBarrasHorizontais dados={dados.porCliente} />
          </div>
        </div>
      </div>
    </div>
  )
}
