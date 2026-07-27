"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { ChevronsLeft, ChevronsRight } from "lucide-react"
import { DOMINIOS, type Tela } from "@/lib/domains"
import { InhausLogo } from "@/components/brand/InhausLogo"
import { Atmosphere } from "@/components/atmosphere/Atmosphere"
import { ThemeToggle } from "@/components/shell/ThemeToggle"
import { cn } from "@/lib/utils"

const CHAVE_COLAPSO = "inhaus-sidebar"

export type AppSidebarProps = {
  /** Nome de exibição já resolvido no layout — o client não chama o banco. */
  nome: string
  isAdmin: boolean
  visibleScreens: string[]
}

/**
 * "Em breve" é o mapa do produto: aparece para todo mundo, sempre desabilitado.
 * As demais telas só aparecem para quem tem a permissão concedida (ou é admin).
 */
function telaVisivelParaUsuario(tela: Tela, isAdmin: boolean, visibleScreens: string[]) {
  if (tela.emBreve) return true
  return isAdmin || visibleScreens.includes(tela.key)
}

function iniciaisDoNome(nome: string) {
  const partes = nome.trim().split(/\s+/).filter(Boolean)
  if (partes.length === 0) return "?"
  if (partes.length === 1) return partes[0]!.slice(0, 2).toUpperCase()
  return `${partes[0]![0]}${partes[partes.length - 1]![0]}`.toUpperCase()
}

export function AppSidebar({ nome, isAdmin, visibleScreens }: AppSidebarProps) {
  const [colapsada, setColapsada] = useState(false)
  const pathname = usePathname()

  // Lê o estado salvo só depois de montar — evita descasar do HTML do servidor.
  useEffect(() => {
    const salvo = window.localStorage.getItem(CHAVE_COLAPSO)
    if (salvo === "1") setColapsada(true)
  }, [])

  function alternarColapso() {
    setColapsada((atual) => {
      const proximo = !atual
      window.localStorage.setItem(CHAVE_COLAPSO, proximo ? "1" : "0")
      return proximo
    })
  }

  function ehAtiva(href: string) {
    return pathname === href || (pathname?.startsWith(`${href}/`) ?? false)
  }

  return (
    <aside
      className={cn(
        "relative flex shrink-0 flex-col overflow-hidden bg-shell transition-[width] duration-[280ms] ease-calm",
        colapsada ? "w-[72px]" : "w-[264px]",
      )}
    >
      <Atmosphere intensidade="sutil" />

      <div
        className={cn(
          "relative flex items-center gap-2 p-5",
          colapsada ? "flex-col" : "justify-between",
        )}
      >
        <Link href="/home" aria-label="Ir para a Home" className="inline-flex shrink-0">
          <InhausLogo variante="branca" altura={colapsada ? 18 : 26} />
        </Link>
        <button
          type="button"
          onClick={alternarColapso}
          aria-label={colapsada ? "Expandir menu" : "Recolher menu"}
          className="grid h-7 w-7 shrink-0 place-items-center rounded-md text-white/45 transition-colors duration-[160ms] ease-calm hover:bg-white/5 hover:text-white"
        >
          {colapsada ? (
            <ChevronsRight className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
          ) : (
            <ChevronsLeft className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
          )}
        </button>
      </div>

      <nav aria-label="Domínios" className="relative flex-1 overflow-y-auto px-3 py-2">
        <ul className="space-y-5">
          {DOMINIOS.map((dominio) => {
            const telas = dominio.telas.filter((tela) =>
              telaVisivelParaUsuario(tela, isAdmin, visibleScreens),
            )
            if (telas.length === 0) return null
            const Icone = dominio.icone

            return (
              <li key={dominio.key}>
                <div className="flex items-center gap-2 px-2.5 pb-1.5 text-white/45">
                  <Icone className="h-[18px] w-[18px] shrink-0" strokeWidth={1.5} aria-hidden="true" />
                  <span className={cn("text-sm font-sans", colapsada && "sr-only")}>
                    {dominio.label}
                  </span>
                </div>
                <ul className="space-y-0.5">
                  {telas.map((tela) => (
                    <li key={tela.key}>
                      {tela.emBreve ? (
                        <div
                          aria-disabled="true"
                          className="flex items-center justify-between gap-2 rounded-md px-2.5 py-1.5 text-[13px] text-white/30"
                        >
                          <span className={cn(colapsada && "sr-only")}>{tela.label}</span>
                          {!colapsada && (
                            <span className="text-label shrink-0 rounded-sm border border-white/15 px-1.5 py-0.5">
                              em breve
                            </span>
                          )}
                        </div>
                      ) : (
                        <Link
                          href={tela.href}
                          aria-current={ehAtiva(tela.href) ? "page" : undefined}
                          className={cn(
                            "relative flex items-center gap-2 rounded-md px-2.5 py-1.5 text-[13px] transition-colors duration-[160ms] ease-calm",
                            ehAtiva(tela.href)
                              ? "bg-white/[0.04] text-white before:absolute before:left-0 before:top-1/2 before:h-5 before:w-[2px] before:-translate-y-1/2 before:bg-teal"
                              : "text-white/55 hover:bg-white/[0.03] hover:text-white",
                          )}
                        >
                          <span className={cn(colapsada && "sr-only")}>{tela.label}</span>
                        </Link>
                      )}
                    </li>
                  ))}
                </ul>
              </li>
            )
          })}
        </ul>
      </nav>

      <div
        className={cn(
          "relative mt-auto flex items-center gap-3 border-t border-white/10 p-4",
          colapsada && "flex-col",
        )}
      >
        <div
          aria-hidden="true"
          className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white/10 text-[13px] font-medium text-white"
        >
          {iniciaisDoNome(nome)}
        </div>
        <div className={cn("min-w-0 flex-1", colapsada && "sr-only")}>
          <p className="truncate text-sm text-white">{nome}</p>
        </div>
        <div className={cn("flex items-center gap-1.5", colapsada && "flex-col")}>
          <ThemeToggle />
          {!colapsada && (
            <kbd className="rounded border border-white/15 px-1.5 text-label text-white/45">⌘K</kbd>
          )}
        </div>
      </div>
    </aside>
  )
}
