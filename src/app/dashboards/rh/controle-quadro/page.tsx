import type { Metadata } from "next"
import { Users, UserCheck, Plane, HeartPulse } from "lucide-react"

import { TiltCard } from "@/components/TiltCard"
import { tituloNome } from "@/lib/nomes"
import { InfoIndicador } from "@/components/dashboard/InfoIndicador"
import { FiltrosQuadro } from "@/components/dashboard/FiltrosQuadro"
import {
  getControleQuadro,
  getOpcoesQuadro,
  GERENTE_REGIONAL_PADRAO,
  type ControleQuadro,
  type OpcoesQuadro,
} from "@/lib/quadro"

export const metadata: Metadata = { title: "Controle de Quadro" }

// Lê o quadro a cada acesso (sem prerender no build).
export const dynamic = "force-dynamic"

/** Formata "2026-07-28" como "28/07/2026" sem sofrer com fuso horário. */
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

function texto(v: string | string[] | undefined): string | null {
  const s = Array.isArray(v) ? v[0] : v
  return s && s.trim() ? s : null
}

function lista(v: string | string[] | undefined): string[] {
  if (!v) return []
  return Array.isArray(v) ? v : [v]
}

type SearchParams = { [k: string]: string | string[] | undefined }

export default async function ControleQuadroPage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  const gerenteRegional = texto(searchParams.gr) ?? GERENTE_REGIONAL_PADRAO
  const cr = texto(searchParams.cr)
  const mes = texto(searchParams.mes)
  const cargosExcluidos = lista(searchParams.excluir)

  let dados: ControleQuadro | null = null
  let opcoes: OpcoesQuadro | null = null
  try {
    ;[dados, opcoes] = await Promise.all([
      getControleQuadro({ gerenteRegional, cr, mes, cargosExcluidos }),
      getOpcoesQuadro(gerenteRegional, mes),
    ])
  } catch {
    dados = null
    opcoes = null
  }

  const nf = (n: number) => n.toLocaleString("pt-BR")
  const cargosIncluidos = opcoes ? opcoes.cargos.length - cargosExcluidos.length : 0

  // O banco guarda o nome do gerente em CAIXA ALTA. Casamos sem diferenciar
  // maiúsculas para o <select> exibir a opção certa, e mostramos com nome bonito.
  const gerenteEfetivo =
    opcoes?.gerentes.find((g) => g.toUpperCase() === gerenteRegional.toUpperCase()) ??
    gerenteRegional
  const gerenteExibicao = tituloNome(gerenteEfetivo)

  return (
    <div className="mx-auto max-w-6xl space-y-8">
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
              <b>O que mostra:</b> quantas pessoas fazem parte da equipe, de acordo com os
              filtros escolhidos (gerente regional, centro de resultado, mês e cargos).
            </p>
            <p>
              <b>Como contamos:</b> cada pessoa entra <b>uma única vez</b>, mesmo que atue
              em mais de um centro de resultado.
            </p>
            <ul className="list-disc space-y-1 pl-5">
              <li>
                O <b>mês</b> mostra a fotografia mais recente daquele mês
                {dados?.dataReferencia ? ` (atual: ${dataBR(dados.dataReferencia)})` : ""}.
              </li>
              <li>
                Você pode <b>desmarcar cargos</b> para tirá-los da conta — só entram no
                total os cargos que ficarem marcados.
              </li>
              <li>
                <b>Todas as situações contam:</b> em atividade, de férias e afastados
                continuam no quadro.
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
          <b className="font-semibold text-foreground">{gerenteExibicao}</b>
          {dados?.dataReferencia ? <> · fotografia de {dataBR(dados.dataReferencia)}</> : null}
        </p>
      </section>

      {opcoes && (
        <FiltrosQuadro
          opcoes={opcoes}
          atual={{ gerenteRegional: gerenteEfetivo, cr, mes, cargosExcluidos }}
        />
      )}

      {!dados ? (
        <div className="glass reveal rounded-3xl p-8">
          <p className="text-sm text-muted-foreground">
            Não foi possível consultar o quadro agora. Tente novamente em instantes.
          </p>
        </div>
      ) : (
        <section className="grid gap-5 lg:grid-cols-[1.1fr_2fr]">
          <TiltCard max={4}>
            <div className="glass reveal relative h-full overflow-hidden rounded-3xl p-7">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-teal-tint text-teal">
                <Users className="h-5 w-5" />
              </span>
              <p className="mt-5 text-sm font-medium text-muted-foreground">
                Total de colaboradores
              </p>
              <p className="mt-1 font-display text-5xl font-semibold tracking-tight text-foreground">
                {nf(dados.totalQuadro)}
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                {cr ? <>no CR selecionado</> : <>em todos os centros de resultado</>}
                {opcoes && cargosExcluidos.length > 0 ? (
                  <> · {cargosIncluidos} de {opcoes.cargos.length} cargos</>
                ) : null}
              </p>
            </div>
          </TiltCard>

          <div className="grid gap-5 sm:grid-cols-3">
            {dados.porSituacao.map((s, i) => {
              const rotulo = LABEL_SITUACAO[s.rotulo] ?? s.rotulo
              const Icone = ICONE_SITUACAO[rotulo] ?? UserCheck
              return (
                <div
                  key={s.rotulo}
                  className="glass reveal relative overflow-hidden rounded-3xl p-6"
                  style={{ animationDelay: `${i * 0.06}s` }}
                >
                  <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-teal-tint text-teal">
                    <Icone className="h-5 w-5" />
                  </span>
                  <p className="mt-4 text-sm font-medium text-foreground">{rotulo}</p>
                  <div className="mt-1 flex items-baseline gap-2">
                    <span className="font-display text-2xl font-semibold text-foreground">
                      {nf(s.total)}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {pct(s.total, dados!.totalQuadro)} do quadro
                    </span>
                  </div>
                </div>
              )
            })}
            {dados.porSituacao.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Nenhuma pessoa no quadro com os filtros atuais.
              </p>
            )}
          </div>
        </section>
      )}
    </div>
  )
}
