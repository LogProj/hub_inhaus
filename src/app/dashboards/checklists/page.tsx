import type { Metadata } from "next"
import Link from "next/link"
import { ArrowRight, ClipboardList, HardHat, type LucideIcon } from "lucide-react"

import { resolverPapeisDashboard, type PapeisDashboard } from "@/lib/dashboard-acesso"

export const metadata: Metadata = { title: "Checklists" }
export const dynamic = "force-dynamic"

type ChecklistDisponivel = {
  key: string
  titulo: string
  descricao: string
  href: string
  icone: LucideIcon
  temAcesso: (p: PapeisDashboard) => boolean
}

/**
 * Catálogo de checklists do hub. Hoje só existe o de Utilização de EPIs; novos
 * checklists entram aqui e aparecem automaticamente para quem tiver acesso.
 */
const CHECKLISTS: ChecklistDisponivel[] = [
  {
    key: "epi",
    titulo: "Utilização de EPIs",
    descricao: "Marque, por colaborador do seu turno, quais EPIs estão conformes no dia.",
    href: "/dashboards/epi/utilizacao",
    icone: HardHat,
    temAcesso: (p) => p.epiValida,
  },
]

export default async function ChecklistsPage() {
  const papeis = await resolverPapeisDashboard()
  const disponiveis = CHECKLISTS.filter((c) => c.temAcesso(papeis))

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <section className="reveal">
        <span className="eyebrow">
          <ClipboardList className="h-3.5 w-3.5" />
          Preenchimento
        </span>
        <h1 className="mt-3 font-display text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
          Checklists
        </h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Toque em um checklist para preencher.
        </p>
      </section>

      {disponiveis.length === 0 ? (
        <div className="glass reveal rounded-3xl p-8 text-center">
          <p className="text-sm text-muted-foreground">
            Você ainda não tem acesso a nenhum checklist. Peça à Segurança para vincular
            você a um CR na aba <strong>Líderes</strong>.
          </p>
        </div>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {disponiveis.map((c) => {
            const Icone = c.icone
            return (
              <li key={c.key}>
                <Link
                  href={c.href}
                  className="glass group flex h-full items-center gap-4 rounded-3xl p-5 transition-shadow hover:shadow-glow focus:outline-none focus-visible:ring-2 focus-visible:ring-teal/40 active:scale-[0.99]"
                >
                  <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-inhaus-grad text-white shadow-glow">
                    <Icone className="h-7 w-7" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-display text-lg font-semibold text-navy">{c.titulo}</p>
                    <p className="mt-0.5 text-sm text-muted-foreground">{c.descricao}</p>
                  </div>
                  <ArrowRight className="h-5 w-5 shrink-0 text-teal transition-transform group-hover:translate-x-1" />
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
