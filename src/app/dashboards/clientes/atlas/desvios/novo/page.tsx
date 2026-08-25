import { assertTelaVisivel } from "@/lib/dashboard-acesso"
import { FormularioDesvio } from "@/components/desvios/FormularioDesvio"
import { InfoDesvios } from "@/components/desvios/InfoDesvios"

export const dynamic = "force-dynamic"

export default async function NovoDesvioPage() {
  await assertTelaVisivel("desvios-formulario")
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <h1 className="text-2xl font-semibold text-navy">Formulário de Desvios</h1>
        <InfoDesvios />
      </div>
      <FormularioDesvio />
    </div>
  )
}
