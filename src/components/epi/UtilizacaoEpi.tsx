"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { UserRound, CheckCircle2, XCircle, UserX, ClipboardCheck, ArrowLeft } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Combobox } from "@/components/ui/Combobox"
import { ToastProvider, useToast } from "@/components/ui/toast"
import { tituloNome } from "@/lib/nomes"
import { dataBR } from "@/lib/epi/datas"
import { postJson } from "@/components/epi/api"
import { cn } from "@/lib/utils"

type TurnoUtil = { id: number; nome: string; cr: string; clienteNome: string; diasSemana: number[] }
type Epi = { id: string; nome: string; obrigatorio: boolean }
type Linha = { cpfHash: string; nome: string; cargo: string | null; ausente: boolean; respostas: Record<string, boolean> }
type Grade = {
  turnoId: number
  turnoNome: string
  cr: string
  clienteNome: string
  dataIso: string
  epis: Epi[]
  linhas: Linha[]
  registrada: boolean
  semChecklist: boolean
}

function crCurto(cr: string): string {
  const p = cr.split(" - ")
  const resto = p.slice(1).join(" - ").replace(/^[A-Z]{2} - [A-Z]+ - /, "")
  return resto ? `${p[0]?.trim()} · ${resto}` : p[0]?.trim() ?? cr
}

export function UtilizacaoEpi(props: {
  turnos: TurnoUtil[]
  grade: Grade | null
  dataIso: string
  turnoId: number | null
  hoje: string
}) {
  return (
    <ToastProvider>
      <Inner {...props} />
    </ToastProvider>
  )
}

type EstadoLinha = { ausente: boolean; respostas: Record<string, boolean> }

