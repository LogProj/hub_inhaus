import { assertTelaVisivel } from "@/lib/dashboard-acesso"
import { escopoContratanteAtual } from "@/lib/desvios/escopo-usuario"
import { indicadoresDesvios } from "@/lib/desvios"
import { PainelDesvios } from "@/components/desvios/PainelDesvios"
import { InfoPainelDesvios } from "@/components/desvios/InfoDesvios"

export const dynamic = "force-dynamic"

export default async function PainelDesviosPage() {
  await assertTelaVisivel("desvios-painel")
  const { escopo } = await escopoContratanteAtual()
  const dados = await indicadoresDesvios(escopo)
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <h1 className="text-2xl font-semibold text-navy">Painel de Desvios</h1>
        <InfoPainelDesvios />
      </div>
      <PainelDesvios dados={dados} />
    </div>
  )
}
