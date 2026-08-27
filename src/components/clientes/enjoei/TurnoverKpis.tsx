import { ArrowDownRight, ArrowUpRight, RefreshCw, Users, type LucideIcon } from "lucide-react"

import { cn } from "@/lib/utils"

const numeroBR = (v: number) => v.toLocaleString("pt-BR")

type Tom = "brand" | "violet" | "green" | "red"

const TOM_CHIP: Record<Tom, string> = {
  brand: "bg-enjoei-grad shadow-[0_8px_20px_-8px_rgba(97,0,93,0.6)]",
  violet: "bg-gradient-to-br from-[#8E2589] to-[#61005D] shadow-[0_8px_20px_-8px_rgba(97,0,93,0.55)]",
  green: "bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-[0_8px_20px_-8px_rgba(5,150,105,0.55)]",
  red: "bg-gradient-to-br from-red-400 to-red-600 shadow-[0_8px_20px_-8px_rgba(239,68,68,0.55)]",
}

const TOM_VALOR: Record<Tom, string> = {
  brand: "text-foreground",
  violet: "text-[#61005D]",
  green: "text-emerald-700",
  red: "text-red-600",
}

function KpiCard({
  label,
  valor,
  sufixo,
  icon: Icon,
  tom,
  className,
}: {
  label: string
  /** null = sem base registrada para o cálculo → mostra "—". */
  valor: number | null
  sufixo?: string
  icon: LucideIcon
  tom: Tom
  className?: string
}) {
  return (
    <div className={cn("glass flex flex-col rounded-2xl p-5", className)}>
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        <span
          className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-white",
            TOM_CHIP[tom],
          )}
        >
          <Icon className="h-[18px] w-[18px]" aria-hidden />
        </span>
      </div>

      <p className={cn("mt-3 font-display text-3xl font-semibold tabular-nums", TOM_VALOR[tom])}>
        {valor == null ? "—" : numeroBR(valor)}
        {valor != null && sufixo && (
          <span className="ml-0.5 text-xl text-muted-foreground">{sufixo}</span>
        )}
      </p>
      <div className="mt-2 h-[18px]" aria-hidden />
    </div>
  )
}

/** Linha de KPIs do Turnover: quadro ativo, admissões e desligamentos do mês, taxa de turnover. */
export function TurnoverKpis({
  quadroAtivoAtual,
  admissoesMes,
  desligamentosMes,
  taxaTurnoverPct,
}: {
  quadroAtivoAtual: number
  admissoesMes: number
  desligamentosMes: number
  taxaTurnoverPct: number | null
}) {
  return (
    <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <KpiCard
        className="reveal"
        label="Quadro ativo atual"
        valor={quadroAtivoAtual}
        icon={Users}
        tom="brand"
      />
      <KpiCard
        className="reveal delay-1"
        label="Admissões no mês"
        valor={admissoesMes}
        icon={ArrowUpRight}
        tom="green"
      />
      <KpiCard
        className="reveal delay-2"
        label="Desligamentos no mês"
        valor={desligamentosMes}
        icon={ArrowDownRight}
        tom="red"
      />
      <KpiCard
        className="reveal delay-3"
        label="Taxa de turnover (mês)"
        valor={taxaTurnoverPct}
        sufixo="%"
        icon={RefreshCw}
        tom="violet"
      />
    </div>
  )
}
