"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useEffect, useState } from "react"
import {
  LayoutDashboard,
  UserCog,
  LogOut,
  UserRound,
  HardHat,
  ClipboardList,
  ClipboardCheck,
  ListChecks,
  Activity,
  ChevronDown,
  ChevronRight,
  type LucideIcon,
} from "lucide-react"

import { cn } from "@/lib/utils"
import { InhausLogo } from "@/components/brand/InhausLogo"
import { DOMINIOS, TELA_HOME, clientesVisiveis } from "@/lib/domains"

type NavItem = {
  href: string
  label: string
  icon?: LucideIcon
}

type NavGroup = {
  title: string
  icon?: LucideIcon
  items: NavItem[]
}

// Grupo "Geral" fixo no topo, com a Home fora de qualquer domínio.
const GRUPO_GERAL: NavGroup = {
  title: "Geral",
  items: [{ href: TELA_HOME.href, label: TELA_HOME.label, icon: TELA_HOME.icone ?? LayoutDashboard }],
}

// Um grupo por domínio — a FONTE DE VERDADE é src/lib/domains.ts. O título do
// grupo e o ícone vêm do domínio; cada tela usa o ícone próprio (tela.icone),
// com fallback para LayoutDashboard caso alguma fique sem ícone definido.
// Telas marcadas como `emBreve` (ainda não construídas) NÃO entram na sidebar —
// só aparecem na command palette, como mapa do produto. Grupos que ficam sem
// nenhuma tela pronta são omitidos.
// `visibleScreens` (null = mostra tudo, ex.: admin/dev) restringe as telas de cada
// domínio às concedidas ao usuário — ver src/lib/dashboard-acesso.ts.
// Domínios com subnível de clientes (área Clientes) NÃO entram aqui — são
// renderizados como accordion aninhado (Clientes → cliente → telas), mais abaixo.
function gruposDominio(visibleScreens: string[] | null): NavGroup[] {
  const permitidas = visibleScreens ? new Set(visibleScreens) : null
  return DOMINIOS.filter((dominio) => !dominio.clientes?.length).map((dominio) => ({
    title: dominio.label,
    icon: dominio.icone,
    items: dominio.telas
      .filter((tela) => !tela.emBreve)
      .filter((tela) => permitidas === null || permitidas.has(tela.key))
      .map((tela) => ({
        href: tela.href,
        label: tela.label,
        icon: tela.icone ?? LayoutDashboard,
      })),
  })).filter((grupo) => grupo.items.length > 0)
}

// Módulo de EPI — navegação POR PAPEL:
//  - quem CONFIGURA (admin/Segurança) vê Configurar/Checklists/Líderes + Validações;
//  - quem só VALIDA (líder) vê apenas Validações — some o problema de "o líder não
//    enxerga o menu e só chega pela URL".
const EPI_ITEM_VALIDACOES: NavItem = {
  href: "/dashboards/epi/utilizacao",
  label: "Utilização de EPIs",
  icon: ClipboardCheck,
}
const EPI_ITENS_CONFIG: NavItem[] = [
  { href: "/dashboards/epi/acompanhamento", label: "Acompanhamento", icon: Activity },
  { href: "/dashboards/epi/configurar", label: "Configurar", icon: ClipboardList },
  { href: "/dashboards/epi/checklists", label: "Checklists", icon: ListChecks },
  { href: "/dashboards/epi/lideres", label: "Líderes", icon: UserCog },
]

function grupoEpi(epiConfig: boolean, epiValida: boolean): NavGroup | null {
  if (epiConfig) {
    return { title: "EPI", icon: HardHat, items: [...EPI_ITENS_CONFIG, EPI_ITEM_VALIDACOES] }
  }
  if (epiValida) {
    return { title: "EPI", icon: HardHat, items: [EPI_ITEM_VALIDACOES] }
  }
  return null
}

// Administração — só para admin. Gestão de usuários do hub (acesso + telas visíveis).
const GRUPO_ADMIN: NavGroup = {
  title: "Administração",
  icon: UserCog,
  items: [{ href: "/dashboards/usuarios", label: "Usuários", icon: UserCog }],
}

