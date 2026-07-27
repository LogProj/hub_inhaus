"use client"

import { usePathname } from "next/navigation"
import { Bell, Search } from "lucide-react"
import { TODAS_AS_TELAS } from "@/lib/domains"
import { EVENTO_ABRIR_COMMAND_PALETTE } from "@/components/shell/CommandPalette"

// Placeholder visual até a Task 14 conectar o shell à lista real de alertas
// da Home (`ListaAlertas`/`home-mock.ts`). Não é dado de negócio.
const CONTAGEM_ALERTAS_PLACEHOLDER = 3

function breadcrumbDaRota(pathname: string | null) {
  if (!pathname) return "Hub In-Haus"
  const tela = TODAS_AS_TELAS.find((t) => t.href === pathname)
  return tela ? `${tela.dominioLabel} / ${tela.label}` : "Hub In-Haus"
}

export function AppTopbar() {
  const pathname = usePathname()
  const breadcrumb = breadcrumbDaRota(pathname)

  function abrirBusca() {
    window.dispatchEvent(new Event(EVENTO_ABRIR_COMMAND_PALETTE))
  }

  return (
    <header className="relative flex h-16 shrink-0 items-center gap-6 bg-shell px-8">
      <nav aria-label="Trilha de navegação" className="min-w-0 flex-1">
        <p className="truncate text-sm text-white/55">{breadcrumb}</p>
      </nav>

      <button
        type="button"
        onClick={abrirBusca}
        className="flex items-center gap-2 rounded-md border border-white/10 bg-white/[0.03] px-3 py-1.5 text-[13px] text-white/45 transition-colors duration-[160ms] ease-calm hover:border-white/20 hover:text-white/70"
      >
        <Search className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
        <span>Buscar...</span>
        <kbd className="ml-2 rounded border border-white/15 px-1.5 text-label text-white/40">⌘K</kbd>
      </button>

      <div>
        <label htmlFor="seletor-periodo" className="sr-only">
          Selecionar período
        </label>
        <select
          id="seletor-periodo"
          defaultValue="30d"
          className="rounded-md border border-white/10 bg-white/[0.03] px-3 py-1.5 text-[13px] text-white/70 transition-colors duration-[160ms] ease-calm hover:border-white/20"
        >
          <option value="7d">Últimos 7 dias</option>
          <option value="30d">Últimos 30 dias</option>
          <option value="90d">Últimos 90 dias</option>
          <option value="ano">Este ano</option>
        </select>
      </div>

      <button
        type="button"
        aria-label={`Alertas: ${CONTAGEM_ALERTAS_PLACEHOLDER} pendentes`}
        className="relative grid h-9 w-9 shrink-0 place-items-center rounded-md text-white/55 transition-colors duration-[160ms] ease-calm hover:bg-white/5 hover:text-white"
      >
        <Bell className="h-[18px] w-[18px]" strokeWidth={1.5} aria-hidden="true" />
        {CONTAGEM_ALERTAS_PLACEHOLDER > 0 && (
          <span
            aria-hidden="true"
            className="absolute right-1 top-1 grid h-4 min-w-[16px] place-items-center rounded-full bg-danger px-1 text-[10px] font-medium leading-none text-white"
          >
            {CONTAGEM_ALERTAS_PLACEHOLDER}
          </span>
        )}
      </button>
    </header>
  )
}
