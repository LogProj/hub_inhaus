import { assertTelaVisivel } from "@/lib/dashboard-acesso"
import { TabelaDesvios } from "@/components/desvios/TabelaDesvios"
import { InfoDesvios } from "@/components/desvios/InfoDesvios"
import { getUsuarioAtual } from "@/lib/epi/guardas"

export const dynamic = "force-dynamic"

export default async function AcompanhamentoDesviosPage() {
  await assertTelaVisivel("desvios-acompanhamento")
  const u = await getUsuarioAtual()
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <h1 className="text-2xl font-semibold text-navy">Acompanhamento de Desvios</h1>
        <InfoDesvios />
      </div>
      <TabelaDesvios isAdmin={u?.isAdmin ?? false} />
    </div>
  )
}
