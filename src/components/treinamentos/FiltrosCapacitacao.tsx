"use client"

import { useEffect, useRef, useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import { ChevronDown, SlidersHorizontal, X } from "lucide-react"

import { cn } from "@/lib/utils"
import { tituloNome } from "@/lib/nomes"
import { MultiCombobox } from "@/components/ui/MultiCombobox"
import { type ComboOption } from "@/components/ui/Combobox"
import type { OpcoesCapacitacao } from "@/lib/capacitacao"

type Atual = {
  meses: string[]
  clientes: string[]
  crs: string[]
  responsaveis: string[]
}

export function FiltrosCapacitacao({ opcoes, atual }: { opcoes: OpcoesCapacitacao; atual: Atual }) {
  const router = useRouter()
  const pathname = usePathname()

  const navegar = (over: Partial<Atual>) => {
    const f = { ...atual, ...over }
    const params = new URLSearchParams()
    // Mês vazio = "todos" EXPLÍCITO (senão a página reaplicaria o mês atual padrão).
    if (f.meses.length === 0) params.append("mes", "todos")
    else for (const m of f.meses) params.append("mes", m)
    for (const c of f.clientes) params.append("cli", c)
    for (const c of f.crs) params.append("cr", c)
    for (const r of f.responsaveis) params.append("resp", r)
    router.push(`${pathname}?${params.toString()}`)
  }

  /** Selecionar TODAS as opções = nenhum filtro (todos). */
  const normalizar = (v: string[], total: number) => (v.length >= total ? [] : v)
  /** Limpar = remove TODOS os filtros, inclusive o mês (mostra todos os meses). */
  const limpar = () => router.push(`${pathname}?mes=todos`)

  const opcoesMes: ComboOption[] = opcoes.meses.map((m) => ({ value: m.valor, label: m.rotulo }))
  const opcoesCliente: ComboOption[] = opcoes.clientes.map((c) => ({ value: c, label: tituloNome(c) }))
  const opcoesCr: ComboOption[] = opcoes.crs.map((c) => ({ value: c.valor, label: c.rotulo.toUpperCase() }))
  const opcoesResp: ComboOption[] = opcoes.responsaveis.map((r) => ({ value: r.valor, label: r.rotulo }))

  const [aberto, setAberto] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const ativos = atual.meses.length + atual.clientes.length + atual.crs.length + atual.responsaveis.length

  useEffect(() => {
    if (!aberto) return
    const fora = (e: MouseEvent) => {
      const alvo = e.target as HTMLElement
      if (alvo.closest("[data-portal-dropdown]")) return
      if (ref.current && !ref.current.contains(alvo)) setAberto(false)
    }
    const esc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setAberto(false)
    }
    document.addEventListener("mousedown", fora)
    document.addEventListener("keydown", esc)
    return () => {
      document.removeEventListener("mousedown", fora)
      document.removeEventListener("keydown", esc)
    }
  }, [aberto])

  return (
    <div ref={ref} className="relative z-30">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setAberto((v) => !v)}
          aria-expanded={aberto}
          aria-haspopup="dialog"
          className="inline-flex h-10 items-center gap-2 rounded-full border border-navy/15 bg-white/80 px-4 text-sm font-medium text-navy shadow-card backdrop-blur transition-colors hover:border-teal/40"
        >
          <SlidersHorizontal className="h-4 w-4 text-teal" />
          Filtros
          {ativos > 0 && (
            <span className="inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-teal px-1.5 text-xs font-semibold text-white">
              {ativos}
            </span>
          )}
          <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", aberto && "rotate-180")} />
        </button>
        {ativos > 0 && (
          <button
            type="button"
            onClick={limpar}
            className="inline-flex h-10 items-center gap-1.5 rounded-full px-3 text-sm font-medium text-muted-foreground transition-colors hover:text-teal"
          >
            <X className="h-4 w-4" />
            Limpar filtros
          </button>
        )}
      </div>

      {aberto && (
        <div className="absolute right-0 top-full z-40 mt-2 w-[min(92vw,60rem)] rounded-3xl border border-navy/10 bg-white p-5 shadow-soft">
          <div className="mb-4 flex items-center justify-between">
            <span className="flex items-center gap-2 text-sm font-medium text-navy">
              <SlidersHorizontal className="h-4 w-4 text-teal" />
              Filtros
            </span>
            <span className="text-xs text-muted-foreground">você pode escolher mais de um em cada</span>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <span className="mb-1.5 block text-xs font-medium text-muted-foreground">Mês</span>
              <MultiCombobox
                ariaLabel="Filtrar por mês"
                values={atual.meses}
                onChange={(v) => navegar({ meses: normalizar(v, opcoes.meses.length) })}
                options={opcoesMes}
                placeholder="Todos os meses"
              />
            </div>
            <div>
              <span className="mb-1.5 block text-xs font-medium text-muted-foreground">Cliente</span>
              <MultiCombobox
                ariaLabel="Filtrar por cliente"
                values={atual.clientes}
                onChange={(v) => navegar({ clientes: normalizar(v, opcoes.clientes.length) })}
                options={opcoesCliente}
                placeholder="Todos os clientes"
              />
            </div>
            <div>
              <span className="mb-1.5 block text-xs font-medium text-muted-foreground">Centro de resultado</span>
              <MultiCombobox
                ariaLabel="Filtrar por centro de resultado"
                values={atual.crs}
                onChange={(v) => navegar({ crs: normalizar(v, opcoes.crs.length) })}
                options={opcoesCr}
                placeholder="Todos os CRs"
              />
            </div>
            <div>
              <span className="mb-1.5 block text-xs font-medium text-muted-foreground">Responsável</span>
              <MultiCombobox
                ariaLabel="Filtrar por responsável"
                values={atual.responsaveis}
                onChange={(v) => navegar({ responsaveis: normalizar(v, opcoes.responsaveis.length) })}
                options={opcoesResp}
                placeholder="Todos os responsáveis"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
