import type { Metadata } from "next"
import { EmConstrucao } from "@/components/states/EmConstrucao"

export const metadata: Metadata = {
  title: "Visão geral",
}

export default function QualidadeVisaoGeralPage() {
  return (
    <EmConstrucao
      dominioLabel="Qualidade"
      titulo="Visão geral"
      descricao="Vai reunir não conformidades e auditorias de todos os contratos num único painel, mostrando onde a qualidade está fora da meta."
    />
  )
}
