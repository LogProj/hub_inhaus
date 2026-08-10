"use client"

import * as React from "react"
import { createPortal } from "react-dom"
import { Check, ChevronDown, Search } from "lucide-react"

import { cn } from "@/lib/utils"
import { type ComboOption } from "@/components/ui/Combobox"

type MultiComboboxProps = {
  /** Valores selecionados atuais (confirmados). */
  values: string[]
  /** Chamado ao clicar em "Aplicar", com a seleção pendente. */
  onChange: (values: string[]) => void
  options: ComboOption[]
  /** Texto exibido quando nada está selecionado */
  placeholder?: string
  ariaLabel?: string
  className?: string
}

/** Remove acentos e normaliza caixa para comparação de busca. */
const DIACRITICOS = new RegExp("[\\u0300-\\u036f]", "g")

function normalizar(texto: string): string {
  return texto.normalize("NFD").replace(DIACRITICOS, "").toLowerCase()
}

type Posicao = { left: number; top: number; width: number; acima: boolean; maxAltura: number }

/**
 * Dropdown de seleção múltipla pesquisável. O painel vai num PORTAL com posição
 * fixa (não é cortado por overflow nem fica atrás de cards `.glass`). A seleção
 * fica pendente até "Aplicar"; fechar (clique fora / Esc) descarta.
 */
