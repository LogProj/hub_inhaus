import type { Metadata } from "next"

import { EmConstrucao } from "@/components/dashboard/EmConstrucao"

export const metadata: Metadata = { title: "Não conformidades" }

export default function NaoConformidades() {
  return (
    <EmConstrucao
      dominioLabel="Qualidade"
      titulo="Não conformidades"
      descricao="Reúne as não conformidades identificadas em auditorias e no dia a dia da operação, incluindo retrabalho e refugo, para acompanhar quantas ocorreram e como estão sendo tratadas."
    />
  )
}
