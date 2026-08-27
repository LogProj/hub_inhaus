import { UserX } from "lucide-react"

import type { Desligado } from "@/lib/clientes/enjoei/turnover"

function formatarData(iso: string): string {
  const [ano, mes, dia] = iso.split("-")
  return `${dia}/${mes}/${ano}`
}

/** Lista dos desligamentos mais recentes; estado vazio quando ainda não há nenhum. */
export function DesligadosRecentes({ dados }: { dados: Desligado[] }) {
  if (dados.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-enjoei/20 bg-enjoei-mist/30 px-6 py-10 text-center">
        <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-enjoei-mist text-enjoei">
          <UserX className="h-5 w-5" />
        </span>
        <div className="space-y-1">
          <p className="text-sm font-semibold text-foreground">Nenhum desligamento registrado</p>
          <p className="max-w-xs text-xs text-muted-foreground">
            Assim que um colaborador for desligado no relatório do Motus, ele aparecerá aqui com
            data de admissão, desligamento e tempo de casa.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-enjoei/10">
      <div className="max-h-[420px] overflow-auto">
        <table className="w-full text-left text-sm">
          <thead className="sticky top-0 bg-enjoei-mist/70 text-xs uppercase tracking-wide text-muted-foreground backdrop-blur">
            <tr>
              <th className="px-4 py-3 font-semibold">Nome</th>
              <th className="px-4 py-3 font-semibold">Função</th>
              <th className="px-4 py-3 font-semibold">Admissão</th>
              <th className="px-4 py-3 font-semibold">Desligamento</th>
              <th className="px-4 py-3 font-semibold">Tempo de casa</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-enjoei/10">
            {dados.map((d) => (
              <tr key={`${d.nome}-${d.dtDemissao}`} className="transition-colors hover:bg-enjoei-mist/30">
                <td className="px-4 py-3 font-medium text-foreground">{d.nome}</td>
                <td className="px-4 py-3 text-muted-foreground">{d.funcao ?? "—"}</td>
                <td className="px-4 py-3 tabular-nums text-muted-foreground">{formatarData(d.dtAdmissao)}</td>
                <td className="px-4 py-3 tabular-nums text-red-600">{formatarData(d.dtDemissao)}</td>
                <td className="px-4 py-3 text-muted-foreground">{d.tempoCasa}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
