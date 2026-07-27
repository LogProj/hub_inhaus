import { Lock } from "lucide-react"

/**
 * Painel padrão para telas de indicador ainda não conectadas a dados reais.
 * Usado em todas as rotas de domínio até que o indicador correspondente
 * seja implementado.
 */
export function EmConstrucao({
  dominioLabel,
  titulo,
  descricao,
}: {
  dominioLabel: string
  titulo: string
  descricao: string
}) {
  return (
    <div className="glass reveal relative overflow-hidden rounded-3xl p-8 sm:p-10">
      <span className="eyebrow">{dominioLabel}</span>

      <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
          {titulo}
        </h1>
        <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-muted px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          <Lock className="h-3 w-3" /> Em construção
        </span>
      </div>

      <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
        {descricao}
      </p>

      <p className="mt-6 text-xs text-muted-foreground">
        Os dados deste indicador ainda não foram conectados — assim que estiverem
        disponíveis, este painel passa a mostrar os números reais da operação.
      </p>
    </div>
  )
}
