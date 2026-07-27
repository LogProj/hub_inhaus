import type { Metadata } from "next"

import { EmConstrucao } from "@/components/dashboard/EmConstrucao"

export const metadata: Metadata = { title: "Visão geral" }

export default function QualidadeVisaoGeral() {
  return (
    <EmConstrucao
      dominioLabel="Qualidade"
      titulo="Visão geral"
      descricao="Painel de qualidade com o resumo de não conformidades e auditorias realizadas, para enxergar rapidamente onde a operação está entregando dentro do padrão e onde precisa de atenção."
    />
  )
}
