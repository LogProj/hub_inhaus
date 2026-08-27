import { cn } from "@/lib/utils"
import type { Celula, CellStatus, DiaInfo } from "@/lib/clientes/enjoei/absenteismo"

const ROTULO: Record<CellStatus, string> = {
  presente: "presença",
  falta: "falta",
  folga: "folga / sem registro",
  ferias: "férias",
}

const COR: Record<CellStatus, string> = {
  presente: "bg-enjoei/85 shadow-[0_2px_6px_-2px_rgba(97,0,93,0.5)]",
  falta: "bg-red-500/85 shadow-[0_2px_6px_-2px_rgba(239,68,68,0.5)]",
  folga: "bg-slate-200/80",
  ferias: "bg-amber-400/90 shadow-[0_2px_6px_-2px_rgba(245,158,11,0.5)]",
}

const VAZIA: Celula = { status: "folga", motivo: null }

/**
 * Grade de presenças: colaboradores no eixo Y, dias no eixo X.
 * Roxo (marca Enjoei) = presença; vermelho = falta; âmbar = férias; cinza = folga/sem registro.
 * Ao passar o mouse, mostra o motivo do dia.
 */
export function AttendanceGrid({
  colaboradores,
  dias,
  celulas,
}: {
  colaboradores: string[]
  dias: DiaInfo[]
  celulas: Record<string, Record<string, Celula>>
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[820px] table-fixed border-separate border-spacing-1">
        <caption className="sr-only">
          Grade de presenças por colaborador ao longo dos dias. Roxo indica presença,
          vermelho indica falta, âmbar indica férias e cinza indica folga ou ausência de
          registro.
        </caption>
        <thead>
          <tr>
            <th
              scope="col"
              className="sticky left-0 z-10 w-44 bg-white/90 px-2 py-1 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground backdrop-blur"
            >
              Colaborador
            </th>
            {dias.map((d) => (
              <th
                key={d.iso}
                scope="col"
                className={cn(
                  "px-0 pb-1 text-center text-[10px] font-medium leading-tight",
                  d.fimDeSemana ? "text-muted-foreground/40" : "text-muted-foreground",
                )}
              >
                <span className="block tabular-nums">{d.label}</span>
                <span className="block text-[8px] uppercase">{d.semana}</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {colaboradores.map((nome) => (
            <tr key={nome}>
              <th
                scope="row"
                className="sticky left-0 z-10 w-44 truncate bg-white/90 px-2 py-1 text-left text-xs font-medium text-foreground backdrop-blur"
                title={nome}
              >
                {nome}
              </th>
              {dias.map((d) => {
                const c = celulas[nome]?.[d.iso] ?? VAZIA
                const rotulo = ROTULO[c.status]
                const titulo = [`${nome} — ${d.label}: ${rotulo}`, c.motivo ? `Motivo: ${c.motivo}` : null]
                  .filter(Boolean)
                  .join("\n")
                return (
                  <td key={d.iso} className="p-0 text-center">
                    <span
                      title={titulo}
                      className={cn(
                        "mx-auto block aspect-square w-full max-w-[30px] rounded-[6px] transition-colors",
                        COR[c.status],
                      )}
                    >
                      <span className="sr-only">
                        {rotulo}
                        {c.motivo ? ` — ${c.motivo}` : ""}
                      </span>
                    </span>
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
