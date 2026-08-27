"use client"

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

import type { PresencasTimeline as Dados } from "@/lib/clientes/enjoei/absenteismo"

const COR_GERAL = "#61005D"

type TooltipProps = {
  active?: boolean
  label?: string | number
  payload?: { dataKey?: string | number; value?: number | null }[]
}

function CustomTooltip({ active, payload, label }: TooltipProps) {
  if (!active || !payload?.length) return null
  const v = payload.find((p) => p.dataKey === "aderencia")?.value
  return (
    <div className="rounded-xl border border-enjoei/10 bg-white/90 px-3 py-2 text-xs shadow-[0_12px_32px_-16px_rgba(97,0,93,0.4)] backdrop-blur-xl">
      <p className="mb-1.5 font-semibold text-foreground">Dia {label}</p>
      <p className="flex items-center gap-2">
        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: COR_GERAL }} />
        Aderência
        <span className="ml-3 font-semibold tabular-nums text-foreground">
          {v == null ? "—" : `${v}%`}
        </span>
      </p>
    </div>
  )
}

/** Aderência (%) por dia (presenças ÷ escalados no dia). */
export function AderenciaChart({ dados }: { dados: Dados }) {
  return (
    <div>
      <div className="flex flex-wrap items-center justify-end gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: COR_GERAL }} aria-hidden />
          Aderência
        </span>
      </div>

      <div
        className="mt-4"
        role="img"
        aria-label="Gráfico de barras da aderência diária (presenças sobre escalados)."
      >
        <ResponsiveContainer width="100%" height={320}>
          <BarChart data={dados.pontos} margin={{ top: 12, right: 16, left: 0, bottom: 0 }} barCategoryGap="18%">
            <defs>
              <linearGradient id="fillAdGeral" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={COR_GERAL} stopOpacity={0.95} />
                <stop offset="100%" stopColor={COR_GERAL} stopOpacity={0.55} />
              </linearGradient>
            </defs>

            <CartesianGrid stroke="#F0E6EF" vertical={false} />
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
              width={40}
              domain={[0, 100]}
              ticks={[0, 25, 50, 75, 100]}
              tickFormatter={(v: number) => `${v}%`}
              tick={{ fontSize: 11, fill: "#7A7A7A" }}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(97,0,93,0.06)" }} />

            <Bar
              dataKey="aderencia"
              name="Aderência"
              fill="url(#fillAdGeral)"
              radius={[4, 4, 0, 0]}
              maxBarSize={26}
              animationDuration={900}
              animationEasing="ease-out"
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