export function DashboardSidebar({
  onNavigate,
  isAdmin = false,
  epiConfig = false,
  epiValida = false,
  nome = null,
  email = null,
  onLogout,
  signingOut = false,
  visibleScreens = null,
}: {
  onNavigate?: () => void
  isAdmin?: boolean
  epiConfig?: boolean
  epiValida?: boolean
  nome?: string | null
  email?: string | null
  onLogout?: () => void
  signingOut?: boolean
  visibleScreens?: string[] | null
}) {
  const pathname = usePathname()
  const grupoEpiAtual = grupoEpi(epiConfig, epiValida)
  // Quem pode preencher (líder/Segurança/admin) tem "Checklists" logo no topo —
  // é a porta de entrada do preenchimento.
  const grupoGeral: NavGroup = {
    ...GRUPO_GERAL,
    items: [
      ...GRUPO_GERAL.items,
      ...(epiValida
        ? [{ href: "/dashboards/checklists", label: "Checklists", icon: ClipboardCheck }]
        : []),
    ],
  }
  // Grupos planos (domínios internos) vêm antes; EPI/Admin depois. A área Clientes
  // (accordion aninhado) é renderizada ENTRE os dois, preservando a ordem original.
  const gruposPrincipais: NavGroup[] = [grupoGeral, ...gruposDominio(visibleScreens)]
  const gruposFinais: NavGroup[] = [
    ...(grupoEpiAtual ? [grupoEpiAtual] : []),
    ...(isAdmin ? [GRUPO_ADMIN] : []),
  ]

  // Domínios com subnível de clientes que têm ao menos um cliente visível ao usuário.
  const dominiosClientes = DOMINIOS.map((dominio) => ({
    dominio,
    clientes: clientesVisiveis(dominio, visibleScreens),
  })).filter((d) => d.clientes.length > 0)

  // Estado do accordion: qual seção (domínio Clientes) e qual cliente estão abertos.
  // Um cliente aberto por vez. Ao navegar para uma tela de cliente, abre a seção e o
  // cliente correspondentes automaticamente.
  const [secaoAberta, setSecaoAberta] = useState<string | null>(null)
  const [clienteAberto, setClienteAberto] = useState<string | null>(null)
  useEffect(() => {
    for (const { dominio, clientes } of dominiosClientes) {
      for (const cliente of clientes) {
        if (cliente.telas.some((tela) => tela.href === pathname)) {
          setSecaoAberta(dominio.key)
          setClienteAberto(cliente.key)
          return
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname])

  const renderGrupo = (group: NavGroup) => (
    <div key={group.title}>
      <p className="flex items-center gap-1.5 px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/70">
        {group.icon && <group.icon className="h-3 w-3" />}
        {group.title}
      </p>
      <ul className="space-y-1">
        {group.items.map((item) => {
          const active = pathname === item.href
          const ItemIcon = item.icon ?? LayoutDashboard
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                onClick={onNavigate}
                className={cn(
                  "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all",
                  active
                    ? "bg-inhaus-grad text-white shadow-[0_10px_24px_-12px_rgba(0,36,67,0.7)]"
                    : "text-foreground/75 hover:bg-teal-tint hover:text-teal",
                )}
              >
                <ItemIcon
                  className={cn(
                    "h-[18px] w-[18px] shrink-0 transition-transform",
                    !active && "group-hover:scale-110",
                  )}
                />
                <span className="flex-1">{item.label}</span>
              </Link>
            </li>
          )
        })}
      </ul>
    </div>
  )

  return (
    <div className="flex h-full flex-col gap-6 px-4 py-6">
      <Link
        href="/dashboards"
        onClick={onNavigate}
        className="flex flex-col items-center justify-center gap-1.5 px-2"
        aria-label="Início"
      >
        <InhausLogo className="h-8" />
        <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
          Hub
        </span>
      </Link>

      <nav className="flex flex-1 flex-col gap-6 overflow-y-auto">
        {gruposPrincipais.map(renderGrupo)}

        {/* Área Clientes — accordion aninhado: seção → cliente → telas. Só aparecem
            os clientes cujas telas foram concedidas ao usuário (Eixo 1). */}
        {dominiosClientes.map(({ dominio, clientes }) => {
          const aberta = secaoAberta === dominio.key
          const SecaoIcon = dominio.icone
          return (
            <div key={dominio.key}>
              <button
                type="button"
                onClick={() => setSecaoAberta((atual) => (atual === dominio.key ? null : dominio.key))}
                aria-expanded={aberta}
                className="flex w-full items-center gap-1.5 px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/70 transition-colors hover:text-teal"
              >
                <SecaoIcon className="h-3 w-3" />
                <span className="flex-1 text-left">{dominio.label}</span>
                {aberta ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
              </button>

              {aberta && (
                <ul className="space-y-1">
                  {clientes.map((cliente) => {
                    const clienteExpandido = clienteAberto === cliente.key
                    const ClienteIcon = cliente.icone ?? LayoutDashboard
                    return (
                      <li key={cliente.key}>
                        <button
                          type="button"
                          onClick={() =>
                            setClienteAberto((atual) => (atual === cliente.key ? null : cliente.key))
                          }
                          aria-expanded={clienteExpandido}
                          className={cn(
                            "group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all",
                            "text-foreground/75 hover:bg-teal-tint hover:text-teal",
                          )}
                        >
                          <ClienteIcon className="h-[18px] w-[18px] shrink-0 transition-transform group-hover:scale-110" />
                          <span className="flex-1 text-left">{cliente.label}</span>
                          {clienteExpandido ? (
                            <ChevronDown className="h-4 w-4 shrink-0" />
                          ) : (
                            <ChevronRight className="h-4 w-4 shrink-0" />
                          )}
                        </button>

                        {clienteExpandido && (
                          <ul className="mt-1 space-y-1 border-l border-navy/10 pl-3">
                            {cliente.telas.map((tela) => {
                              const active = pathname === tela.href
                              const TelaIcon = tela.icone ?? LayoutDashboard
                              return (
                                <li key={tela.href}>
                                  <Link
                                    href={tela.href}
                                    onClick={onNavigate}
                                    className={cn(
                                      "group flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-all",
                                      active
                                        ? "bg-inhaus-grad text-white shadow-[0_10px_24px_-12px_rgba(0,36,67,0.7)]"
                                        : "text-foreground/75 hover:bg-teal-tint hover:text-teal",
                                    )}
                                  >
                                    <TelaIcon
                                      className={cn(
                                        "h-[18px] w-[18px] shrink-0 transition-transform",
                                        !active && "group-hover:scale-110",
                                      )}
                                    />
                                    <span className="flex-1">{tela.label}</span>
                                  </Link>
                                </li>
                              )
                            })}
                          </ul>
                        )}
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
          )
        })}

        {gruposFinais.map(renderGrupo)}
      </nav>

      <div className="mt-auto border-t border-navy/10 pt-4">
        <div className="flex items-center gap-2 rounded-xl border border-navy/10 bg-white/70 px-3 py-2">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-inhaus-grad text-white">
            <UserRound className="h-4 w-4" />
          </span>
          <div className="min-w-0 flex-1 leading-tight">
            <p className="truncate text-xs font-semibold text-foreground">
              {nome ?? email ?? "Carregando…"}
            </p>
            <p className="truncate text-[10px] text-muted-foreground">
              {isAdmin ? "Administrador" : email ? "Acesso ao sistema" : ""}
            </p>
          </div>
        </div>
        <button
          onClick={onLogout}
          disabled={signingOut}
          className="mt-2 inline-flex h-9 w-full items-center justify-center gap-2 rounded-xl px-3 text-sm font-medium text-foreground/70 transition-colors hover:bg-teal-tint hover:text-teal disabled:opacity-50"
        >
          <LogOut className="h-4 w-4" />
          {signingOut ? "Saindo…" : "Sair"}
        </button>
      </div>
    </div>
  )
}
