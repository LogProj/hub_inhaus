import { assertTelaVisivel } from "@/lib/dashboard-acesso"
import { listarTreinamentos, listarResponsaveis } from "@/lib/treinamentos"
import { CriarTreinamento } from "@/components/treinamentos/CriarTreinamento"
import { ConfigResponsaveis } from "@/components/treinamentos/ConfigResponsaveis"
import { InfoTreinamentos } from "@/components/treinamentos/InfoTreinamentos"
import { TabelaTreinamentos } from "@/components/treinamentos/TabelaTreinamentos"

export const dynamic = "force-dynamic"

export default async function TreinamentosPage() {
  await assertTelaVisivel("treinamentos-registro")
  const [treinamentos, responsaveis] = await Promise.all([listarTreinamentos(), listarResponsaveis()])

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <h1 className="text-2xl font-semibold text-navy">Treinamentos</h1>
        <InfoTreinamentos />
      </div>

      <CriarTreinamento responsaveis={responsaveis} />
      <ConfigResponsaveis responsaveis={responsaveis} />

      <div className="glass rounded-3xl p-6">
        <h3 className="mb-4 font-semibold text-navy">Treinamentos registrados</h3>
        <TabelaTreinamentos treinamentos={treinamentos} responsaveis={responsaveis} />
      </div>
    </div>
  )
}
