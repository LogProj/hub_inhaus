import Link from "next/link"
import { cn } from "@/lib/utils"

type EmptyStateAcaoLink = { label: string; href: string }
type EmptyStateAcaoBotao = { label: string; onClick: () => void }

export type EmptyStateAcao = EmptyStateAcaoLink | EmptyStateAcaoBotao

type EmptyStateProps = {
  titulo: string
  descricao: string
  /** Aceita um link (`href`) ou um botão (`onClick`, ex.: `reset()` do error boundary). */
  acao?: EmptyStateAcao
  className?: string
}

const ESTILO_ACAO =
  "mt-1 inline-flex items-center rounded-md border border-hairline bg-card px-4 py-2 font-sans text-sm text-teal transition-colors duration-[240ms] ease-calm hover:border-teal/30 hover:text-teal-bright"

/**
 * Estado vazio único do hub — usado em "sem alertas", 404, 403 e erro, para
 * manter o mesmo tom em toda a aplicação: uma pausa calma, nunca "nenhum
 * resultado encontrado". A ilustração é um recorte gerado da malha de dados
 * desvanecendo (mesma linguagem de `DataMesh`), nunca fotografia ou banco de
 * imagens.
 */
export function EmptyState({ titulo, descricao, acao, className }: EmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-center gap-5 px-6 py-12 text-center", className)}>
      <MalhaDesvanecendo />
      <div className="max-w-sm space-y-1.5">
        <p className="font-display text-display-sm text-foreground">{titulo}</p>
        <p className="font-sans text-sm text-muted-foreground">{descricao}</p>
      </div>
      {acao && "href" in acao && (
        <Link href={acao.href} className={ESTILO_ACAO}>
          {acao.label}
        </Link>
      )}
      {acao && "onClick" in acao && (
        <button type="button" onClick={acao.onClick} className={ESTILO_ACAO}>
          {acao.label}
        </button>
      )}
    </div>
  )
}

const COLUNAS = [0, 20, 40, 60, 80, 100, 120]
const LINHAS = [0, 20, 40, 60, 80]
const PONTOS_MALHA = COLUNAS.flatMap((x) => LINHAS.map((y) => ({ x, y })))

/**
 * Recorte de 120×80 da malha de dados, desvanecendo do centro para a borda
 * via máscara radial. Determinístico (sem `Math.random()`): mesma marcação no
 * servidor e no cliente. A cor vem de `text-navy/10` (claro) e
 * `text-white/10` (escuro) herdada via `currentColor`.
 */
function MalhaDesvanecendo() {
  return (
    <svg
      width={120}
      height={80}
      viewBox="0 0 120 80"
      aria-hidden="true"
      className="text-navy/10 dark:text-white/10"
    >
      <defs>
        <radialGradient id="empty-state-desvanecer" cx="50%" cy="45%" r="65%">
          <stop offset="0%" stopColor="white" stopOpacity="1" />
          <stop offset="100%" stopColor="white" stopOpacity="0" />
        </radialGradient>
        <mask id="empty-state-mascara">
          <rect width={120} height={80} fill="url(#empty-state-desvanecer)" />
        </mask>
      </defs>
      <g mask="url(#empty-state-mascara)">
        {COLUNAS.map((x) => (
          <line key={`v-${x}`} x1={x} y1={0} x2={x} y2={80} stroke="currentColor" strokeWidth={1} />
        ))}
        {LINHAS.map((y) => (
          <line key={`h-${y}`} x1={0} y1={y} x2={120} y2={y} stroke="currentColor" strokeWidth={1} />
        ))}
        {PONTOS_MALHA.map((ponto) => (
          <circle key={`${ponto.x}-${ponto.y}`} cx={ponto.x} cy={ponto.y} r={1.5} fill="currentColor" />
        ))}
      </g>
    </svg>
  )
}
