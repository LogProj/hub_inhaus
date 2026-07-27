import type { Metadata } from "next"
import { EmConstrucao } from "@/components/states/EmConstrucao"

export const metadata: Metadata = {
  title: "Quase acidentes",
}

export default function QuaseAcidentesPage() {
  return (
    <EmConstrucao
      dominioLabel="Segurança"
      titulo="Quase acidentes"
      descricao="Vai mostrar quantos quase acidentes e condições inseguras foram relatados, por contrato e por tipo de risco, para agir antes que virem acidentes de verdade."
    />
  )
}
