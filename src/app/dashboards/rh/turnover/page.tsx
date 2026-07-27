import type { Metadata } from "next"

import { EmConstrucao } from "@/components/dashboard/EmConstrucao"

export const metadata: Metadata = { title: "Turnover" }

export default function Turnover() {
  return (
    <EmConstrucao
      dominioLabel="RH"
      titulo="Turnover"
      descricao="Mostra quantas pessoas saíram e entraram no time em cada período, e qual foi a rotatividade em relação ao quadro ativo — um sinal importante da estabilidade da operação."
    />
  )
}
