"use client"

import * as React from "react"
import { createPortal } from "react-dom"
import { useRouter } from "next/navigation"
import { Calendar, Check, ChevronDown } from "lucide-react"

import { cn } from "@/lib/utils"

const MESES_PT = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
]

function rotulo(mes: string) {
  const [ano, m] = mes.split("-")
  const nome = MESES_PT[Number(m) - 1] ?? m
  return `${nome} / ${ano}`
}

const PANEL_W = 224 // w-56

/** Seletor de mês (baseado na coluna `data`); troca o parâmetro `?mes=` na URL.
 *  Dropdown customizado renderizado em portal (posição fixa) para ficar SEMPRE
 *  acima dos cards com backdrop-blur (que criam contexto de empilhamento). */
export function MonthFilter({
  meses,
  atual,
  basePath = "/dashboards/absenteismo",
}: {
  meses: string[]
  atual: string
  /** Rota para onde o filtro navega ao trocar o mês (?mes=). */
  basePath?: string
}) {
  const router = useRouter()
  const [aberto, setAberto] = React.useState(false)
  const [rect, setRect] = React.useState<DOMRect | null>(null)
  const triggerRef = React.useRef<HTMLButtonElement>(null)
  const panelRef = React.useRef<HTMLDivElement>(null)

  const atualizarRect = React.useCallback(() => {
    if (triggerRef.current) setRect(triggerRef.current.getBoundingClientRect())
  }, [])

  React.useEffect(() => {
    if (!aberto) return
    atualizarRect()
    const onScroll = () => atualizarRect()
    const onResize = () => atualizarRect()
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node
      if (panelRef.current?.contains(t) || triggerRef.current?.contains(t)) return
      setAberto(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setAberto(false)
    }
    window.addEventListener("scroll", onScroll, true)
    window.addEventListener("resize", onResize)
    document.addEventListener("mousedown", onDown)
    document.addEventListener("keydown", onKey)
    return () => {
      window.removeEventListener("scroll", onScroll, true)
      window.removeEventListener("resize", onResize)
      document.removeEventListener("mousedown", onDown)
      document.removeEventListener("keydown", onKey)
    }
  }, [aberto, atualizarRect])

  function selecionar(m: string) {
    setAberto(false)
    if (m !== atual) router.push(`${basePath}?mes=${m}`)
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setAberto((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={aberto}
        className={cn(
          "inline-flex h-10 items-center gap-2 rounded-xl border bg-white/80 pl-3 pr-2.5 text-sm font-medium text-foreground shadow-sm outline-none transition-colors",
          aberto ? "border-enjoei/40 ring-2 ring-enjoei/20" : "border-enjoei/15 hover:border-enjoei/30",
        )}
      >
        <Calendar className="h-4 w-4 text-enjoei" />
        <span className="min-w-[7.5rem] text-left">{rotulo(atual)}</span>
        <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", aberto && "rotate-180")} />
      </button>

      {aberto &&
        rect &&
        createPortal(
          <div
            ref={panelRef}
            role="listbox"
            className="animate-fade-up fixed z-[60] max-h-72 overflow-auto rounded-2xl border border-enjoei/10 bg-white/95 p-1.5 shadow-soft backdrop-blur-xl"
            style={{
              top: rect.bottom + 8,
              left: Math.max(8, rect.right - PANEL_W),
              width: PANEL_W,
            }}
          >
            {meses.map((m) => {
              const ativo = m === atual
              return (
                <button
                  key={m}
                  type="button"
                  role="option"
                  aria-selected={ativo}
                  onClick={() => selecionar(m)}
                  className={cn(
                    "flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2 text-sm transition-colors",
                    ativo
                      ? "bg-enjoei-mist font-semibold text-enjoei"
                      : "text-foreground/80 hover:bg-enjoei-mist/60 hover:text-enjoei",
                  )}
                >
                  {rotulo(m)}
                  {ativo && <Check className="h-4 w-4 shrink-0" />}
                </button>
              )
            })}
          </div>,
          document.body,
        )}
    </>
  )
}
