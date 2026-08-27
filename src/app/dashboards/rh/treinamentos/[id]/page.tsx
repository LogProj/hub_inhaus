import { notFound } from "next/navigation"
import { assertTelaVisivel } from "@/lib/dashboard-acesso"
import { getTreinamentoComPresencas } from "@/lib/treinamentos"
import { QrTreinamento } from "@/components/treinamentos/QrTreinamento"
import { TabelaPresenca } from "@/components/treinamentos/TabelaPresenca"
import { InfoTreinamentos } from "@/components/treinamentos/InfoTreinamentos"
import { EncerrarTreinamento } from "@/components/treinamentos/EncerrarTreinamento"

export const dynamic = "force-dynamic"

export default async function DetalheTreinamentoPage({ params }: { params: { id: string } }) {
  await assertTelaVisivel("treinamentos-registro")
  const t = await getTreinamentoComPresencas(params.id)
  if (!t) notFound()

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <h1 className="text-2xl font-semibold text-navy">{t.nome}</h1>
        <InfoTreinamentos />
      </div>
      <p className="text-sm text-navy/70">
        {new Date(t.data).toLocaleDateString("pt-BR", { timeZone: "UTC" })} · {t.duracaoHoras}h · {t.responsavel} ·{" "}
        {t.status === "ABERTO" ? "Aberto" : "Encerrado"}
      </p>

      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <div className="space-y-4">
          {t.status === "ABERTO" && <QrTreinamento token={t.tokenPublico} nome={t.nome} />}
          {t.status === "ABERTO" && <EncerrarTreinamento id={t.id} />}
        </div>
        <div className="glass rounded-3xl p-6">
          <h3 className="mb-4 font-semibold text-navy">Lista de presença ({t.presencas.length})</h3>
          <TabelaPresenca presencas={t.presencas} />
        </div>
      </div>
    </div>
  )
}
