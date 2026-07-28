"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import { ChevronDown, Check, Search, SlidersHorizontal } from "lucide-react"

import { cn } from "@/lib/utils"
import { tituloNome } from "@/lib/nomes"
import type { OpcoesQuadro } from "@/lib/quadro"

type Props = {
  opcoes: OpcoesQuadro
  atual: {
    gerenteRegional: string
    cr: string | null
    mes: string | null
    cargosExcluidos: string[]
  }
}

const CLASSE_SELECT =
  "h-10 w-full rounded-xl border border-input bg-white/80 px-3 pr-9 text-sm text-foreground outline-none transition-colors focus:border-teal/50 focus:ring-2 focus:ring-teal/20"

export function FiltrosQuadro({ opcoes, atual }: Props) {
  const router = useRouter()
  const pathname = usePathname()

  const navegar = (over: Partial<Props["atual"]>) => {
    const f = { ...atual, ...over }
    const params = new URLSearchParams()
    params.set("gr", f.gerenteRegional)
    if (f.cr) params.set("cr", f.cr)
    if (f.mes) params.set("mes", f.mes)
    for (const c of f.cargosExcluidos) params.append("excluir", c)
    router.push(`${pathname}?${params.toString()}`)
  }

  return (
    <div className="glass reveal rounded-3xl p-5">
      <div className="mb-4 flex items-center gap-2 text-sm font-medium text-navy">
        <SlidersHorizontal className="h-4 w-4 text-teal" />
        Filtros
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-muted-foreground">
            Gerente regional
          </span>
          <div className="relative">
            <select
              value={atual.gerenteRegional}
              onChange={(e) => navegar({ gerenteRegional: e.target.value, cr: null, cargosExcluidos: [] })}
              className={CLASSE_SELECT}
            >
              {opcoes.gerentes.map((g) => (
                <option key={g} value={g}>
                  {tituloNome(g)}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          </div>
        </label>

        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-muted-foreground">
            Centro de resultado
          </span>
          <div className="relative">
            <select
              value={atual.cr ?? ""}
              onChange={(e) => navegar({ cr: e.target.value || null })}
              className={CLASSE_SELECT}
            >
              <option value="">Todos os CRs</option>
              {opcoes.crs.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          </div>
        </label>

        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-muted-foreground">Mês</span>
          <div className="relative">
            <select
              value={atual.mes ?? ""}
              onChange={(e) => navegar({ mes: e.target.value || null })}
              className={CLASSE_SELECT}
            >
              <option value="">Mais recente</option>
              {opcoes.meses.map((m) => (
                <option key={m.valor} value={m.valor}>
                  {m.rotulo}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          </div>
        </label>

        <div className="block">
          <span className="mb-1.5 block text-xs font-medium text-muted-foreground">Cargos</span>
          <SeletorCargos
            cargos={opcoes.cargos}
            excluidos={atual.cargosExcluidos}
            onAplicar={(cargosExcluidos) => navegar({ cargosExcluidos })}
          />
        </div>
      </div>
    </div>
  )
}

/** Dropdown de cargos: todos marcados por padrão; desmarcar remove da conta. */
function SeletorCargos({
  cargos,
  excluidos,
  onAplicar,
}: {
  cargos: string[]
  excluidos: string[]
  onAplicar: (excluidos: string[]) => void
}) {
  const [aberto, setAberto] = useState(false)
  const [busca, setBusca] = useState("")
  const [pend, setPend] = useState<Set<string>>(new Set(excluidos))
  const ref = useRef<HTMLDivElement>(null)

  // Sincroniza quando os filtros mudam por fora (navegação).
  useEffect(() => setPend(new Set(excluidos)), [excluidos])

  useEffect(() => {
    if (!aberto) return
    const fora = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setAberto(false)
        setPend(new Set(excluidos))
      }
    }
    document.addEventListener("mousedown", fora)
    return () => document.removeEventListener("mousedown", fora)
  }, [aberto, excluidos])

  const filtrados = useMemo(() => {
    const t = busca.trim().toLowerCase()
    return t ? cargos.filter((c) => c.toLowerCase().includes(t)) : cargos
  }, [cargos, busca])

  const incluidos = cargos.length - pend.size

  const alternar = (c: string) => {
    setPend((s) => {
      const n = new Set(s)
      if (n.has(c)) n.delete(c)
      else n.add(c)
      return n
    })
  }

  const aplicar = () => {
    onAplicar(Array.from(pend))
    setAberto(false)
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setAberto((v) => !v)}
        aria-expanded={aberto}
        className="flex h-10 w-full items-center justify-between rounded-xl border border-input bg-white/80 px-3 text-sm text-foreground outline-none transition-colors hover:border-teal/40 focus:border-teal/50 focus:ring-2 focus:ring-teal/20"
      >
        <span className="truncate">
          {pend.size === 0
            ? "Todos os cargos"
            : `${incluidos} de ${cargos.length} cargos`}
        </span>
        <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
      </button>

      {aberto && (
        <div className="absolute left-0 top-11 z-40 w-[min(92vw,22rem)] rounded-2xl border border-navy/10 bg-white p-3 shadow-soft">
          <div className="relative mb-2">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              autoFocus
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar cargo…"
              className="h-9 w-full rounded-lg border border-input bg-white pl-8 pr-3 text-sm outline-none focus:border-teal/50 focus:ring-2 focus:ring-teal/20"
            />
          </div>

          <div className="mb-2 flex items-center justify-between text-xs">
            <button
              type="button"
              onClick={() => setPend(new Set())}
              className="font-medium text-teal hover:underline"
            >
              Marcar todos
            </button>
            <button
              type="button"
              onClick={() => setPend(new Set(cargos))}
              className="font-medium text-muted-foreground hover:underline"
            >
              Limpar
            </button>
          </div>

          <ul className="max-h-56 space-y-0.5 overflow-y-auto pr-1">
            {filtrados.map((c) => {
              const marcado = !pend.has(c)
              return (
                <li key={c}>
                  <button
                    type="button"
                    onClick={() => alternar(c)}
                    className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm hover:bg-teal-tint"
                  >
                    <span
                      className={cn(
                        "flex h-4 w-4 shrink-0 items-center justify-center rounded border",
                        marcado ? "border-teal bg-teal text-white" : "border-input bg-white",
                      )}
                    >
                      {marcado && <Check className="h-3 w-3" />}
                    </span>
                    <span className="truncate text-foreground">{c}</span>
                  </button>
                </li>
              )
            })}
            {filtrados.length === 0 && (
              <li className="px-2 py-2 text-sm text-muted-foreground">Nenhum cargo encontrado.</li>
            )}
          </ul>

          <div className="mt-3 flex justify-end">
            <button
              type="button"
              onClick={aplicar}
              className="inline-flex h-9 items-center rounded-full bg-inhaus-grad px-5 text-sm font-medium text-white shadow-glow hover:brightness-110"
            >
              Aplicar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
