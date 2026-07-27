import type { Metadata } from "next"
import { EmConstrucao } from "@/components/states/EmConstrucao"

export const metadata: Metadata = {
  title: "Absenteísmo",
}

export default function AbsenteismoPage() {
  return (
    <EmConstrucao
      dominioLabel="RH"
      titulo="Absenteísmo"
      descricao="Vai mostrar quantas pessoas faltaram, em quais dias e em quais contratos, com comparação contra a meta do mês."
    />
  )
}
