"use client"

import * as React from "react"
import { createPortal } from "react-dom"
import { Check, ChevronDown, Search } from "lucide-react"

import { cn } from "@/lib/utils"

export type ComboOption = { value: string; label: string }

type ComboboxProps = {
  /** Valor selecionado (null = nenhum) */
  value: string | null
  /** Chamado ao selecionar; null quando escolhe a opção "limpar/todos" */
  onChange: (value: string | null) => void
  options: ComboOption[]
  /** Texto exibido quando nada está selecionado */
  placeholder?: string
  /** Se true, mostra uma opção no topo que emite null */
  allowClear?: boolean
  /** Rótulo da opção de limpar (default "Todos") */
  clearLabel?: string
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
 * Dropdown de seleção única pesquisável. O painel é renderizado num PORTAL com
 * posição fixa (calculada a partir do gatilho), para NUNCA ficar cortado por
 * `overflow` nem atrás de cards `.glass` (que criam stacking context via blur).
 */
export function Combobox({
  value,
  onChange,
  options,
  placeholder = "Selecionar",
  allowClear = false,
  clearLabel = "Todos",
  ariaLabel,
  className,
}: ComboboxProps): JSX.Element {
  const [aberto, setAberto] = React.useState(false)
  const [busca, setBusca] = React.useState("")
  const [indiceAtivo, setIndiceAtivo] = React.useState(0)
  const [pos, setPos] = React.useState<Posicao | null>(null)

  const gatilhoRef = React.useRef<HTMLButtonElement>(null)
  const buscaRef = React.useRef<HTMLInputElement>(null)
  const listaRef = React.useRef<HTMLUListElement>(null)
  const painelRef = React.useRef<HTMLDivElement>(null)

  const opcoesFiltradas = React.useMemo(() => {
    const termo = normalizar(busca.trim())
    const base = termo
      ? options.filter((opcao) => normalizar(opcao.label).includes(termo))
      : options
    if (!allowClear) return base
    const clearCombina = !termo || normalizar(clearLabel).includes(termo)
    return clearCombina ? [{ value: "__clear__", label: clearLabel }, ...base] : base
  }, [options, busca, allowClear, clearLabel])

  const opcaoSelecionada = options.find((opcao) => opcao.value === value) ?? null

  // Calcula a posição do painel a partir do gatilho (viewport / position: fixed).
  const recomputar = React.useCallback(() => {
    const el = gatilhoRef.current
    if (!el) return
    const r = el.getBoundingClientRect()
    const espacoAbaixo = window.innerHeight - r.bottom
    const espacoAcima = r.top
    const alturaDesejada = 320
    const acima = espacoAbaixo < alturaDesejada && espacoAcima > espacoAbaixo
    const maxAltura = Math.max(180, (acima ? espacoAcima : espacoAbaixo) - 16)
    setPos({ left: r.left, top: acima ? r.top : r.bottom, width: r.width, acima, maxAltura })
  }, [])

  // Ao abrir: mede, zera busca/destaque e foca a busca.
  React.useLayoutEffect(() => {
    if (!aberto) return
    recomputar()
    setBusca("")
    setIndiceAtivo(0)
    const id = window.setTimeout(() => buscaRef.current?.focus(), 0)
    return () => window.clearTimeout(id)
  }, [aberto, recomputar])

  // Reposiciona/fecha ao rolar (qualquer container) ou redimensionar.
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

  // Fecha ao clicar fora (considera o gatilho E o painel no portal).
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

  React.useEffect(() => {
    setIndiceAtivo((atual) => (opcoesFiltradas.length === 0 ? 0 : Math.min(atual, opcoesFiltradas.length - 1)))
  }, [opcoesFiltradas.length])

  React.useEffect(() => {
    if (!aberto || !listaRef.current) return
    const item = listaRef.current.querySelector<HTMLElement>(`[data-index="${indiceAtivo}"]`)
    item?.scrollIntoView({ block: "nearest" })
  }, [indiceAtivo, aberto])

  function fecharEDevolverFoco() {
    setAberto(false)
    gatilhoRef.current?.focus()
  }

  function selecionar(opcao: ComboOption) {
    onChange(opcao.value === "__clear__" ? null : opcao.value)
    fecharEDevolverFoco()
  }

  function aoTeclar(evento: React.KeyboardEvent) {
    if (!aberto) {
      if (evento.key === "ArrowDown" || evento.key === "Enter" || evento.key === " ") {
        evento.preventDefault()
        setAberto(true)
      }
      return
    }
    switch (evento.key) {
      case "ArrowDown":
        evento.preventDefault()
        setIndiceAtivo((atual) => Math.min(atual + 1, opcoesFiltradas.length - 1))
        break
      case "ArrowUp":
        evento.preventDefault()
        setIndiceAtivo((atual) => Math.max(atual - 1, 0))
        break
      case "Home":
        evento.preventDefault()
        setIndiceAtivo(0)
        break
      case "End":
        evento.preventDefault()
        setIndiceAtivo(opcoesFiltradas.length - 1)
        break
      case "Enter": {
        evento.preventDefault()
        const opcao = opcoesFiltradas[indiceAtivo]
        if (opcao) selecionar(opcao)
        break
      }
      case "Escape":
        evento.preventDefault()
        fecharEDevolverFoco()
        break
      default:
        break
    }
  }

  return (
    <div className={cn("relative", className)}>
      <button
        ref={gatilhoRef}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={aberto}
        aria-label={ariaLabel}
        onClick={() => setAberto((atual) => !atual)}
        onKeyDown={aoTeclar}
        className={cn(
          "flex h-10 w-full items-center justify-between gap-2 rounded-xl border border-input bg-white/80 px-3 text-sm text-foreground transition-colors",
          "hover:border-teal/40",
          "focus:outline-none focus:border-teal/50 focus:ring-2 focus:ring-teal/20",
        )}
      >
        <span className={cn("truncate", !opcaoSelecionada && "text-muted-foreground")}>
          {opcaoSelecionada ? opcaoSelecionada.label : placeholder}
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
                onKeyDown={aoTeclar}
                placeholder="Buscar..."
                aria-label="Buscar opção"
                className={cn(
                  "h-9 w-full rounded-lg border border-input bg-white/80 pl-8 pr-2 text-sm text-foreground",
                  "placeholder:text-muted-foreground/70",
                  "focus:outline-none focus:border-teal/50 focus:ring-2 focus:ring-teal/20",
                )}
              />
            </div>

            <ul
              ref={listaRef}
              role="listbox"
              className="overflow-y-auto"
              style={{ maxHeight: pos.maxAltura }}
            >
              {opcoesFiltradas.length === 0 && (
                <li className="px-2.5 py-2 text-sm text-muted-foreground">Nenhum resultado</li>
              )}
              {opcoesFiltradas.map((opcao, indice) => {
                const selecionada = opcao.value === "__clear__" ? value === null : opcao.value === value
                const destacada = indice === indiceAtivo
                return (
                  <li key={opcao.value} data-index={indice} role="presentation">
                    <button
                      type="button"
                      role="option"
                      aria-selected={selecionada}
                      onMouseEnter={() => setIndiceAtivo(indice)}
                      onClick={() => selecionar(opcao)}
                      className={cn(
                        "flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-left text-sm text-foreground hover:bg-teal-tint",
                        (selecionada || destacada) && "bg-teal-tint",
                      )}
                    >
                      <span className="truncate">{opcao.label}</span>
                      {selecionada && <Check className="h-4 w-4 shrink-0 text-teal" />}
                    </button>
                  </li>
                )
              })}
            </ul>
          </div>,
          document.body,
        )}
    </div>
  )
}
