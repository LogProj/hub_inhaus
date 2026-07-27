import type { Metadata } from "next"

import { EmConstrucao } from "@/components/dashboard/EmConstrucao"

export const metadata: Metadata = { title: "Visão geral" }

export default function SegurancaVisaoGeral() {
  return (
    <EmConstrucao
      dominioLabel="Segurança"
      titulo="Visão geral"
      descricao="Aqui vai o resumo da segurança do trabalho na operação: taxa de frequência de acidentes, quase acidentes relatados e a evolução dos indicadores de SST ao longo do tempo, tudo num único painel."
    />
  )
}
