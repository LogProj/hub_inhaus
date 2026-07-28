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

const MES_ABREV = [
  "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
  "Jul", "Ago", "Set", "Out", "Nov", "Dez",
]

/** "2026-07-28" -> "28/07" (dia) · "2026-07" -> "Jul/2026" (mês). */
function rotulo(iso: string, formato: "dia" | "mes"): string {
  const p = iso.split("-")
  if (formato === "mes") return `${MES_ABREV[Number(p[1]) - 1] ?? p[1]}/${p[0]}`
  return `${p[2]}/${p[1]}`
}

function makeTooltip(formato: "dia" | "mes", sufixo: string) {
  return function TooltipLinha({
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
        <p className="text-xs text-muted-foreground">{label ? rotulo(label, formato) : ""}</p>
        <p className="text-sm font-semibold text-teal">
          {payload[0].value.toLocaleString("pt-BR")} {sufixo}
        </p>
      </div>
    )
  }
}

/**
 * Linha do tempo do quadro. `formato="dia"` mostra por data de referência;
 * `formato="mes"` mostra a média por mês. Área em teal, com um ponto por
 * registro (fotografia/mês) para que dias esparsos fiquem visíveis.
 */
export function LinhaQuadro({
  dados,
  formato = "dia",
  sufixoTooltip = "pessoas",
  gradId = "grad-quadro",
}: {
  dados: PontoLinha[]
  formato?: "dia" | "mes"
  sufixoTooltip?: string
  gradId?: string
}) {
  const Tip = makeTooltip(formato, sufixoTooltip)
  return (
    <ResponsiveContainer width="100%" height={260}>
      <AreaChart data={dados} margin={{ top: 8, right: 12, bottom: 4, left: 4 }}>
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#027193" stopOpacity={0.28} />
            <stop offset="100%" stopColor="#027193" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,36,67,0.06)" vertical={false} />
        <XAxis
          dataKey="dia"
          tickFormatter={(v: string) => rotulo(v, formato)}
          tickLine={false}
          axisLine={false}
          minTickGap={24}
          tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          width={44}
          tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
          tickFormatter={(v: number) => v.toLocaleString("pt-BR")}
        />
        <Tooltip content={<Tip />} />
        <Area
          type="monotone"
          dataKey="total"
          stroke="#027193"
          strokeWidth={2}
          fill={`url(#${gradId})`}
          dot={{ r: 3, fill: "#027193", strokeWidth: 0 }}
          activeDot={{ r: 4, fill: "#027193" }}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}
