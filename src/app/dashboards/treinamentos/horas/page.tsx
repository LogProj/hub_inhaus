import type { Metadata } from "next"

import { EmConstrucao } from "@/components/dashboard/EmConstrucao"

export const metadata: Metadata = { title: "Horas de treinamento" }

export default function HorasTreinamento() {
  return (
    <EmConstrucao
      dominioLabel="Treinamentos"
      titulo="Horas de treinamento"
      descricao="Mostra o total de horas de treinamento (HHT) realizadas pelo time e a média de horas por pessoa, para acompanhar se a carga de capacitação está de acordo com o planejado."
    />
  )
}
