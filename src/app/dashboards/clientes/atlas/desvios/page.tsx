import { assertTelaVisivel } from "@/lib/dashboard-acesso"
import { TabelaDesvios } from "@/components/desvios/TabelaDesvios"
import { InfoDesvios } from "@/components/desvios/InfoDesvios"

export const dynamic = "force-dynamic"

export default async function AcompanhamentoDesviosPage() {
  await assertTelaVisivel("desvios-acompanhamento")
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <h1 className="text-2xl font-semibold text-navy">Acompanhamento de Desvios</h1>
        <InfoDesvios />
      </div>
      <TabelaDesvios />
    </div>
  )
}
