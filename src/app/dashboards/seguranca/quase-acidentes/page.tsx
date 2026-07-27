import type { Metadata } from "next"

import { EmConstrucao } from "@/components/dashboard/EmConstrucao"

export const metadata: Metadata = { title: "Quase acidentes" }

export default function QuaseAcidentes() {
  return (
    <EmConstrucao
      dominioLabel="Segurança"
      titulo="Quase acidentes"
      descricao="Reúne os relatos de quase acidentes e condições inseguras identificadas pela equipe antes que virassem um problema de verdade. Quanto mais a operação relata, mais cedo consegue agir e evitar acidentes."
    />
  )
}
