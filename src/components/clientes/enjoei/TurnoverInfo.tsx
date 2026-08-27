"use client"

import { useEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { Info, X } from "lucide-react"

function Secao({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="border-t border-border/70 pt-6">
      <h3 className="font-display text-base font-semibold text-foreground">{titulo}</h3>
      <div className="mt-3">{children}</div>
    </section>
  )
}

function Item({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="font-semibold text-foreground">{titulo}</dt>
      <dd className="mt-0.5 text-muted-foreground">{children}</dd>
    </div>
  )
}

/** Botão de informação com as regras de cálculo do dashboard de Turnover. */
export function TurnoverInfo() {
  const [aberto, setAberto] = useState(false)
  const fecharRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!aberto) return
    fecharRef.current?.focus()
    document.body.style.overflow = "hidden"
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setAberto(false)
    }
    document.addEventListener("keydown", onKey)
    return () => {
      document.body.style.overflow = ""
      document.removeEventListener("keydown", onKey)
    }
  }, [aberto])

  return (
    <>
      <button
        type="button"
        onClick={() => setAberto(true)}
        aria-label="Como os indicadores de turnover são calculados"
        className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-enjoei/15 bg-white/70 text-enjoei transition-colors hover:bg-enjoei-mist focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-enjoei/30"
      >
        <Info className="h-4 w-4" />
      </button>

      {aberto &&
        createPortal(
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
              className="absolute inset-0 bg-navy/40 backdrop-blur-sm"
              onClick={() => setAberto(false)}
              aria-hidden
            />
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="turnover-regras-titulo"
              className="reveal relative z-10 max-h-[88vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-enjoei/10 bg-white p-7 shadow-soft sm:p-9"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <span className="eyebrow">Regras de cálculo</span>
                  <h2
                    id="turnover-regras-titulo"
                    className="mt-3 font-display text-2xl font-semibold"
                  >
                    Como o turnover é calculado
                  </h2>
                </div>
                <button
                  ref={fecharRef}
                  type="button"
                  onClick={() => setAberto(false)}
                  aria-label="Fechar"
                  className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-enjoei-mist hover:text-enjoei focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-enjoei/30"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="mt-8 space-y-6 text-sm leading-relaxed text-foreground/90">
                <section>
                  <h3 className="font-display text-base font-semibold text-foreground">
                    De onde vêm os números
                  </h3>
                  <p className="mt-3 text-muted-foreground">
                    Do <b className="text-foreground">relatório diário de colaboradores da Enjoei</b>{" "}
                    (unidade Cabreúva). Todo dia é guardada uma "foto" de quem estava na equipe,
                    com a data de <b className="text-foreground">admissão</b> e, quando houver, a
                    data de <b className="text-foreground">desligamento</b> de cada pessoa.
                  </p>
                  <p className="mt-3 rounded-xl bg-enjoei-mist/50 px-4 py-3 text-xs text-muted-foreground">
                    📌 O painel mostra <b className="text-foreground">exatamente o que foi
                    registrado</b>. Dia sem relatório não é estimado nem preenchido por conta
                    própria — ele aparece como <b className="text-foreground">lacuna</b> no gráfico
                    de quadro por dia.
                  </p>
                </section>

                <Secao titulo="Indicadores">
                  <dl className="space-y-3">
                    <Item titulo="Quadro ativo atual">
                      quantas pessoas estavam na equipe no{" "}
                      <b className="text-foreground">último dia registrado</b> — contando só quem
                      não tem data de desligamento.
                    </Item>
                    <Item titulo="Admissões no mês">
                      pessoas cuja <b className="text-foreground">data de admissão</b> caiu no mês
                      selecionado. Cada pessoa conta uma vez, mesmo aparecendo em vários dias.
                    </Item>
                    <Item titulo="Desligamentos no mês">
                      pessoas cuja <b className="text-foreground">data de desligamento</b> caiu no
                      mês selecionado.
                    </Item>
                    <Item titulo="Admissões e desligamentos por dia">
                      as mesmas entradas e saídas, abertas no <b className="text-foreground">dia
                      exato</b> em que aconteceram dentro do mês. Serve para enxergar picos de
                      contratação (ex.: uma turma inteira admitida no mesmo dia).
                    </Item>
                    <Item titulo="Quadro (headcount) por dia">
                      quantas pessoas ativas havia em cada dia. Os dias do mês continuam no eixo,
                      mas só os dias com relatório têm ponto na linha.
                    </Item>
                    <Item titulo="Taxa de turnover (mês)">
                      desligamentos do mês ÷ quadro médio do mês × 100. O{" "}
                      <b className="text-foreground">quadro médio</b> é a média das pessoas ativas
                      nos dias que têm relatório — dias sem registro não entram na conta.
                    </Item>
                    <Item titulo="Tempo de casa">
                      há quanto tempo cada pessoa ativa foi admitida, agrupado em faixas (menos de 3
                      meses, 3–6 meses, 6–12 meses, 1–2 anos, 2+ anos).
                    </Item>
                  </dl>

                  <p className="mt-4 rounded-xl bg-enjoei-mist/50 px-4 py-3 text-xs leading-relaxed text-muted-foreground">
                    🔢 <b className="text-foreground">Exemplo:</b> se no mês houve{" "}
                    <b className="text-foreground">2 desligamentos</b> e, nos dias registrados, a
                    equipe teve em média <b className="text-foreground">20 pessoas</b>, o turnover é
                    2 ÷ 20 × 100 = <b className="text-foreground">10%</b>.
                  </p>
                </Secao>

                <section className="rounded-2xl border border-amber-200/70 bg-amber-50/60 p-4 text-xs leading-relaxed text-muted-foreground">
                  <b className="text-foreground">Observação:</b> quando o mês ainda não tem nenhum
                  dia registrado, a taxa de turnover aparece como{" "}
                  <b className="text-foreground">—</b> (não como 0%), porque não há quadro médio
                  para servir de base.
                </section>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  )
}
