import type { Metadata } from "next"
import { EmConstrucao } from "@/components/states/EmConstrucao"

export const metadata: Metadata = {
  title: "Matriz de competências",
}

export default function MatrizDeCompetenciasPage() {
  return (
    <EmConstrucao
      dominioLabel="Treinamentos"
      titulo="Matriz de competências"
      descricao="Vai mostrar quem está apto, vencido ou perto de vencer em cada treinamento obrigatório e NR, por contrato e por pessoa."
    />
  )
}
