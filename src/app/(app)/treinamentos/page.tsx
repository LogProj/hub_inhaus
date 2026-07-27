import type { Metadata } from "next"
import { EmConstrucao } from "@/components/states/EmConstrucao"

export const metadata: Metadata = {
  title: "Visão geral",
}

export default function TreinamentosVisaoGeralPage() {
  return (
    <EmConstrucao
      dominioLabel="Treinamentos"
      titulo="Visão geral"
      descricao="Vai reunir a matriz de competências e as horas de treinamento de todos os contratos num único painel, mostrando onde a equipe está em dia ou atrasada."
    />
  )
}
