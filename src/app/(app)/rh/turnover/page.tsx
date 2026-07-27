import type { Metadata } from "next"
import { EmConstrucao } from "@/components/states/EmConstrucao"

export const metadata: Metadata = {
  title: "Turnover",
}

export default function TurnoverPage() {
  return (
    <EmConstrucao
      dominioLabel="RH"
      titulo="Turnover"
      descricao="Vai mostrar quantas admissões e desligamentos aconteceram em cada contrato, com a rotatividade do time comparada aos meses anteriores."
    />
  )
}
