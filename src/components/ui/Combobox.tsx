"use client"

import * as React from "react"
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

/**
 * Dropdown de seleção única pesquisável, com design premium coerente com o hub.
 * Substitui os <select> nativos dos filtros.
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

  const containerRef = React.useRef<HTMLDivElement>(null)
  const gatilhoRef = React.useRef<HTMLButtonElement>(null)
  const buscaRef = React.useRef<HTMLInputElement>(null)
  const listaRef = React.useRef<HTMLUListElement>(null)

  const opcoesFiltradas = React.useMemo(() => {
    const termo = normalizar(busca.trim())
    const base = termo
      ? options.filter((opcao) => normalizar(opcao.label).includes(termo))
      : options

    if (!allowClear) return base

    // A opção de limpar só entra na lista quando não há busca (ou quando o
    // rótulo dela também combina com o termo digitado), sempre em primeiro.
    const clearCombina = !termo || normalizar(clearLabel).includes(termo)
    return clearCombina ? [{ value: "__clear__", label: clearLabel }, ...base] : base
  }, [options, busca, allowClear, clearLabel])

  const opcaoSelecionada = options.find((opcao) => opcao.value === value) ?? null

  // Zera busca e destaque toda vez que o painel abre.
  React.useEffect(() => {
    if (aberto) {
      setBusca("")
      setIndiceAtivo(0)
      // Foco vai para o campo de busca ao abrir.
      const id = window.setTimeout(() => buscaRef.current?.focus(), 0)
      return () => window.clearTimeout(id)
    }
  }, [aberto])

  // Fecha ao clicar fora.
  React.useEffect(() => {
    if (!aberto) return
    function aoClicarFora(evento: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(evento.target as Node)) {
        setAberto(false)
      }
    }
    document.addEventListener("mousedown", aoClicarFora)
    return () => document.removeEventListener("mousedown", aoClicarFora)
  }, [aberto])

  // Mantém o índice ativo dentro dos limites quando a lista filtrada muda.
  React.useEffect(() => {
    setIndiceAtivo((atual) => {
      if (opcoesFiltradas.length === 0) return 0
      return Math.min(atual, opcoesFiltradas.length - 1)
    })
  }, [opcoesFiltradas.length])

  // Rola o item destacado para dentro da área visível.
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

  // Navegação por teclado funciona tanto no gatilho quanto no campo de busca,
  // já que ao abrir o foco vai para a busca — as setas precisam continuar
  // navegando a lista mesmo com o cursor de texto ativo lá.
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
    <div ref={containerRef} className={cn("relative", className)}>
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

      {aberto && (
        <div className="absolute z-40 mt-2 w-full rounded-2xl border border-navy/10 bg-white p-2 shadow-soft">
          <div className="relative mb-2">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              ref={buscaRef}
              type="text"
              value={busca}
              onChange={(evento) => setBusca(evento.target.value)}
              onKeyDown={aoTeclar}
              autoFocus
              placeholder="Buscar..."
              aria-label="Buscar opção"
              className={cn(
                "h-9 w-full rounded-lg border border-input bg-white/80 pl-8 pr-2 text-sm text-foreground",
                "placeholder:text-muted-foreground/70",
                "focus:outline-none focus:border-teal/50 focus:ring-2 focus:ring-teal/20",
              )}
            />
          </div>

          <ul ref={listaRef} role="listbox" className="max-h-60 overflow-y-auto">
            {opcoesFiltradas.length === 0 && (
              <li className="px-2.5 py-2 text-sm text-muted-foreground">Nenhum resultado</li>
            )}
            {opcoesFiltradas.map((opcao, indice) => {
              const selecionada =
                opcao.value === "__clear__" ? value === null : opcao.value === value
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
        </div>
      )}
    </div>
  )
}
