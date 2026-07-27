import type { Metadata } from "next"

import { EmConstrucao } from "@/components/dashboard/EmConstrucao"

export const metadata: Metadata = { title: "Visão geral" }

export default function RhVisaoGeral() {
  return (
    <EmConstrucao
      dominioLabel="RH"
      titulo="Visão geral"
      descricao="Painel de RH com o retrato do time: absenteísmo, turnover e o tamanho do quadro ativo, reunidos para acompanhar a saúde das pessoas na operação de forma rápida."
    />
  )
}
