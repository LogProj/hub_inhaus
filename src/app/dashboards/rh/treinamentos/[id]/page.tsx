import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { notFound } from "next/navigation"
import { assertTelaVisivel } from "@/lib/dashboard-acesso"
import { getTreinamentoComPresencas, listarResponsaveis } from "@/lib/treinamentos"
import { QrTreinamento } from "@/components/treinamentos/QrTreinamento"
import { TabelaPresenca } from "@/components/treinamentos/TabelaPresenca"
import { InfoTreinamentos } from "@/components/treinamentos/InfoTreinamentos"
import { EncerrarTreinamento } from "@/components/treinamentos/EncerrarTreinamento"
import { EditarTreinamento } from "@/components/treinamentos/EditarTreinamento"

export const dynamic = "force-dynamic"

export default async function DetalheTreinamentoPage({ params }: { params: { id: string } }) {
  await assertTelaVisivel("treinamentos-registro")
  const [t, responsaveis] = await Promise.all([
    getTreinamentoComPresencas(params.id),
    listarResponsaveis(),
  ])
  if (!t) notFound()

  const dataISO = new Date(t.data).toISOString().slice(0, 10)

  return (
    <div className="space-y-6">
      <Link
        href="/dashboards/rh/treinamentos"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-navy/60 transition-colors hover:text-teal focus:outline-none focus-visible:ring-2 focus-visible:ring-teal/40 rounded"
      >
        <ArrowLeft className="h-4 w-4" />
        Voltar aos treinamentos
      </Link>
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
          {t.status === "ABERTO" ? (
            <div className="glass rounded-3xl p-6 space-y-4">
              <div className="space-y-1">
                <h3 className="font-semibold text-navy">Presença por QR Code</h3>
                <p className="text-sm text-navy/60">
                  Abra o QR Code e mostre na tela ou projete para o pessoal escanear e registrar presença.
                </p>
              </div>
              <QrTreinamento token={t.tokenPublico} nome={t.nome} />
              <EditarTreinamento
                id={t.id}
                nome={t.nome}
                data={dataISO}
                duracaoHoras={t.duracaoHoras}
                responsavelId={t.responsavelId}
                responsaveis={responsaveis}
              />
              <EncerrarTreinamento id={t.id} />
            </div>
          ) : (
            <div className="glass rounded-3xl p-6 space-y-4">
              <p className="text-sm text-navy/60">
                Treinamento encerrado — não recebe mais presenças.
              </p>
              <EditarTreinamento
                id={t.id}
                nome={t.nome}
                data={dataISO}
                duracaoHoras={t.duracaoHoras}
                responsavelId={t.responsavelId}
                responsaveis={responsaveis}
              />
            </div>
          )}
        </div>
        <div className="glass rounded-3xl p-6">
          <h3 className="mb-4 font-semibold text-navy">Lista de presença ({t.presencas.length})</h3>
          <TabelaPresenca presencas={t.presencas} />
        </div>
      </div>
    </div>
  )
}
