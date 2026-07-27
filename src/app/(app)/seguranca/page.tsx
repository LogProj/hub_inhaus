import type { Metadata } from "next"
import { EmConstrucao } from "@/components/states/EmConstrucao"

export const metadata: Metadata = {
  title: "Visão geral",
}

export default function SegurancaVisaoGeralPage() {
  return (
    <EmConstrucao
      dominioLabel="Segurança"
      titulo="Visão geral"
      descricao="Vai reunir a taxa de frequência de acidentes, os quase acidentes e o panorama de segurança de todos os contratos num único painel, para acompanhar a evolução mês a mês."
    />
  )
}
