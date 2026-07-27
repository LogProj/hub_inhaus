import type { Metadata } from "next"

import { EmConstrucao } from "@/components/dashboard/EmConstrucao"

export const metadata: Metadata = { title: "Matriz de competências" }

export default function MatrizCompetencias() {
  return (
    <EmConstrucao
      dominioLabel="Treinamentos"
      titulo="Matriz de competências"
      descricao="Mostra quem está apto em cada treinamento e norma exigida (como as NRs), com os prazos de validade e certificações próximas do vencimento, para evitar que alguém fique desatualizado."
    />
  )
}
