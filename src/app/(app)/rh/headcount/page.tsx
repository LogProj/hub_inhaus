import type { Metadata } from "next"
import { EmConstrucao } from "@/components/states/EmConstrucao"

export const metadata: Metadata = {
  title: "Headcount",
}

export default function HeadcountPage() {
  return (
    <EmConstrucao
      dominioLabel="RH"
      titulo="Headcount"
      descricao="Vai mostrar o quadro de pessoas ativo em cada contrato e função, com a evolução do efetivo mês a mês."
    />
  )
}
