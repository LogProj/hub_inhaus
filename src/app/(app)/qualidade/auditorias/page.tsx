import type { Metadata } from "next"
import { EmConstrucao } from "@/components/states/EmConstrucao"

export const metadata: Metadata = {
  title: "Auditorias",
}

export default function AuditoriasPage() {
  return (
    <EmConstrucao
      dominioLabel="Qualidade"
      titulo="Auditorias"
      descricao="Vai mostrar o resultado das auditorias de qualidade e 5S por contrato, com a evolução da nota em cada checklist aplicado."
    />
  )
}
