import type { Metadata } from "next"
import { EmConstrucao } from "@/components/states/EmConstrucao"

export const metadata: Metadata = {
  title: "Visão geral",
}

export default function FinanceiroVisaoGeralPage() {
  return (
    <EmConstrucao
      dominioLabel="Financeiro"
      titulo="Visão geral"
      descricao="Vai reunir o custo de pessoal de todos os contratos num único painel, comparando o realizado com o orçado do mês."
    />
  )
}
