import Link from "next/link"
import { HardHat, Lock, type LucideIcon } from "lucide-react"

/** Cabeçalho padrão das telas de EPI, no mesmo tratamento das telas de indicador. */
export function EpiHeader({
  eyebrow,
  titulo,
  descricao,
  icone: Icone = HardHat,
  acao,
  info,
}: {
  eyebrow: string
  titulo: string
  descricao?: string
  icone?: LucideIcon
  acao?: React.ReactNode
  /** Botão de info (ex.: <InfoIndicador/>) exibido ao lado do título. */
  info?: React.ReactNode
}) {
  return (
    <section className="reveal flex flex-wrap items-end justify-between gap-4">
      <div>
        <p className="eyebrow flex items-center gap-2">
          <Icone className="h-3.5 w-3.5" />
          {eyebrow}
        </p>
        <div className="mt-1 flex items-center gap-2">
          <h1 className="font-display text-3xl font-semibold tracking-tight text-navy">{titulo}</h1>
          {info}
        </div>
        {descricao ? <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{descricao}</p> : null}
      </div>
      {acao ? <div className="shrink-0">{acao}</div> : null}
    </section>
  )
}

/** Bloco de acesso negado, para telas que exigem admin/parametrizador. */
export function SemAcesso({ mensagem = "Esta área é restrita à configuração do módulo de EPI." }: { mensagem?: string }) {
  return (
    <div className="glass mx-auto mt-16 max-w-md rounded-3xl p-8 text-center">
      <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-navy/8 text-navy">
        <Lock className="h-5 w-5" />
      </span>
      <h2 className="mt-4 font-display text-lg font-semibold text-navy">Acesso restrito</h2>
      <p className="mt-2 text-sm text-muted-foreground">{mensagem}</p>
      <Link
        href="/dashboards"
        className="mt-6 inline-flex h-10 items-center justify-center rounded-full bg-navy px-5 text-sm font-medium text-white transition-colors hover:bg-navy-deep"
      >
        Voltar ao início
      </Link>
    </div>
  )
}
