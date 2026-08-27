"use client"

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

import type { PontoHeadcountDiario } from "@/lib/clientes/enjoei/turnover"

type TooltipProps = {
  active?: boolean
  label?: string | number
  payload?: { payload?: PontoHeadcountDiario }[]
}

function CustomTooltip({ active, payload, label }: TooltipProps) {
  if (!active || !payload?.length) return null
  const ponto = payload[0]?.payload
  if (!ponto) return null
  if (ponto.ativos == null) {
    return (
      <div className="rounded-xl border border-enjoei/10 bg-white/90 px-3 py-2 text-xs shadow-[0_12px_32px_-16px_rgba(97,0,93,0.4)] backdrop-blur-xl">
        <p className="mb-1 font-semibold text-foreground">{label}</p>
        <p className="text-muted-foreground">Sem quadro registrado neste dia</p>
      </div>
    )
  }
  return (
    <div className="rounded-xl border border-enjoei/10 bg-white/90 px-3 py-2 text-xs shadow-[0_12px_32px_-16px_rgba(97,0,93,0.4)] backdrop-blur-xl">
      <p className="mb-1.5 font-semibold text-foreground">{label}</p>
      <p className="flex items-center gap-2">
        <span className="h-2 w-2 rounded-full bg-enjoei" />
        Ativos
        <span className="ml-3 font-semibold tabular-nums text-foreground">{ponto.ativos}</span>
      </p>
    </div>
  )
}

/**
 * Headcount de ativos por dia do mês selecionado, exatamente como registrado.
 * Dias sem registro ficam no eixo, mas sem ponto/linha (lacuna visível).
 */
export function HeadcountDiarioChart({ dados }: { dados: PontoHeadcountDiario[] }) {
  const maxAtivos = Math.max(1, ...dados.map((p) => p.ativos ?? 0))
  const topo = Math.ceil((maxAtivos + 1) / 5) * 5

  return (
    <div role="img" aria-label="Gráfico de área do headcount de colaboradores ativos por dia do mês.">
      <ResponsiveContainer width="100%" height={280}>
        <AreaChart data={dados} margin={{ top: 12, right: 16, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="fillHeadcountDiario" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#61005D" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#61005D" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="#F0E6EF" vertical={false} />
          <XAxis dataKey="dia" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "#7A7A7A" }} />
          <YAxis
            tickLine={false}
            axisLine={false}
            width={32}
            domain={[0, topo]}
            allowDecimals={false}
            tick={{ fontSize: 11, fill: "#7A7A7A" }}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ stroke: "#61005D", strokeOpacity: 0.18, strokeWidth: 1.5 }} />
          <Area
            type="monotone"
            dataKey="ativos"
            name="ativos"
            stroke="#61005D"
            strokeWidth={3}
            fill="url(#fillHeadcountDiario)"
            connectNulls={false}
            dot={{ r: 2.5, fill: "#61005D", stroke: "#fff", strokeWidth: 1 }}
            activeDot={{ r: 5, strokeWidth: 2, stroke: "#fff" }}
            animationDuration={1100}
            animationEasing="ease-out"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
