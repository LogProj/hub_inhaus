import type { Metadata } from "next"
import { EmConstrucao } from "@/components/states/EmConstrucao"

export const metadata: Metadata = {
  title: "Não conformidades",
}

export default function NaoConformidadesPage() {
  return (
    <EmConstrucao
      dominioLabel="Qualidade"
      titulo="Não conformidades"
      descricao="Vai mostrar quantas não conformidades foram abertas, por contrato e por causa — incluindo retrabalho e refugo —, e o quanto foi resolvido dentro do prazo."
    />
  )
}
