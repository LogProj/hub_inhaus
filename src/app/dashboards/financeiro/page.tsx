import type { Metadata } from "next"

import { EmConstrucao } from "@/components/dashboard/EmConstrucao"

export const metadata: Metadata = { title: "Visão geral" }

export default function FinanceiroVisaoGeral() {
  return (
    <EmConstrucao
      dominioLabel="Financeiro"
      titulo="Visão geral"
      descricao="Painel financeiro com o resumo do custo de pessoal da operação, para acompanhar rapidamente o quanto a folha e as despesas relacionadas ao time representam frente ao orçamento."
    />
  )
}
