import type { Metadata } from "next"
import { EmConstrucao } from "@/components/states/EmConstrucao"

export const metadata: Metadata = {
  title: "Horas de treinamento",
}

export default function HorasDeTreinamentoPage() {
  return (
    <EmConstrucao
      dominioLabel="Treinamentos"
      titulo="Horas de treinamento"
      descricao="Vai mostrar quantas horas de treinamento foram realizadas por contrato e por pessoa, comparadas à carga horária prevista para o período."
    />
  )
}
