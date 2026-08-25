import { STATUS_DESVIO, rotuloStatus } from "@/lib/desvios/opcoes"

/** Classes de cor por família semântica do status (âmbar/vermelho/verde). */
const CORES: Record<string, { pill: string; dot: string }> = {
  ambar: { pill: "bg-amber-100 text-amber-700", dot: "bg-amber-500" },
  vermelho: { pill: "bg-red-100 text-red-700", dot: "bg-red-500" },
  verde: { pill: "bg-emerald-100 text-emerald-700", dot: "bg-emerald-500" },
}

/** Pill colorido com o status de um desvio (ponto + rótulo). */
export function StatusBadge({ status }: { status: string }) {
  const cor = STATUS_DESVIO.find((s) => s.value === status)?.cor ?? "ambar"
  const classes = CORES[cor] ?? CORES.ambar
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${classes.pill}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${classes.dot}`} aria-hidden="true" />
      {rotuloStatus(status)}
    </span>
  )
}
