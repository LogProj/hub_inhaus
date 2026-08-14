"use client"

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { Info, X } from "lucide-react"
import { cn } from "@/lib/utils"

/**
 * Botão "i" ao lado do título de um dashboard/indicador. Abre um popover que
 * explica, em linguagem de negócio (nunca técnica), o que o indicador mostra e
 * como os números são calculados. É OBRIGATÓRIO em todo dashboard — ver CLAUDE.md.
 *
 * REGRA DE EMPILHAMENTO (não negociável): o painel é renderizado num PORTAL com
 * `position: fixed` e z-index alto, posicionado a partir do gatilho. Assim ele
 * fica SEMPRE ACIMA de qualquer card, gráfico ou `.glass` (que criam stacking
 * context via blur e cortariam um popover `absolute`). Todo campo de info/dica do
 * sistema deve seguir este padrão — nunca `absolute` dentro de um card.
 *
 * O conteúdo (`children`) deve ser visual e escaneável: frases curtas, bullets,
 * um exemplo numérico. Sem termos de banco/sistema.
 */
type Pos = { left: number; top: number; acima: boolean; maxAltura: number }

const LARGURA = 384 // 24rem — casa com w-[min(92vw,24rem)] do painel

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
  const [pos, setPos] = useState<Pos | null>(null)
  const gatilhoRef = useRef<HTMLButtonElement>(null)
  const painelRef = useRef<HTMLDivElement>(null)

  // Calcula a posição do painel a partir do gatilho (viewport / position: fixed).
  const recomputar = useCallback(() => {
    const el = gatilhoRef.current
    if (!el) return
    const r = el.getBoundingClientRect()
    const espacoAbaixo = window.innerHeight - r.bottom
    const espacoAcima = r.top
    const alturaDesejada = 380
    const acima = espacoAbaixo < alturaDesejada && espacoAcima > espacoAbaixo
    const maxAltura = Math.max(200, (acima ? espacoAcima : espacoAbaixo) - 16)
    // alinha à esquerda do gatilho, mas sem estourar a viewport
    const left = Math.min(r.left, window.innerWidth - Math.min(LARGURA, window.innerWidth * 0.92) - 8)
    setPos({ left: Math.max(8, left), top: acima ? r.top : r.bottom, acima, maxAltura })
  }, [])

  useLayoutEffect(() => {
    if (!aberto) return
    recomputar()
  }, [aberto, recomputar])

  // Reposiciona ao rolar (qualquer container) ou redimensionar.
  useEffect(() => {
    if (!aberto) return
    const aoMexer = () => recomputar()
    window.addEventListener("scroll", aoMexer, true)
    window.addEventListener("resize", aoMexer)
    return () => {
      window.removeEventListener("scroll", aoMexer, true)
      window.removeEventListener("resize", aoMexer)
    }
  }, [aberto, recomputar])

  // Fecha ao clicar fora (considera o gatilho E o painel no portal) e no Esc.
  useEffect(() => {
    if (!aberto) return
    const clicouFora = (e: MouseEvent) => {
      const alvo = e.target as Node
      if (gatilhoRef.current?.contains(alvo)) return
      if (painelRef.current?.contains(alvo)) return
      setAberto(false)
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
    <span className={cn("relative inline-flex", className)}>
      <button
        ref={gatilhoRef}
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

      {aberto &&
        pos &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            ref={painelRef}
            role="dialog"
            aria-label={`Regras de cálculo: ${titulo}`}
            style={{
              position: "fixed",
              left: pos.left,
              top: pos.acima ? undefined : pos.top + 8,
              bottom: pos.acima ? window.innerHeight - pos.top + 8 : undefined,
              width: `min(92vw, ${LARGURA}px)`,
              maxHeight: pos.maxAltura,
              zIndex: 100,
            }}
            className="overflow-y-auto rounded-2xl border border-navy/10 bg-white p-5 text-left shadow-soft"
          >
            <div className="mb-3 flex items-start justify-between gap-3">
              <p className="flex items-center gap-2 text-sm font-semibold text-navy">
                <Info className="h-4 w-4 text-teal" />
                {titulo}
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
            <div className="space-y-3 text-sm leading-relaxed text-muted-foreground [&_b]:font-semibold [&_b]:text-navy [&_strong]:font-semibold [&_strong]:text-navy">
              {children}
            </div>
          </div>,
          document.body,
        )}
    </span>
  )
}
