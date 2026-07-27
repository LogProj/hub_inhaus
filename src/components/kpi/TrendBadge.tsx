import { ArrowDownRight, ArrowUpRight } from "lucide-react"
import { cn } from "@/lib/utils"
import { formatarVariacao } from "@/lib/format"

type TrendBadgeProps = {
  /** Variação percentual do período. Positivo sobe, negativo cai. */
  variacao: number
  /**
   * Sentido em que a variação é favorável para este indicador: turnover
   * subindo é ruim ("baixo" é bom), treinamento subindo é bom ("cima" é bom).
   */
  sentidoBom: "cima" | "baixo"
  className?: string
}

/**
 * Selo de variação com seta e cor semântica. A cor depende do SENTIDO do
 * indicador, não do sinal bruto do número — por isso `sentidoBom` é
 * obrigatório. Variação que arredonda para zero é neutra e não tem seta.
 */
export function TrendBadge({ variacao, sentidoBom, className }: TrendBadgeProps) {
  const texto = formatarVariacao(variacao)
  const arredondado = Number(variacao.toFixed(1))

  if (arredondado === 0) {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1 font-sans text-sm text-muted-foreground",
          className,
        )}
      >
        {texto}
      </span>
    )
  }

  const subiu = arredondado > 0
  const favoravel = sentidoBom === "cima" ? subiu : !subiu
  const Icone = subiu ? ArrowUpRight : ArrowDownRight

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 font-sans text-sm",
        favoravel ? "text-success" : "text-danger",
        className,
      )}
    >
      <Icone aria-hidden="true" width={14} height={14} strokeWidth={2} />
      {texto}
    </span>
  )
}
