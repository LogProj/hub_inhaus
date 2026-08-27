"use client"

import { Bar, BarChart, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"

import type { FaixaTempoCasa } from "@/lib/clientes/enjoei/turnover"

const CORES = ["#A78BFA", "#8B5CF6", "#8E2589", "#5B21B6", "#61005D"]

type TooltipProps = {
  active?: boolean
  label?: string | number
  payload?: { value?: number }[]
}

function CustomTooltip({ active, payload, label }: TooltipProps) {
  if (!active || !payload?.length) return null
  const qtd = payload[0]?.value ?? 0
  return (
    <div className="rounded-xl border border-enjoei/10 bg-white/90 px-3 py-2 text-xs shadow-[0_12px_32px_-16px_rgba(97,0,93,0.4)] backdrop-blur-xl">
      <p className="mb-1 font-semibold text-foreground">{label}</p>
      <p>
        <span className="font-semibold tabular-nums text-foreground">{qtd}</span>{" "}
        {qtd === 1 ? "colaborador" : "colaboradores"}
      </p>
    </div>
  )
}

/** Distribuição de tempo de casa dos colaboradores ativos hoje. */
export function TempoCasaChart({ dados }: { dados: FaixaTempoCasa[] }) {
  const total = dados.reduce((s, d) => s + d.quantidade, 0)

  if (total === 0) {
    return (
      <p className="rounded-xl border border-enjoei/10 bg-enjoei-mist/40 p-4 text-sm text-muted-foreground">
        Sem colaboradores ativos com data de admissão para calcular o tempo de casa.
      </p>
    )
  }

  return (
    <div role="img" aria-label="Gráfico de barras da distribuição de tempo de casa dos colaboradores ativos.">
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={dados} layout="vertical" margin={{ top: 4, right: 28, left: 8, bottom: 0 }}>
          <XAxis type="number" hide allowDecimals={false} />
          <YAxis
            type="category"
            dataKey="faixa"
            tickLine={false}
            axisLine={false}
            width={80}
            tick={{ fontSize: 12, fill: "#4B4B4B" }}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(97,0,93,0.06)" }} />
          <Bar dataKey="quantidade" radius={[0, 6, 6, 0]} maxBarSize={26} animationDuration={900} animationEasing="ease-out">
            <LabelList
              dataKey="quantidade"
              position="right"
              className="fill-foreground"
              style={{ fontSize: 12, fontWeight: 600 }}
              formatter={(v) => (Number(v) > 0 ? Number(v) : "")}
            />
            {dados.map((d, i) => (
              <Cell key={d.faixa} fill={CORES[i % CORES.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
