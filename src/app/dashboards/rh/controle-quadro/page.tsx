import type { Metadata } from "next"
import {
  Users, UserCheck, Plane, HeartPulse, UserMinus, LineChart, Building2, Briefcase, Repeat,
} from "lucide-react"

import { InfoIndicador } from "@/components/dashboard/InfoIndicador"
import { FiltrosQuadro } from "@/components/dashboard/FiltrosQuadro"
import { LinhaQuadro } from "@/components/dashboard/LinhaQuadro"
import { BarrasQuadro } from "@/components/dashboard/BarrasQuadro"
import {
  getControleQuadro,
  getOpcoesQuadro,
  GERENTE_REGIONAL_FIXO,
  type ControleQuadro,
  type OpcoesQuadro,
} from "@/lib/quadro"

export const metadata: Metadata = { title: "Controle de Quadro" }

export const dynamic = "force-dynamic"

function dataBR(iso: string | null): string {
  if (!iso) return "—"
  const [y, m, d] = iso.slice(0, 10).split("-")
  return `${d}/${m}/${y}`
}

const LABEL_SITUACAO: Record<string, string> = {
  NORMAL: "Em atividade",
  "FÉRIAS": "Em férias",
  FERIAS: "Em férias",
  AFASTADO: "Afastados",
}

const ICONE_SITUACAO: Record<string, typeof UserCheck> = {
  "Em atividade": UserCheck,
  "Em férias": Plane,
  Afastados: HeartPulse,
}

function pct(parte: number, total: number): string {
  if (!total) return "0%"
  return `${Math.round((parte / total) * 100)}%`
}

function lista(v: string | string[] | undefined): string[] {
  if (!v) return []
  return (Array.isArray(v) ? v : [v]).filter((s) => s.trim())
}

type SearchParams = { [k: string]: string | string[] | undefined }

