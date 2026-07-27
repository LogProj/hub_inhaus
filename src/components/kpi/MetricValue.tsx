"use client"

import { useEffect, useRef, useState } from "react"
import { cn } from "@/lib/utils"
import { formatarNumero } from "@/lib/format"

type MetricValueProps = {
  valor: number
  sufixo?: string
  casas?: number
  className?: string
}

const DURACAO_MS = 900

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3)
}

function reducedMotionAtivo(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  )
}

/**
 * Número em Geist Mono com contagem de 0 até o valor final, em 900ms com
 * easeOutCubic. A contagem roda uma única vez, na primeira montagem — um
 * re-render motivado por troca de filtro apenas atualiza o número exibido,
 * sem recontar do zero.
 */
export function MetricValue({ valor, sufixo, casas, className }: MetricValueProps) {
  const [valorExibido, setValorExibido] = useState(0)
  const jaAnimouRef = useRef(false)

  useEffect(() => {
    // Re-render por troca de valor (ex.: filtro de período) após a primeira
    // montagem: só atualiza o número, sem reiniciar a contagem.
    if (jaAnimouRef.current) {
      setValorExibido(valor)
      return
    }
    jaAnimouRef.current = true

    if (reducedMotionAtivo()) {
      setValorExibido(valor)
      return
    }

    let frame: number
    const inicio = performance.now()

    const passo = (agora: number) => {
      const progresso = Math.min((agora - inicio) / DURACAO_MS, 1)
      setValorExibido(valor * easeOutCubic(progresso))
      if (progresso < 1) {
        frame = requestAnimationFrame(passo)
      } else {
        setValorExibido(valor)
      }
    }

    frame = requestAnimationFrame(passo)
    return () => cancelAnimationFrame(frame)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [valor])

  return (
    <span data-metric className={cn("font-mono text-metric tabular-nums", className)}>
      {formatarNumero(valorExibido, casas)}
      {sufixo}
    </span>
  )
}
