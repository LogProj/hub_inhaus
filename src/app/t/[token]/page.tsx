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
      <div className="glass w-full max-w-md rounded-3xl p-8 space-y-6">
        <InhausLogo className="h-8" />
        {r.estado === "encerrado" ? (
          <p className="text-navy">Este treinamento já foi encerrado. Procure o responsável.</p>
        ) : (
          <>
            <div>
              <p className="eyebrow">Registro de presença</p>
              <h1 className="text-2xl font-semibold text-navy">{r.treinamento.nome}</h1>
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
