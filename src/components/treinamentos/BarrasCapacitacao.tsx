"use client"

import { Bar, BarChart, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"

import type { Barra } from "@/lib/capacitacao"

const ALTURA_BARRA = 46

function fmt(n: number): string {
  return n.toLocaleString("pt-BR", { maximumFractionDigits: 1 })
}

/** Quebra o rótulo em até 2 linhas conforme a largura disponível; reticências se sobrar. */
function quebrarLinhas(texto: string, largura: number): string[] {
  const porLinha = Math.max(8, Math.floor(largura / 6.6)) // ~6,6px por caractere a 11px
  const palavras = texto.split(/\s+/)
  const linhas: string[] = []
  let atual = ""
  for (const p of palavras) {
    const cand = atual ? `${atual} ${p}` : p
    if (cand.length <= porLinha) {
      atual = cand
    } else {
      if (atual) linhas.push(atual)
      atual = p
      if (linhas.length === 2) break
    }
  }
  if (atual && linhas.length < 2) linhas.push(atual)
  // Se ainda faltou texto (mais de 2 linhas), corta a 2ª com reticências.
  const usado = linhas.join(" ").length
  if (usado < texto.replace(/\s+/g, " ").length && linhas.length === 2) {
    const ult = linhas[1]
    linhas[1] = ult.length > porLinha - 1 ? `${ult.slice(0, porLinha - 1)}…` : `${ult}…`
  }
  return linhas.length ? linhas : [texto]
}

function makeTickRotulo(largura: number) {
  return function TickRotulo({ x, y, payload }: { x?: number; y?: number; payload?: { value: string } }) {
    const linhas = quebrarLinhas(payload?.value ?? "", largura)
    const px = x ?? 0
    const py = y ?? 0
    const inicio = linhas.length > 1 ? -3 : 4
    return (
      <text x={px} y={py} textAnchor="end" fill="hsl(var(--muted-foreground))" fontSize={11}>
        {linhas.map((l, i) => (
          <tspan key={i} x={px} dy={i === 0 ? inicio : 12}>
            {l}
          </tspan>
        ))}
      </text>
    )
  }
}

function makeTooltip(sufixo: string, sufixoSecundario?: string) {
  return function TooltipBarras({ active, payload }: { active?: boolean; payload?: Array<{ payload: Barra }> }) {
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
 * tooltip. O rótulo do eixo quebra em até 2 linhas para não cortar nomes longos.
 * Altura fixa por barra; o "top N com scroll" fica a cargo do contêiner pai.
 */
export function BarrasCapacitacao({
  dados,
  sufixo = "horas",
  sufixoSecundario,
  larguraRotulo = 150,
}: {
  dados: Barra[]
  sufixo?: string
  sufixoSecundario?: string
  larguraRotulo?: number
}) {
  const altura = Math.max(120, dados.length * ALTURA_BARRA)
  const Tip = makeTooltip(sufixo, sufixoSecundario)
  const Tick = makeTickRotulo(larguraRotulo)

  return (
    <ResponsiveContainer width="100%" height={altura}>
      <BarChart layout="vertical" data={dados} margin={{ top: 4, right: 44, bottom: 4, left: 4 }} barCategoryGap={10}>
        <XAxis type="number" hide />
        <YAxis type="category" dataKey="rotulo" width={larguraRotulo} tickLine={false} axisLine={false} tick={<Tick />} interval={0} />
        <Tooltip cursor={{ fill: "rgba(2,113,147,0.06)" }} content={<Tip />} />
        <Bar dataKey="total" radius={[0, 6, 6, 0]} maxBarSize={20}>
          {dados.map((_, i) => (
            <Cell key={i} fill="#027193" />
          ))}
          <LabelList dataKey="total" position="right" className="fill-foreground text-[11px] font-medium" formatter={(v) => fmt(Number(v))} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
