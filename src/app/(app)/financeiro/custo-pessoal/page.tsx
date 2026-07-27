import type { Metadata } from "next"
import { EmConstrucao } from "@/components/states/EmConstrucao"

export const metadata: Metadata = {
  title: "Custo de pessoal",
}

export default function CustoDePessoalPage() {
  return (
    <EmConstrucao
      dominioLabel="Financeiro"
      titulo="Custo de pessoal"
      descricao="Vai mostrar o custo de pessoal por contrato — folha, encargos e demais despesas — comparado ao orçamento do mês."
    />
  )
}
