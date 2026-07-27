import type { Metadata } from "next"
import { EmConstrucao } from "@/components/states/EmConstrucao"

export const metadata: Metadata = {
  title: "Taxa de frequência",
}

export default function TaxaDeFrequenciaPage() {
  return (
    <EmConstrucao
      dominioLabel="Segurança"
      titulo="Taxa de frequência"
      descricao="Vai mostrar a taxa de frequência de acidentes com e sem afastamento, por contrato e por mês, comparada à meta de segurança, para identificar rápido onde o risco está subindo."
    />
  )
}
