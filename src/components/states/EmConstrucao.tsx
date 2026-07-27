import { EmptyState } from "@/components/states/EmptyState"

type EmConstrucaoProps = {
  /** Label do domínio ao qual a tela pertence, ex.: "Segurança". */
  dominioLabel: string
  /** Título do indicador, ex.: "Taxa de frequência". */
  titulo: string
  /** O que este painel vai mostrar quando os dados forem conectados. */
  descricao: string
}

/**
 * Estado padrão de toda tela de indicador ainda não construída: o mesmo
 * cabeçalho (domínio + título + selo "Em construção") seguido do EmptyState
 * único do hub, para manter o mesmo tom calmo em todas as 15 telas que ainda
 * não têm dado real conectado.
 */
export function EmConstrucao({ dominioLabel, titulo, descricao }: EmConstrucaoProps) {
  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-wrap items-center gap-3">
        <div>
          <p className="font-sans text-label uppercase text-muted-foreground">{dominioLabel}</p>
          <h1 className="font-display text-display-sm text-foreground">{titulo}</h1>
        </div>
        <span className="rounded-md border border-hairline px-2 py-0.5 text-label text-muted-foreground">
          Em construção
        </span>
      </header>
      <EmptyState
        titulo="Este indicador está sendo construído."
        descricao={`${descricao} Os dados ainda não foram conectados — assim que estiverem, este painel entra em operação automaticamente.`}
      />
    </div>
  )
}
