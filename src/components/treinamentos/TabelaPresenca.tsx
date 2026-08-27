import { tituloNome } from "@/lib/nomes"

type Presenca = {
  id: string
  nomeColab: string | null
  crNome: string | null
  cargo: string | null
  matricula: string | null
  localizadoNaSra: boolean
  confirmadoEm: Date
}

export function TabelaPresenca({ presencas }: { presencas: Presenca[] }) {
  if (presencas.length === 0) {
    return <p className="text-sm text-navy/60">Nenhuma presença registrada ainda.</p>
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm text-navy">
        <thead className="text-left text-navy/60">
          <tr>
            <th className="py-2 pr-4">Colaborador</th>
            <th className="py-2 pr-4">Unidade (CR)</th>
            <th className="py-2 pr-4">Cargo</th>
            <th className="py-2 pr-4">Matrícula</th>
            <th className="py-2 pr-4">Horário</th>
          </tr>
        </thead>
        <tbody>
          {presencas.map((p) => (
            <tr key={p.id} className="border-t border-navy/10">
              <td className="py-2 pr-4">
                {p.localizadoNaSra ? (
                  tituloNome(p.nomeColab ?? "")
                ) : (
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-800">
                    não localizado na SRA
                  </span>
                )}
              </td>
              <td className="py-2 pr-4">{p.crNome ? tituloNome(p.crNome) : "—"}</td>
              <td className="py-2 pr-4">{p.cargo ? tituloNome(p.cargo) : "—"}</td>
              <td className="py-2 pr-4">{p.matricula ?? "—"}</td>
              <td className="py-2 pr-4">
                {new Date(p.confirmadoEm).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
