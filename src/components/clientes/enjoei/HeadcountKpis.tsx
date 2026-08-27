import { CalendarX2, Percent, TrendingDown, Users, type LucideIcon } from "lucide-react"

import { cn } from "@/lib/utils"

const numeroBR = (v: number) => v.toLocaleString("pt-BR", { maximumFractionDigits: 1 })

type Tom = "brand" | "violet" | "amber" | "red"

const TOM_CHIP: Record<Tom, string> = {
  brand: "bg-enjoei-grad shadow-[0_8px_20px_-8px_rgba(97,0,93,0.6)]",
  violet: "bg-gradient-to-br from-[#8E2589] to-[#61005D] shadow-[0_8px_20px_-8px_rgba(97,0,93,0.55)]",
  amber: "bg-gradient-to-br from-amber-400 to-amber-600 shadow-[0_8px_20px_-8px_rgba(217,119,6,0.6)]",
  red: "bg-gradient-to-br from-red-400 to-red-600 shadow-[0_8px_20px_-8px_rgba(239,68,68,0.55)]",
}

const TOM_VALOR: Record<Tom, string> = {
  brand: "text-foreground",
  violet: "text-[#61005D]",
  amber: "text-amber-700",
  red: "text-red-600",
}

function KpiCard({
  label,
  valor,
  sufixo,
  icon: Icon,
  tom,
  rodape,
  className,
}: {
  label: string
  valor: number
  sufixo?: string
  icon: LucideIcon
  tom: Tom
  /** Linha de apoio abaixo do número. */
  rodape?: React.ReactNode
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
        {numeroBR(valor)}
        {sufixo && <span className="ml-0.5 text-xl text-muted-foreground">{sufixo}</span>}
      </p>
      <div className="mt-2 h-[18px] text-xs font-medium leading-[18px]">{rodape}</div>
    </div>
  )
}

/** Linha de KPIs do Headcount: quadro do mês, aderência, absenteísmo e faltas do mês. */
export function HeadcountKpis({
  quadro,
  aderenciaGeral,
  mediaAbsenteismo,
  totalFaltas,
}: {
  quadro: number
  aderenciaGeral: number
  mediaAbsenteismo: number
  totalFaltas: number
}) {
  return (
    <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <KpiCard
        className="reveal"
        label="Colaboradores no mês"
        valor={quadro}
        icon={Users}
        tom="brand"
      />
      <KpiCard
        className="reveal delay-1"
        label="Aderência (mês)"
        valor={aderenciaGeral}
        sufixo="%"
        icon={Percent}
        tom="violet"
      />
      <KpiCard
        className="reveal delay-2"
        label="Média absenteísmo (mês)"
        valor={mediaAbsenteismo}
        sufixo="%"
        icon={TrendingDown}
        tom="amber"
      />
      <KpiCard
        className="reveal delay-3"
        label="Total de faltas (mês)"
        valor={totalFaltas}
        icon={CalendarX2}
        tom="red"
      />
    </div>
  )
}
