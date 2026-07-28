"use client"

import { useEffect, useRef, useState } from "react"
import { Info, X } from "lucide-react"
import { cn } from "@/lib/utils"

/**
 * Botão "i" ao lado do título de um dashboard. Abre um popover que explica, em
 * linguagem de negócio (nunca técnica), o que o indicador mostra e como os
 * números são calculados. É OBRIGATÓRIO em todo dashboard — ver CLAUDE.md.
 *
 * O conteúdo (`children`) deve ser visual e escaneável: frases curtas, bullets,
 * um exemplo numérico. Sem termos de banco/sistema.
 */
export function InfoIndicador({
  titulo,
  children,
  className,
}: {
  titulo: string
  children: React.ReactNode
  className?: string
}) {
  const [aberto, setAberto] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!aberto) return
    const clicouFora = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setAberto(false)
    }
    const tecla = (e: KeyboardEvent) => {
      if (e.key === "Escape") setAberto(false)
    }
    document.addEventListener("mousedown", clicouFora)
    document.addEventListener("keydown", tecla)
    return () => {
      document.removeEventListener("mousedown", clicouFora)
      document.removeEventListener("keydown", tecla)
    }
  }, [aberto])

  return (
    <div ref={ref} className={cn("relative inline-flex", className)}>
      <button
        type="button"
        onClick={() => setAberto((v) => !v)}
        aria-expanded={aberto}
        aria-label={`Como este indicador é calculado: ${titulo}`}
        className={cn(
          "inline-flex h-7 w-7 items-center justify-center rounded-full border border-teal/25 bg-teal-tint text-teal transition-colors hover:bg-teal hover:text-white",
          aberto && "bg-teal text-white",
        )}
      >
        <Info className="h-4 w-4" />
      </button>

      {aberto && (
        <div
          role="dialog"
          aria-label={`Regras de cálculo: ${titulo}`}
          className="absolute left-0 top-9 z-40 w-[min(92vw,26rem)] rounded-2xl border border-navy/10 bg-white p-5 text-left shadow-soft"
        >
          <div className="mb-3 flex items-start justify-between gap-3">
            <p className="flex items-center gap-2 text-sm font-semibold text-navy">
              <Info className="h-4 w-4 text-teal" />
              Como este número é calculado
            </p>
            <button
              type="button"
              onClick={() => setAberto(false)}
              aria-label="Fechar"
              className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-navy"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="space-y-3 text-sm leading-relaxed text-muted-foreground [&_b]:font-semibold [&_b]:text-navy">
            {children}
          </div>
        </div>
      )}
    </div>
  )
}
