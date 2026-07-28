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

import type { PontoLinha } from "@/lib/quadro"

/** "2026-07-28" -> "28/07". */
function diaCurto(iso: string): string {
  const [, m, d] = iso.split("-")
  return `${d}/${m}`
}

function TooltipLinha({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: Array<{ value: number }>
  label?: string
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-xl border border-navy/10 bg-white px-3 py-2 shadow-card">
      <p className="text-xs text-muted-foreground">{label ? diaCurto(label) : ""}</p>
      <p className="text-sm font-semibold text-teal">
        {payload[0].value.toLocaleString("pt-BR")} pessoas
      </p>
    </div>
  )
}

/** Linha do tempo do quadro ativo por dia. Área em teal. */
export function LinhaQuadro({ dados }: { dados: PontoLinha[] }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <AreaChart data={dados} margin={{ top: 8, right: 12, bottom: 4, left: 4 }}>
        <defs>
          <linearGradient id="grad-quadro" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#027193" stopOpacity={0.28} />
            <stop offset="100%" stopColor="#027193" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,36,67,0.06)" vertical={false} />
        <XAxis
          dataKey="dia"
          tickFormatter={diaCurto}
          tickLine={false}
          axisLine={false}
          minTickGap={28}
          tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          width={44}
          tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
          tickFormatter={(v: number) => v.toLocaleString("pt-BR")}
        />
        <Tooltip content={<TooltipLinha />} />
        <Area
          type="monotone"
          dataKey="total"
          stroke="#027193"
          strokeWidth={2}
          fill="url(#grad-quadro)"
          dot={false}
          activeDot={{ r: 4, fill: "#027193" }}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}
