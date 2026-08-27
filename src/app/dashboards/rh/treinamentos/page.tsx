import Link from "next/link"
import { assertTelaVisivel } from "@/lib/dashboard-acesso"
import { listarTreinamentos, listarResponsaveis } from "@/lib/treinamentos"
import { CriarTreinamento } from "@/components/treinamentos/CriarTreinamento"
import { ConfigResponsaveis } from "@/components/treinamentos/ConfigResponsaveis"
import { InfoTreinamentos } from "@/components/treinamentos/InfoTreinamentos"

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

      <ConfigResponsaveis responsaveis={responsaveis} />
      <CriarTreinamento responsaveis={responsaveis} />

      <div className="glass rounded-3xl p-6">
        <h3 className="mb-4 font-semibold text-navy">Treinamentos registrados</h3>
        {treinamentos.length === 0 ? (
          <p className="text-sm text-navy/60">Nenhum treinamento criado ainda.</p>
        ) : (
          <ul className="divide-y divide-navy/10">
            {treinamentos.map((t) => (
              <li key={t.id} className="flex items-center justify-between py-3">
                <Link href={`/dashboards/rh/treinamentos/${t.id}`} className="text-navy hover:text-teal">
                  <span className="font-medium">{t.nome}</span>
                  <span className="ml-2 text-sm text-navy/60">
                    {new Date(t.data).toLocaleDateString("pt-BR", { timeZone: "UTC" })} · {t.duracaoHoras}h ·{" "}
                    {t.responsavel} · {t.presencas} presença(s)
                  </span>
                </Link>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs ${
                    t.status === "ABERTO" ? "bg-teal/10 text-teal" : "bg-navy/10 text-navy/70"
                  }`}
                >
                  {t.status === "ABERTO" ? "Aberto" : "Encerrado"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
