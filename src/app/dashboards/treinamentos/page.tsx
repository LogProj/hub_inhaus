import type { Metadata } from "next"

import { EmConstrucao } from "@/components/dashboard/EmConstrucao"

export const metadata: Metadata = { title: "Visão geral" }

export default function TreinamentosVisaoGeral() {
  return (
    <EmConstrucao
      dominioLabel="Treinamentos"
      titulo="Visão geral"
      descricao="Painel de treinamentos com a matriz de competências e as horas de treinamento realizadas, para acompanhar se o time está capacitado e em dia com as certificações exigidas."
    />
  )
}
