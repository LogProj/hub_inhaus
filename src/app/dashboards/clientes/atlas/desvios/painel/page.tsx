import { assertTelaVisivel } from "@/lib/dashboard-acesso"
import { PainelDesvios } from "@/components/desvios/PainelDesvios"
import { InfoPainelDesvios } from "@/components/desvios/InfoDesvios"

export const dynamic = "force-dynamic"

export default async function PainelDesviosPage() {
  await assertTelaVisivel("desvios-painel")
  return <PainelDesvios info={<InfoPainelDesvios />} />
}
