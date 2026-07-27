import type { Metadata } from "next"

import { EmConstrucao } from "@/components/dashboard/EmConstrucao"

export const metadata: Metadata = { title: "Absenteísmo" }

export default function Absenteismo() {
  return (
    <EmConstrucao
      dominioLabel="RH"
      titulo="Absenteísmo"
      descricao="Acompanha faltas, atestados e ausências não planejadas do time ao longo do mês, mostrando o quanto a presença real ficou abaixo do esperado — e onde vale reforçar o acompanhamento."
    />
  )
}
