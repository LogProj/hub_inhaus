import { notFound } from "next/navigation"
import { resolverTreinamentoPublico } from "@/lib/treinamentos"
import { InhausLogo } from "@/components/brand/InhausLogo"
import { TreinamentoPublicoForm } from "./TreinamentoPublicoForm"

export const dynamic = "force-dynamic"

export default async function TreinamentoPublicoPage({ params }: { params: { token: string } }) {
  const r = await resolverTreinamentoPublico(params.token)
  if (r === null) notFound()

  return (
    <main className="min-h-screen bg-inhaus-radial flex items-center justify-center p-6">
      <div className="glass w-full max-w-md rounded-3xl p-8 space-y-8">
        <div className="flex justify-center">
          <InhausLogo className="h-9" />
        </div>
        {r.estado === "encerrado" ? (
          <p className="text-center text-navy">Este treinamento já foi encerrado. Procure o responsável.</p>
        ) : (
          <>
            <div className="space-y-2 text-center">
              <p className="eyebrow justify-center">Registro de presença</p>
              <h1 className="text-2xl font-semibold leading-snug text-navy">{r.treinamento.nome}</h1>
              <p className="text-sm text-navy/70">
                {new Date(r.treinamento.data).toLocaleDateString("pt-BR", { timeZone: "UTC" })}
              </p>
            </div>
            <TreinamentoPublicoForm token={params.token} />
          </>
        )}
      </div>
    </main>
  )
}
