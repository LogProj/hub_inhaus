import type { Metadata } from "next"
import { EmConstrucao } from "@/components/states/EmConstrucao"

export const metadata: Metadata = {
  title: "Visão geral",
}

export default function RhVisaoGeralPage() {
  return (
    <EmConstrucao
      dominioLabel="RH"
      titulo="Visão geral"
      descricao="Vai reunir absenteísmo, turnover e headcount de todos os contratos num único painel, destacando os pontos que mais pedem atenção da gestão de pessoas."
    />
  )
}
