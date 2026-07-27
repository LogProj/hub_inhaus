import type { Metadata } from "next"

import { EmConstrucao } from "@/components/dashboard/EmConstrucao"

export const metadata: Metadata = { title: "Auditorias" }

export default function Auditorias() {
  return (
    <EmConstrucao
      dominioLabel="Qualidade"
      titulo="Auditorias"
      descricao="Mostra o resultado das auditorias de qualidade e organização (como ISO e 5S), com o percentual de itens de checklist atendidos em cada área da operação."
    />
  )
}
