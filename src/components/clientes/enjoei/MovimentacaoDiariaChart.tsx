"use client"

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

import type { PontoMovimentacaoDiaria } from "@/lib/clientes/enjoei/turnover"

const COR_ADMISSAO = "#16A34A"
const COR_DESLIGAMENTO = "#EF4444"

type TooltipProps = {
  active?: boolean
  payload?: { payload?: PontoMovimentacaoDiaria }[]
}

function CustomTooltip({ active, payload }: TooltipProps) {
  if (!active || !payload?.length) return null
  const ponto = payload[0]?.payload
  if (!ponto) return null
  return (
    <div className="rounded-xl border border-enjoei/10 bg-white/90 px-3 py-2 text-xs shadow-[0_12px_32px_-16px_rgba(97,0,93,0.4)] backdrop-blur-xl">
      <p className="mb-1.5 font-semibold text-foreground">{ponto.label}</p>
      <p className="flex items-center gap-2">
        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: COR_ADMISSAO }} />
        Admissões
        <span className="ml-auto font-semibold tabular-nums text-foreground">{ponto.admissoes}</span>
      </p>
      <p className="mt-1 flex items-center gap-2">
        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: COR_DESLIGAMENTO }} />
        Desligamentos
        <span className="ml-auto font-semibold tabular-nums text-foreground">
          {ponto.desligamentos}
        </span>
      </p>
    </div>
  )
}

/** Admissões e desligamentos por dia do mês selecionado. */
export function MovimentacaoDiariaChart({ dados }: { dados: PontoMovimentacaoDiaria[] }) {
  return (
    <div role="img" aria-label="Gráfico de barras de admissões e desligamentos por dia do mês.">
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={dados} margin={{ top: 12, right: 16, left: 0, bottom: 0 }} barGap={2}>
          <CartesianGrid stroke="#F0E6EF" vertical={false} />
          <XAxis dataKey="dia" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "#7A7A7A" }} />
          <YAxis
            tickLine={false}
            axisLine={false}
            width={32}
            allowDecimals={false}
            tick={{ fontSize: 11, fill: "#7A7A7A" }}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(97,0,93,0.06)" }} />
          <Legend
            verticalAlign="top"
            height={28}
            align="right"
            iconType="circle"
            iconSize={8}
            formatter={(v) => <span className="text-xs text-muted-foreground">{v}</span>}
          />
          <Bar
            dataKey="admissoes"
            name="Admissões"
            fill={COR_ADMISSAO}
            radius={[4, 4, 0, 0]}
            maxBarSize={16}
            animationDuration={900}
            animationEasing="ease-out"
          />
          <Bar
            dataKey="desligamentos"
            name="Desligamentos"
            fill={COR_DESLIGAMENTO}
            radius={[4, 4, 0, 0]}
            maxBarSize={16}
            animationDuration={900}
            animationEasing="ease-out"
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