function Inner({ turnos, grade, dataIso, turnoId, hoje }: {
  turnos: TurnoUtil[]
  grade: Grade | null
  dataIso: string
  turnoId: number | null
  hoje: string
}) {
  const router = useRouter()
  const { sucesso, erro } = useToast()
  const [ocupado, setOcupado] = React.useState(false)
  // Depois de registrar o turno no dia, a grade vira somente leitura (não preenche de novo).
  const bloqueado = !!grade?.registrada

  const [estado, setEstado] = React.useState<Record<string, EstadoLinha>>(() =>
    Object.fromEntries((grade?.linhas ?? []).map((l) => [l.cpfHash, { ausente: l.ausente, respostas: { ...l.respostas } }])),
  )

  function irPara(t: number | null, d: string) {
    const params = new URLSearchParams()
    if (t) params.set("turno", String(t))
    if (d) params.set("data", d)
    router.push(`?${params.toString()}`)
  }

  function setLinha(cpfHash: string, patch: (e: EstadoLinha) => EstadoLinha) {
    setEstado((prev) => ({ ...prev, [cpfHash]: patch(prev[cpfHash] ?? { ausente: false, respostas: {} }) }))
  }

  function marcarTodosConformes() {
    if (!grade) return
    setEstado((prev) => {
      const next = { ...prev }
      for (const l of grade.linhas) {
        const atual = next[l.cpfHash] ?? { ausente: false, respostas: {} }
        if (atual.ausente) continue
        next[l.cpfHash] = { ausente: false, respostas: Object.fromEntries(grade.epis.map((e) => [e.id, true])) }
      }
      return next
    })
  }

  async function registrar() {
    if (!grade) return
    // valida: presentes precisam ter os EPIs obrigatórios respondidos
    const pendentes = grade.linhas.filter((l) => {
      const e = estado[l.cpfHash]
      if (!e || e.ausente) return false
      return grade.epis.some((epi) => epi.obrigatorio && e.respostas[epi.id] === undefined)
    })
    if (pendentes.length > 0) {
      erro("Faltam EPIs", `${pendentes.length} colaborador(es) presente(s) com EPI obrigatório sem resposta.`)
      return
    }
    const entradas = grade.linhas.map((l) => {
      const e = estado[l.cpfHash] ?? { ausente: false, respostas: {} }
      return {
        cpfHash: l.cpfHash,
        ausente: e.ausente,
        respostas: e.ausente
          ? []
          : Object.entries(e.respostas)
              .filter(([, v]) => v !== undefined)
              .map(([epiId, conforme]) => ({ epiId, conforme })),
      }
    })
    setOcupado(true)
    try {
      await postJson("/api/epi/utilizacao", { turnoId: grade.turnoId, data: grade.dataIso, entradas })
      sucesso("Utilização registrada", `${grade.turnoNome} · ${dataBR(grade.dataIso)}`)
      router.refresh()
    } catch (e) {
      erro("Não foi possível registrar", (e as Error).message)
    } finally {
      setOcupado(false)
    }
  }

  if (turnos.length === 0) {
    return (
      <div className="glass rounded-3xl p-10 text-center text-sm text-muted-foreground">
        Você ainda não é líder de nenhum turno. Peça à Segurança para vincular você a um CR na aba <strong>Líderes</strong>.
      </div>
    )
  }

  return (
    <div className="space-y-6 pb-2">
      {/* Voltar para a lista de checklists (útil no mobile, sem sidebar). */}
      <Link
        href="/dashboards/checklists"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-teal"
      >
        <ArrowLeft className="h-4 w-4" /> Checklists
      </Link>

      {/* seletores — empilham no mobile, lado a lado a partir de sm */}
      <div className="glass flex flex-col gap-4 rounded-3xl p-5 sm:flex-row sm:flex-wrap sm:items-end">
        <div className="w-full sm:w-auto sm:min-w-[280px]">
          <label className="mb-1.5 block text-xs font-medium text-navy">Turno</label>
          <Combobox
            value={turnoId ? String(turnoId) : null}
            onChange={(v) => irPara(v ? Number(v) : null, dataIso)}
            options={turnos.map((t) => ({ value: String(t.id), label: `${crCurto(t.cr)} · ${t.nome}` }))}
            placeholder="Escolha o turno…"
            ariaLabel="Turno"
          />
        </div>
        <div className="w-full sm:w-auto">
          <label className="mb-1.5 block text-xs font-medium text-navy">Dia</label>
          <input
            type="date"
            value={dataIso}
            max={hoje}
            onChange={(e) => e.target.value && irPara(turnoId, e.target.value)}
            className="h-11 w-full rounded-xl border border-input bg-white/80 px-3 text-sm text-foreground focus:border-teal/50 focus:outline-none focus:ring-2 focus:ring-teal/20 sm:h-10 sm:w-auto"
          />
        </div>
      </div>

      {!grade ? (
        <div className="glass rounded-3xl p-10 text-center text-sm text-muted-foreground">Escolha um turno.</div>
      ) : grade.semChecklist ? (
        <div className="glass rounded-3xl p-10 text-center text-sm text-amber-700">
          Este CR ainda não tem um <strong>checklist de EPIs</strong> vinculado. A Segurança precisa vincular um na aba <strong>Checklists</strong>.
        </div>
      ) : grade.epis.length === 0 ? (
        <div className="glass rounded-3xl p-10 text-center text-sm text-amber-700">O checklist deste CR não tem EPIs cadastrados.</div>
      ) : grade.linhas.length === 0 ? (
        <div className="glass rounded-3xl p-10 text-center text-sm text-muted-foreground">Nenhum colaborador alocado neste turno.</div>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-sm text-muted-foreground">
              <strong className="text-navy">{crCurto(grade.cr)}</strong> · {grade.turnoNome} · {dataBR(grade.dataIso)} ·{" "}
              {grade.linhas.length} pessoa(s)
            </p>
            <span className="flex-1" />
            {bloqueado ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/12 px-3 py-1 text-sm font-medium text-emerald-700">
                <CheckCircle2 className="h-4 w-4" /> Registrado neste dia — somente leitura
              </span>
            ) : (
              <Button type="button" variant="outline" size="sm" onClick={marcarTodosConformes}>
                <CheckCircle2 className="h-4 w-4" /> Todos conformes
              </Button>
            )}
          </div>

          <div className="space-y-3">
            {grade.linhas.map((l) => {
              const e = estado[l.cpfHash] ?? { ausente: false, respostas: {} }
              return (
                <div key={l.cpfHash} className={cn("glass rounded-3xl p-4 transition-opacity", e.ausente && "opacity-60")}>
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-inhaus-grad text-white">
                      <UserRound className="h-5 w-5" />
                    </span>
                    <div className="min-w-[160px] flex-1">
                      <p className="text-sm font-semibold text-navy">{tituloNome(l.nome)}</p>
                      {l.cargo && <p className="text-xs text-muted-foreground">{tituloNome(l.cargo)}</p>}
                    </div>
                    <button
                      type="button"
                      disabled={bloqueado}
                      onClick={() => setLinha(l.cpfHash, (cur) => ({ ...cur, ausente: !cur.ausente }))}
                      className={cn(
                        "inline-flex min-h-[44px] items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium transition-colors disabled:cursor-default sm:min-h-0 sm:px-3 sm:py-1.5 sm:text-xs",
                        e.ausente ? "bg-navy text-white" : "border border-navy/15 bg-white/70 text-muted-foreground hover:bg-navy/5",
                      )}
                    >
                      <UserX className="h-4 w-4 sm:h-3.5 sm:w-3.5" /> Ausente
                    </button>
                  </div>

                  {!e.ausente && (
                    <div className="mt-3 flex flex-col gap-2 border-t border-navy/5 pt-3 sm:flex-row sm:flex-wrap">
                      {grade.epis.map((epi) => {
                        const v = e.respostas[epi.id]
                        return (
                          <div
                            key={epi.id}
                            className="flex w-full items-center justify-between gap-2 rounded-2xl border border-border/60 bg-white/60 px-3 py-2 sm:w-auto sm:justify-start sm:px-2.5 sm:py-1.5"
                          >
                            <span className="text-sm font-medium text-navy sm:text-xs">{epi.nome}</span>
                            <div className="flex shrink-0 items-center gap-1.5">
                              <button
                                type="button"
                                disabled={bloqueado}
                                aria-label={`${epi.nome} conforme`}
                                aria-pressed={v === true}
                                onClick={() => setLinha(l.cpfHash, (cur) => ({ ...cur, respostas: { ...cur.respostas, [epi.id]: true } }))}
                                className={cn(
                                  "inline-flex h-11 w-11 items-center justify-center rounded-xl transition-colors disabled:cursor-default sm:h-8 sm:w-8 sm:rounded-lg",
                                  v === true ? "bg-emerald-500 text-white" : "text-muted-foreground hover:bg-emerald-500/10 hover:text-emerald-600",
                                )}
                              >
                                <CheckCircle2 className="h-5 w-5 sm:h-4 sm:w-4" />
                              </button>
                              <button
                                type="button"
                                disabled={bloqueado}
                                aria-label={`${epi.nome} não conforme`}
                                aria-pressed={v === false}
                                onClick={() => setLinha(l.cpfHash, (cur) => ({ ...cur, respostas: { ...cur.respostas, [epi.id]: false } }))}
                                className={cn(
                                  "inline-flex h-11 w-11 items-center justify-center rounded-xl transition-colors disabled:cursor-default sm:h-8 sm:w-8 sm:rounded-lg",
                                  v === false ? "bg-red-500 text-white" : "text-muted-foreground hover:bg-red-500/10 hover:text-red-600",
                                )}
                              >
                                <XCircle className="h-5 w-5 sm:h-4 sm:w-4" />
                              </button>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {!bloqueado &&
            (() => {
              const total = grade.linhas.length
              const prontos = grade.linhas.filter((l) => {
                const st = estado[l.cpfHash]
                if (!st) return false
                if (st.ausente) return true
                return grade.epis.every((epi) => !epi.obrigatorio || st.respostas[epi.id] !== undefined)
              }).length
              return (
                <div className="sticky bottom-0 z-20 -mx-4 mt-2 border-t border-navy/10 bg-white/85 px-4 py-3 backdrop-blur sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:px-0 sm:py-0 sm:backdrop-blur-none">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-xs text-muted-foreground sm:hidden">
                      <span className="font-semibold text-navy">{prontos}</span> de {total} prontos
                    </p>
                    <Button
                      type="button"
                      variant="gradient"
                      onClick={registrar}
                      disabled={ocupado}
                      className="w-full sm:ml-auto sm:w-auto"
                    >
                      <ClipboardCheck className="h-4 w-4" /> {ocupado ? "Registrando…" : "Registrar utilização"}
                    </Button>
                  </div>
                </div>
              )
            })()}
        </>
      )}
    </div>
  )
}
