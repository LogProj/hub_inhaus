import Link from "next/link"
import { cn } from "@/lib/utils"
import { EmptyState } from "@/components/states/EmptyState"
import type { AlertaHome, SeveridadeAlerta } from "@/mocks/home-mock"

type ListaAlertasProps = {
  alertas: AlertaHome[]
  className?: string
}

/** Crítico primeiro, depois atenção, depois os já resolvidos. */
const ORDEM_SEVERIDADE: Record<SeveridadeAlerta, number> = {
  critico: 0,
  atencao: 1,
  ok: 2,
}

const COR_SEVERIDADE: Record<SeveridadeAlerta, string> = {
  critico: "bg-danger",
  atencao: "bg-warn",
  ok: "bg-success",
}

/** Só para leitor de tela — a cor sozinha nunca carrega o significado. */
const ROTULO_SEVERIDADE: Record<SeveridadeAlerta, string> = {
  critico: "Crítico",
  atencao: "Atenção",
  ok: "Resolvido",
}

/**
 * Faixa 3 da Home — LINHA, não card. `<ul>` com divisores finos, marcador
 * semântico à esquerda e ordenação por severidade. Alertas vazios mostram o
 * mesmo `EmptyState` calmo usado no resto do hub.
 */
export function ListaAlertas({ alertas, className }: ListaAlertasProps) {
  if (alertas.length === 0) {
    return (
      <EmptyState
        titulo="Nada exige sua atenção agora."
        descricao="Assim que houver um alerta operacional — segurança, prazos, metas —, ele aparece aqui."
        className={className}
      />
    )
  }

  const ordenados = [...alertas].sort(
    (a, b) => ORDEM_SEVERIDADE[a.severidade] - ORDEM_SEVERIDADE[b.severidade],
  )

  return (
    <ul className={cn("divide-y divide-hairline", className)}>
      {ordenados.map((alerta) => (
        <li key={alerta.id} className="grid grid-cols-[4px_1fr_auto] items-center gap-4 py-4">
          <span
            aria-hidden="true"
            className={cn("h-8 w-1 rounded-full", COR_SEVERIDADE[alerta.severidade])}
          />
          <div className="min-w-0">
            <p className="font-sans text-sm text-foreground">
              <span className="sr-only">{ROTULO_SEVERIDADE[alerta.severidade]}: </span>
              {alerta.descricao}
            </p>
            <p className="mt-0.5 font-sans text-[13px] text-muted-foreground">{alerta.contexto}</p>
          </div>
          <Link
            href={alerta.href}
            className="whitespace-nowrap font-sans text-sm text-teal transition-colors duration-[240ms] ease-calm hover:text-teal-bright"
          >
            {alerta.acao}
          </Link>
        </li>
      ))}
    </ul>
  )
}
