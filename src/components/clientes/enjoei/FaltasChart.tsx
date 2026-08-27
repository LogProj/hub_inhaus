"use client"

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

import type { PresencasTimeline as Dados } from "@/lib/clientes/enjoei/absenteismo"

type TooltipProps = {
  active?: boolean
  label?: string | number
  payload?: { value?: number }[]
}

function CustomTooltip({ active, payload, label }: TooltipProps) {
  if (!active || !payload?.length) return null
  const faltas = payload[0]?.value ?? 0
  return (
    <div className="rounded-xl border border-red-200 bg-white/90 px-3 py-2 text-xs shadow-[0_12px_32px_-16px_rgba(239,68,68,0.4)] backdrop-blur-xl">
      <p className="mb-1 font-semibold text-foreground">Dia {label}</p>
      <p className="flex items-center gap-2">
        <span className="h-2 w-2 rounded-full bg-red-500" />
        Faltas
        <span className="ml-3 font-semibold tabular-nums text-red-600">{faltas}</span>
      </p>
    </div>
  )
}

/** Faltas por dia do mês (barras vermelhas, animadas). */
export function FaltasChart({ dados }: { dados: Dados }) {
  const pontos = dados.pontos.filter((p) => !p.domingo) // domingo não tem operação
  const maxFaltas = Math.max(1, ...pontos.map((p) => p.faltas))
  const topo = Math.ceil((maxFaltas + 1) / 2) * 2

  return (
    <div role="img" aria-label="Gráfico de barras da quantidade de faltas por dia ao longo do mês.">
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={pontos} margin={{ top: 12, right: 16, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="fillFaltas" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#EF4444" stopOpacity={0.95} />
              <stop offset="100%" stopColor="#F87171" stopOpacity={0.7} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="#FEE2E2" vertical={false} />
          <XAxis
            dataKey="dia"
            tickLine={false}
            axisLine={false}
            interval="preserveStartEnd"
            minTickGap={14}
            tick={{ fontSize: 11, fill: "#7A7A7A" }}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            width={32}
            allowDecimals={false}
            domain={[0, topo]}
            tick={{ fontSize: 11, fill: "#7A7A7A" }}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(239,68,68,0.06)" }} />
          <Bar dataKey="faltas" radius={[6, 6, 0, 0]} animationDuration={900} animationEasing="ease-out">
            <LabelList
              dataKey="faltas"
              position="top"
              offset={6}
              className="fill-red-600"
              style={{ fontSize: 11, fontWeight: 600 }}
              formatter={(v) => (Number(v) > 0 ? Number(v) : "")}
            />
            {pontos.map((p) => (
              <Cell key={p.dia} fill="url(#fillFaltas)" />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
