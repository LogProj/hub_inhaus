import type { Metadata } from "next"
import Link from "next/link"
import { CabecalhoVivo } from "@/components/home/CabecalhoVivo"
import { ListaAlertas } from "@/components/home/ListaAlertas"
import { KpiCard } from "@/components/kpi/KpiCard"
import { getSessionReadOnly } from "@/lib/auth-session"
import { DOMINIOS } from "@/lib/domains"
import { ALERTAS_HOME, KPIS_HOME } from "@/mocks/home-mock"

export const metadata: Metadata = {
  title: "Visão geral",
}

function primeiroNomeDaSessao(nomeCompleto: string | null | undefined): string {
  const primeiro = nomeCompleto?.trim().split(/\s+/)[0]
  return primeiro && primeiro.length > 0 ? primeiro : "colega"
}

function fraseDoEstadoOperacional(criticos: number, atencao: number): string {
  if (criticos > 0) {
    const alerta = criticos === 1 ? "alerta crítico pede" : "alertas críticos pedem"
    return `${criticos} ${alerta} atenção agora.`
  }
  if (atencao > 0) {
    const ponto = atencao === 1 ? "ponto de atenção" : "pontos de atenção"
    return `${atencao} ${ponto} na operação hoje.`
  }
  return "Operação dentro do esperado hoje."
}

/**
 * Home "mission control" — quatro faixas com contraste deliberado entre a
 * primeira (atmosfera navy, sem card) e as demais (superfícies planas do
 * canvas mist/navy-deep). Dados 100% mockados em `src/mocks/home-mock.ts`;
 * a única chamada real é a leitura de sessão, só para o primeiro nome da
 * saudação — o guard de acesso em si é responsabilidade do layout do grupo
 * `(app)`.
 */
export default async function HomePage() {
  const sessao = await getSessionReadOnly()
  const primeiroNome = primeiroNomeDaSessao(
    sessao.status === "ok" ? sessao.sessao.authorization.nome : null,
  )

  const criticos = ALERTAS_HOME.filter((alerta) => alerta.severidade === "critico").length
  const atencao = ALERTAS_HOME.filter((alerta) => alerta.severidade === "atencao").length
  const fraseEstado = fraseDoEstadoOperacional(criticos, atencao)

  const acessoRapido = DOMINIOS.map((dominio) => ({
    key: dominio.key,
    label: dominio.label,
    icone: dominio.icone,
    href: dominio.telas[0]?.href ?? "/home",
  }))

  return (
    <div className="flex flex-col gap-12">
      <CabecalhoVivo primeiroNome={primeiroNome} fraseEstado={fraseEstado} />

      <section aria-labelledby="home-pulso-titulo">
        <h2 id="home-pulso-titulo" className="sr-only">
          Pulso dos indicadores
        </h2>
        <div className="stagger grid gap-5 [grid-template-columns:repeat(auto-fit,minmax(248px,1fr))]">
          {KPIS_HOME.map((kpi) => (
            <KpiCard
              key={kpi.dominioKey}
              dominioLabel={kpi.dominioLabel}
              titulo={kpi.titulo}
              valor={kpi.valor}
              sufixo={kpi.sufixo}
              casas={kpi.casas}
              variacao={kpi.variacao}
              sentidoBom={kpi.sentidoBom}
              pontos={kpi.pontos}
              href={kpi.href}
            />
          ))}
        </div>
      </section>

      <section aria-labelledby="home-alertas-titulo">
        <h2
          id="home-alertas-titulo"
          className="font-sans text-label uppercase text-muted-foreground"
        >
          Alertas
        </h2>
        <ListaAlertas alertas={ALERTAS_HOME} className="mt-3" />
      </section>

      <section aria-labelledby="home-acesso-titulo">
        <h2
          id="home-acesso-titulo"
          className="font-sans text-label uppercase text-muted-foreground"
        >
          Acesso rápido
        </h2>
        <ul className="mt-3 flex flex-wrap gap-2">
          {acessoRapido.map((item) => (
            <li key={item.key}>
              <Link
                href={item.href}
                className="inline-flex items-center gap-2 rounded-md border border-hairline bg-card px-3 py-1.5 font-sans text-[13px] text-foreground transition-colors duration-[240ms] ease-calm hover:border-teal/30"
              >
                <item.icone aria-hidden="true" className="h-[14px] w-[14px] text-muted-foreground" strokeWidth={1.5} />
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