export function MultiCombobox({
  values,
  onChange,
  options,
  placeholder = "Selecionar",
  ariaLabel,
  className,
}: MultiComboboxProps): JSX.Element {
  const [aberto, setAberto] = React.useState(false)
  const [busca, setBusca] = React.useState("")
  const [pendente, setPendente] = React.useState<Set<string>>(() => new Set(values))
  const [pos, setPos] = React.useState<Posicao | null>(null)

  const gatilhoRef = React.useRef<HTMLButtonElement>(null)
  const buscaRef = React.useRef<HTMLInputElement>(null)
  const painelRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    setPendente(new Set(values))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [values.join("")])

  const opcoesFiltradas = React.useMemo(() => {
    const termo = normalizar(busca.trim())
    return termo ? options.filter((opcao) => normalizar(opcao.label).includes(termo)) : options
  }, [options, busca])

  const recomputar = React.useCallback(() => {
    const el = gatilhoRef.current
    if (!el) return
    const r = el.getBoundingClientRect()
    const espacoAbaixo = window.innerHeight - r.bottom
    const espacoAcima = r.top
    const alturaDesejada = 340
    const acima = espacoAbaixo < alturaDesejada && espacoAcima > espacoAbaixo
    const maxAltura = Math.max(180, (acima ? espacoAcima : espacoAbaixo) - 16)
    setPos({ left: r.left, top: acima ? r.top : r.bottom, width: r.width, acima, maxAltura })
  }, [])

  React.useLayoutEffect(() => {
    if (!aberto) return
    recomputar()
    setBusca("")
    setPendente(new Set(values))
    const id = window.setTimeout(() => buscaRef.current?.focus(), 0)
    return () => window.clearTimeout(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aberto, recomputar])

  React.useEffect(() => {
    if (!aberto) return
    const aoMexer = () => recomputar()
    window.addEventListener("scroll", aoMexer, true)
    window.addEventListener("resize", aoMexer)
    return () => {
      window.removeEventListener("scroll", aoMexer, true)
      window.removeEventListener("resize", aoMexer)
    }
  }, [aberto, recomputar])

  React.useEffect(() => {
    if (!aberto) return
    function aoClicarFora(evento: MouseEvent) {
      const alvo = evento.target as Node
      if (gatilhoRef.current?.contains(alvo)) return
      if (painelRef.current?.contains(alvo)) return
      setAberto(false)
    }
    document.addEventListener("mousedown", aoClicarFora)
    return () => document.removeEventListener("mousedown", aoClicarFora)
  }, [aberto])

  function fecharSemAplicar() {
    setAberto(false)
    gatilhoRef.current?.focus()
  }

  function aplicar() {
    onChange(Array.from(pendente))
    setAberto(false)
    gatilhoRef.current?.focus()
  }

  function alternar(opcao: ComboOption) {
    setPendente((atual) => {
      const proximo = new Set(atual)
      if (proximo.has(opcao.value)) proximo.delete(opcao.value)
      else proximo.add(opcao.value)
      return proximo
    })
  }

  const quantidadeSelecionada = values.length

  return (
    <div className={cn("relative", className)} onKeyDown={(e) => e.key === "Escape" && fecharSemAplicar()}>
      <button
        ref={gatilhoRef}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={aberto}
        aria-label={ariaLabel}
        onClick={() => setAberto((atual) => !atual)}
        className={cn(
          "flex h-10 w-full items-center justify-between gap-2 rounded-xl border border-input bg-white/80 px-3 text-sm text-foreground transition-colors",
          "hover:border-teal/40",
          "focus:outline-none focus:border-teal/50 focus:ring-2 focus:ring-teal/20",
        )}
      >
        <span className={cn("truncate", quantidadeSelecionada === 0 && "text-muted-foreground")}>
          {quantidadeSelecionada === 0
            ? placeholder
            : `${quantidadeSelecionada} selecionado${quantidadeSelecionada > 1 ? "s" : ""}`}
        </span>
        <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
      </button>

      {aberto &&
        pos &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            ref={painelRef}
            style={{
              position: "fixed",
              left: pos.left,
              top: pos.acima ? undefined : pos.top + 8,
              bottom: pos.acima ? window.innerHeight - pos.top + 8 : undefined,
              width: pos.width,
              zIndex: 70,
            }}
            className="rounded-2xl border border-navy/10 bg-white p-2 shadow-soft"
          >
            <div className="relative mb-2">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                ref={buscaRef}
                type="text"
                value={busca}
                onChange={(evento) => setBusca(evento.target.value)}
                placeholder="Buscar..."
                aria-label="Buscar opção"
                className={cn(
                  "h-9 w-full rounded-lg border border-input bg-white/80 pl-8 pr-2 text-sm text-foreground",
                  "placeholder:text-muted-foreground/70",
                  "focus:outline-none focus:border-teal/50 focus:ring-2 focus:ring-teal/20",
                )}
              />
            </div>

            <div className="mb-1 flex items-center justify-between px-1 text-xs">
              <button
                type="button"
                onClick={() => setPendente(new Set(options.map((o) => o.value)))}
                className="font-medium text-teal hover:underline"
              >
                Marcar todos
              </button>
              <button
                type="button"
                onClick={() => setPendente(new Set())}
                className="text-muted-foreground hover:underline"
              >
                Limpar
              </button>
            </div>

            <ul
              role="listbox"
              aria-multiselectable="true"
              className="overflow-y-auto"
              style={{ maxHeight: pos.maxAltura - 90 }}
            >
              {opcoesFiltradas.length === 0 && (
                <li className="px-2.5 py-2 text-sm text-muted-foreground">Nenhum resultado</li>
              )}
              {opcoesFiltradas.map((opcao) => {
                const selecionada = pendente.has(opcao.value)
                return (
                  <li key={opcao.value}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={selecionada}
                      onClick={() => alternar(opcao)}
                      className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm hover:bg-teal-tint"
                    >
                      <span
                        className={cn(
                          "flex h-4 w-4 shrink-0 items-center justify-center rounded border border-input",
                          selecionada && "border-teal bg-teal text-white",
                        )}
                      >
                        {selecionada && <Check className="h-3 w-3" />}
                      </span>
                      <span className="truncate text-foreground">{opcao.label}</span>
                    </button>
                  </li>
                )
              })}
            </ul>

            <div className="mt-2 border-t border-navy/10 pt-2">
              <button
                type="button"
                onClick={aplicar}
                className="w-full rounded-lg bg-inhaus-grad px-3 py-1.5 text-sm font-medium text-white shadow-soft transition-opacity hover:opacity-90"
              >
                Aplicar
              </button>
            </div>
          </div>,
          document.body,
        )}
    </div>
  )
}
