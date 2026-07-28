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

import type { Fatia } from "@/lib/quadro"

/** Altura fixa de cada barra — mantém as barras do mesmo tamanho e deixa o
 *  contêiner rolar quando há muitos itens (top com scroll). */
const ALTURA_BARRA = 40

function encurtar(texto: string, max: number): string {
  if (max <= 0) return texto
  return texto.length > max ? texto.slice(0, max - 1).trimEnd() + "…" : texto
}

function TooltipBarras({
  active,
  payload,
}: {
  active?: boolean
  payload?: Array<{ payload: Fatia }>
}) {
  if (!active || !payload?.length) return null
  const item = payload[0].payload
  return (
    <div className="max-w-xs rounded-xl border border-navy/10 bg-white px-3 py-2 shadow-card">
      <p className="text-xs font-medium text-navy">{item.rotulo}</p>
      <p className="text-sm font-semibold text-teal">
        {item.total.toLocaleString("pt-BR")} pessoas
      </p>
    </div>
  )
}

/**
 * Ranking em barras horizontais (por CR, por cargo…). As barras têm altura fixa;
 * quem controla o "top N com scroll" é o contêiner pai (max-height + overflow).
 */
export function BarrasQuadro({
  dados,
  larguraRotulo = 200,
  maxRotulo = 30,
}: {
  dados: Fatia[]
  /** Largura reservada para o rótulo do eixo (nomes longos, como CR, pedem mais). */
  larguraRotulo?: number
  /** Máximo de caracteres do rótulo; 0 = sem corte (nome inteiro em uma linha). */
  maxRotulo?: number
}) {
  const altura = Math.max(120, dados.length * ALTURA_BARRA)

  return (
    <ResponsiveContainer width="100%" height={altura}>
      <BarChart
        layout="vertical"
        data={dados}
        margin={{ top: 2, right: 48, bottom: 2, left: 4 }}
        barCategoryGap={8}
      >
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
        <Tooltip cursor={{ fill: "rgba(2,113,147,0.06)" }} content={<TooltipBarras />} />
        <Bar dataKey="total" radius={[0, 6, 6, 0]} maxBarSize={22}>
          {dados.map((_, i) => (
            <Cell key={i} fill="#027193" />
          ))}
          <LabelList
            dataKey="total"
            position="right"
            className="fill-foreground text-[11px] font-medium"
            formatter={(value) => Number(value).toLocaleString("pt-BR")}
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
