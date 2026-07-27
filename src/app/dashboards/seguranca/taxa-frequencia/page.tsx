import type { Metadata } from "next"

import { EmConstrucao } from "@/components/dashboard/EmConstrucao"

export const metadata: Metadata = { title: "Taxa de frequência" }

export default function TaxaFrequencia() {
  return (
    <EmConstrucao
      dominioLabel="Segurança"
      titulo="Taxa de frequência"
      descricao="Mostra quantos acidentes com afastamento aconteceram para cada milhão de horas trabalhadas, o principal termômetro de segurança da operação. Quanto menor a taxa, mais segura está a rotina do time."
    />
  )
}
