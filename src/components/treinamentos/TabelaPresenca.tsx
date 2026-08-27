import { tituloNome } from "@/lib/nomes"

type Presenca = {
  id: string
  nomeColab: string | null
  crNome: string | null
  cargo: string | null
  matricula: string | null
  localizadoNaSra: boolean
  cpfTexto: string | null
  confirmadoEm: Date
}

/** Formata 11 dígitos como 000.000.000-00. */
function formatarCpf(cpf: string | null): string {
  const d = (cpf ?? "").replace(/\D/g, "")
  if (d.length !== 11) return cpf ?? "—"
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`
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
            <th className="py-2 pr-4">CPF</th>
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
              <td className="py-2 pr-4">
                {/* CPF só aparece para quem não foi localizado na SRA (identificação). */}
                {!p.localizadoNaSra && p.cpfTexto ? formatarCpf(p.cpfTexto) : "—"}
              </td>
              <td className="py-2 pr-4">{p.crNome ? p.crNome.toUpperCase() : "—"}</td>
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
