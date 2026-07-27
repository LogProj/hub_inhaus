import type { Metadata } from "next"

import { EmConstrucao } from "@/components/dashboard/EmConstrucao"

export const metadata: Metadata = { title: "Custo de pessoal" }

export default function CustoPessoal() {
  return (
    <EmConstrucao
      dominioLabel="Financeiro"
      titulo="Custo de pessoal"
      descricao="Mostra o quanto a operação está gastando com a folha e despesas ligadas ao time, comparado ao orçamento previsto, para acompanhar se o custo de pessoal está sob controle."
    />
  )
}
