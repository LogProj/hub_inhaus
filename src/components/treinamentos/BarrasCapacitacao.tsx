"use client"

import {
  Bar,
  BarChart,
  Cell,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

import type { Barra } from "@/lib/capacitacao"

const ALTURA_BARRA = 40

function encurtar(texto: string, max: number): string {
  if (max <= 0) return texto
  return texto.length > max ? texto.slice(0, max - 1).trimEnd() + "…" : texto
}

function fmt(n: number): string {
  return n.toLocaleString("pt-BR", { maximumFractionDigits: 1 })
}

function makeTooltip(sufixo: string, sufixoSecundario?: string) {
  return function TooltipBarras({
    active,
    payload,
  }: {
    active?: boolean
    payload?: Array<{ payload: Barra }>
  }) {
    if (!active || !payload?.length) return null
    const item = payload[0].payload
    return (
      <div className="max-w-xs rounded-xl border border-navy/10 bg-white px-3 py-2 shadow-card">
        <p className="text-xs font-medium text-navy">{item.rotulo}</p>
        <p className="text-sm font-semibold text-teal">
          {fmt(item.total)} {sufixo}
        </p>
        {typeof item.secundario === "number" && sufixoSecundario && (
          <p className="text-xs text-navy/60">
            {fmt(item.secundario)} {sufixoSecundario}
          </p>
        )}
      </div>
    )
  }
}

/**
 * Ranking em barras horizontais para o painel de capacitação. `sufixo` rotula o
 * valor principal (ex.: "horas"); `sufixoSecundario` mostra um segundo número no
 * tooltip (ex.: "pessoas" por CR). Altura fixa por barra; o "top N com scroll"
 * fica a cargo do contêiner pai.
 */
export function BarrasCapacitacao({
  dados,
  sufixo = "horas",
  sufixoSecundario,
  larguraRotulo = 200,
  maxRotulo = 30,
}: {
  dados: Barra[]
  sufixo?: string
  sufixoSecundario?: string
  larguraRotulo?: number
  maxRotulo?: number
}) {
  const altura = Math.max(120, dados.length * ALTURA_BARRA)
  const Tip = makeTooltip(sufixo, sufixoSecundario)

  return (
    <ResponsiveContainer width="100%" height={altura}>
      <BarChart layout="vertical" data={dados} margin={{ top: 2, right: 48, bottom: 2, left: 4 }} barCategoryGap={8}>
        <XAxis type="number" hide />
        <YAxis
          type="category"
          dataKey="rotulo"
          width={larguraRotulo}
          tickLine={false}
          axisLine={false}
          tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
          tickFormatter={(v: string) => encurtar(v, maxRotulo)}
        />
        <Tooltip cursor={{ fill: "rgba(2,113,147,0.06)" }} content={<Tip />} />
        <Bar dataKey="total" radius={[0, 6, 6, 0]} maxBarSize={22}>
          {dados.map((_, i) => (
            <Cell key={i} fill="#027193" />
          ))}
          <LabelList dataKey="total" position="right" className="fill-foreground text-[11px] font-medium" formatter={(v) => fmt(Number(v))} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
