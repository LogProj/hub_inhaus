import type { Metadata } from "next"

import { EmConstrucao } from "@/components/dashboard/EmConstrucao"

export const metadata: Metadata = { title: "Headcount" }

export default function Headcount() {
  return (
    <EmConstrucao
      dominioLabel="RH"
      titulo="Headcount"
      descricao="Mostra o tamanho do quadro de pessoas ativo na operação, com sua evolução mês a mês, para acompanhar se o time está crescendo, estável ou reduzindo frente ao planejado."
    />
  )
}
