import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { cn } from "@/lib/utils"
import { MetricValue } from "./MetricValue"
import { TrendBadge } from "./TrendBadge"
import { Sparkline } from "./Sparkline"

type KpiCardProps = {
  /** Domínio a que o indicador pertence — ex.: "Segurança", "RH". */
  dominioLabel: string
  /** Nome do indicador em si — ex.: "Taxa de frequência". */
  titulo: string
  valor: number
  sufixo?: string
  casas?: number
  variacao: number
  sentidoBom: "cima" | "baixo"
  /** Série de 12 pontos para o sparkline. */
  pontos: number[]
  /** Destino do "ver painel". */
  href: string
  className?: string
}

/**
 * Card do pulso da Home. É superfície de DADO: plana, sem atmosfera, sem
 * gradiente, sem sombra colorida. O hover só troca borda/texto — nunca
 * desloca nem escala o card.
 */
export function KpiCard({
  dominioLabel,
  titulo,
  valor,
  sufixo,
  casas,
  variacao,
  sentidoBom,
  pontos,
  href,
  className,
}: KpiCardProps) {
  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-lg border border-hairline bg-card p-6 transition-colors duration-[160ms] ease-calm hover:border-teal/30",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-sans text-label uppercase text-muted-foreground">
            {dominioLabel}
          </p>
          <p className="mt-1 font-sans text-sm text-foreground">{titulo}</p>
        </div>

        {/* Invisível até o hover, mas SEMPRE visível ao receber foco por
            teclado — senão o usuário foca um elemento que não consegue ver. */}
        <Link
          href={href}
          className="flex shrink-0 translate-x-2 items-center gap-1 rounded-sm font-sans text-sm text-teal opacity-0 transition-all duration-[240ms] ease-calm hover:text-teal-bright focus-visible:translate-x-0 focus-visible:opacity-100 group-hover:translate-x-0 group-hover:opacity-100"
        >
          ver painel
          <ArrowRight aria-hidden="true" width={14} height={14} strokeWidth={2} />
        </Link>
      </div>

      <div className="mt-5 flex items-end gap-3">
        <MetricValue valor={valor} sufixo={sufixo} casas={casas} />
        <TrendBadge variacao={variacao} sentidoBom={sentidoBom} className="pb-1" />
      </div>

      <Sparkline pontos={pontos} className="-mx-6 -mb-6 mt-6" />
    </div>
  )
}