export default async function ControleQuadroPage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  const gerentes = lista(searchParams.ger)
  const crs = lista(searchParams.cr)
  const meses = lista(searchParams.mes)
  const cargosExcluidos = lista(searchParams.excluir)

  let dados: ControleQuadro | null = null
  let opcoes: OpcoesQuadro | null = null
  try {
    ;[dados, opcoes] = await Promise.all([
      getControleQuadro({ gerentes, crs, meses, cargosExcluidos }),
      getOpcoesQuadro(meses),
    ])
  } catch {
    dados = null
    opcoes = null
  }

  const nf = (n: number) => n.toLocaleString("pt-BR")
  const cargosIncluidos = opcoes ? opcoes.cargos.length - cargosExcluidos.length : 0

  return (
    <div className="space-y-8">
      {/* Cabeçalho */}
      <section className="reveal">
        <span className="eyebrow">
          <Users className="h-3.5 w-3.5" />
          Recursos Humanos
        </span>
        <div className="mt-4 flex items-center gap-3">
          <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            Controle de Quadro
          </h1>
          <InfoIndicador titulo="Controle de Quadro">
            <p>
              <b>O que mostra:</b> quantas pessoas fazem parte da equipe do gerente regional{" "}
              <b>{GERENTE_REGIONAL_FIXO}</b>, de acordo com os filtros. Você pode escolher{" "}
              <b>mais de um</b> gerente, CR ou mês ao mesmo tempo.
            </p>
            <p>
              <b>Como contamos:</b> cada pessoa entra <b>uma única vez</b>, mesmo que atue em
              mais de um centro de resultado.
            </p>
            <ul className="list-disc space-y-1 pl-5">
              <li>
                <b>Total por CR e por cargo:</b> total de pessoas em cada centro de resultado
                e em cada cargo, <b>no último dia disponível</b>. Mostra as maiores
                concentrações (role para ver mais).
              </li>
              <li>
                <b>Quadro ativo por dia:</b> total de ativos em cada <b>data de referência</b>
                {" "}(as fotografias do quadro).
              </li>
              <li>
                <b>Quadro médio por mês:</b> a <b>média</b> das fotografias de cada mês.
              </li>
              <li>
                <b>Desligamentos no mês:</b> pessoas com <b>data de desligamento</b> no mês,
                contadas uma única vez.
              </li>
              <li>
                <b>Turnover no mês (rotatividade):</b> desligamentos do mês divididos pelo{" "}
                <b>quadro médio do mês</b>, em porcentagem. Ex.: 18 desligamentos sobre um
                quadro médio de 1.800 pessoas = <b>1,0%</b>.
              </li>
              <li>
                Você pode <b>desmarcar cargos</b> para tirá-los da conta. Todas as situações
                (atividade, férias, afastados) contam no total.
              </li>
            </ul>
            <p>
              <b>Exemplo:</b> com 1.749 pessoas em atividade, 74 de férias e 6 afastadas, o
              quadro é 1.749 + 74 + 6 = <b>1.829</b> pessoas.
            </p>
          </InfoIndicador>
        </div>
        <p className="mt-2 text-muted-foreground">
          Gerente regional{" "}
          <b className="font-semibold text-foreground">{GERENTE_REGIONAL_FIXO}</b>
          {dados?.dataReferencia ? <> · fotografia de {dataBR(dados.dataReferencia)}</> : null}
        </p>
      </section>

      {opcoes && (
        <FiltrosQuadro opcoes={opcoes} atual={{ gerentes, crs, meses, cargosExcluidos }} />
      )}

      {!dados ? (
        <div className="glass reveal rounded-3xl p-8">
          <p className="text-sm text-muted-foreground">
            Não foi possível consultar o quadro agora. Tente novamente em instantes.
          </p>
        </div>
      ) : (
        <>
          {/* Cards principais — lado a lado, todos na mesma linha */}
          <section className="grid grid-cols-2 gap-5 md:grid-cols-3 xl:grid-cols-6">
            <div className="glass reveal relative overflow-hidden rounded-3xl p-6">
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-teal-tint text-teal">
                <Users className="h-5 w-5" />
              </span>
              <p className="mt-4 text-sm font-medium text-muted-foreground">
                Total de colaboradores
              </p>
              <p className="mt-1 font-display text-3xl font-semibold tracking-tight text-foreground">
                {nf(dados.totalQuadro)}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {cargosExcluidos.length > 0 && opcoes
                  ? `${cargosIncluidos} de ${opcoes.cargos.length} cargos`
                  : "todos os cargos"}
              </p>
            </div>

            {/* Só as situações do quadro ativo (atividade/férias/afastados);
                DEMITIDO e TRANSFERIDO não viram card. */}
            {dados.porSituacao
              .filter((s) => s.rotulo in LABEL_SITUACAO)
              .map((s, i) => {
                const rotulo = LABEL_SITUACAO[s.rotulo] ?? s.rotulo
                const Icone = ICONE_SITUACAO[rotulo] ?? UserCheck
                return (
                  <div
                    key={s.rotulo}
                    className="glass reveal relative overflow-hidden rounded-3xl p-6"
                    style={{ animationDelay: `${(i + 1) * 0.05}s` }}
                  >
                    <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-teal-tint text-teal">
                      <Icone className="h-5 w-5" />
                    </span>
                    <p className="mt-4 text-sm font-medium text-muted-foreground">{rotulo}</p>
                    <p className="mt-1 font-display text-3xl font-semibold tracking-tight text-foreground">
                      {nf(s.total)}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {pct(s.total, dados!.totalQuadro)} do quadro
                    </p>
                  </div>
                )
              })}

            <div className="glass reveal relative overflow-hidden rounded-3xl p-6">
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-teal-tint text-teal">
                <UserMinus className="h-5 w-5" />
              </span>
              <p className="mt-4 text-sm font-medium text-muted-foreground">Desligamentos no mês</p>
              <p className="mt-1 font-display text-3xl font-semibold tracking-tight text-foreground">
                {nf(dados.desligamentosMes)}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {dados.desligamentosMes === 0 ? "Nenhum no período" : "no mês"}
              </p>
            </div>

            <div className="glass reveal relative overflow-hidden rounded-3xl p-6">
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-teal-tint text-teal">
                <Repeat className="h-5 w-5" />
              </span>
              <p className="mt-4 text-sm font-medium text-muted-foreground">Turnover no mês</p>
              <p className="mt-1 font-display text-3xl font-semibold tracking-tight text-foreground">
                {dados.turnoverMes.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                sobre {nf(dados.quadroMedioMes)} em média
              </p>
            </div>
          </section>

          {/* Linha do tempo — por data de referência */}
          <section className="glass reveal rounded-3xl p-6">
            <div className="mb-1 flex items-center gap-2">
              <LineChart className="h-4 w-4 text-teal" />
              <h2 className="font-display text-lg font-semibold tracking-tight text-foreground">
                Quadro ativo por dia
              </h2>
            </div>
            <p className="mb-4 text-xs text-muted-foreground">
              Total de pessoas ativas em cada data de referência (fotografia do quadro).
            </p>
            {dados.linhaDoTempo.length ? (
              <LinhaQuadro dados={dados.linhaDoTempo} gradId="grad-dia" />
            ) : (
              <p className="text-sm text-muted-foreground">Sem fotografias no período.</p>
            )}
          </section>

          {/* Quadro médio por mês */}
          <section className="glass reveal rounded-3xl p-6">
            <div className="mb-1 flex items-center gap-2">
              <LineChart className="h-4 w-4 text-teal" />
              <h2 className="font-display text-lg font-semibold tracking-tight text-foreground">
                Quadro médio de ativos por mês
              </h2>
            </div>
            <p className="mb-4 text-xs text-muted-foreground">
              Média das fotografias do quadro em cada mês.
            </p>
            {dados.quadroMedioMensal.length ? (
              <LinhaQuadro
                dados={dados.quadroMedioMensal}
                formato="mes"
                sufixoTooltip="em média"
                gradId="grad-mes"
              />
            ) : (
              <p className="text-sm text-muted-foreground">Sem fotografias no período.</p>
            )}
          </section>

          {/* Por CR e por cargo — no último dia disponível */}
          <section className="grid gap-5 lg:grid-cols-2">
            <div className="glass reveal rounded-3xl p-6">
              <div className="mb-1 flex items-center gap-2">
                <Building2 className="h-4 w-4 text-teal" />
                <h2 className="font-display text-lg font-semibold tracking-tight text-foreground">
                  Total por centro de resultado
                </h2>
              </div>
              <p className="mb-4 text-xs text-muted-foreground">
                Maiores concentrações no último dia disponível · role para ver mais.
              </p>
              {dados.porCr.length ? (
                <div className="max-h-[380px] overflow-y-auto pr-1">
                  <BarrasQuadro dados={dados.porCr} larguraRotulo={300} maxRotulo={0} />
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Sem dados no período.</p>
              )}
            </div>

            <div className="glass reveal rounded-3xl p-6">
              <div className="mb-1 flex items-center gap-2">
                <Briefcase className="h-4 w-4 text-teal" />
                <h2 className="font-display text-lg font-semibold tracking-tight text-foreground">
                  Total por cargo
                </h2>
              </div>
              <p className="mb-4 text-xs text-muted-foreground">
                Maiores concentrações no último dia disponível · role para ver mais.
              </p>
              {dados.porCargo.length ? (
                <div className="max-h-[380px] overflow-y-auto pr-1">
                  <BarrasQuadro dados={dados.porCargo} larguraRotulo={220} maxRotulo={40} />
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Sem dados no período.</p>
              )}
            </div>
          </section>
        </>
      )}
    </div>
  )
}
