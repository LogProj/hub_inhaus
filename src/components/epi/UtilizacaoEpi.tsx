"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { UserRound, CheckCircle2, XCircle, UserX, ClipboardCheck } from "lucide-react"

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
    <div className="space-y-6">
      {/* seletores */}
      <div className="glass flex flex-wrap items-end gap-4 rounded-3xl p-5">
        <div className="min-w-[280px]">
          <label className="mb-1.5 block text-xs font-medium text-navy">Turno</label>
          <Combobox
            value={turnoId ? String(turnoId) : null}
            onChange={(v) => irPara(v ? Number(v) : null, dataIso)}
            options={turnos.map((t) => ({ value: String(t.id), label: `${crCurto(t.cr)} · ${t.nome}` }))}
            placeholder="Escolha o turno…"
            ariaLabel="Turno"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-medium text-navy">Dia</label>
          <input
            type="date"
            value={dataIso}
            max={hoje}
            onChange={(e) => e.target.value && irPara(turnoId, e.target.value)}
            className="h-10 rounded-xl border border-input bg-white/80 px-3 text-sm text-foreground focus:border-teal/50 focus:outline-none focus:ring-2 focus:ring-teal/20"
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
              {grade.registrada && <span className="ml-2 rounded-full bg-emerald-500/12 px-2 py-0.5 text-xs font-medium text-emerald-700">registrado</span>}
            </p>
            <span className="flex-1" />
            <Button type="button" variant="outline" size="sm" onClick={marcarTodosConformes}>
              <CheckCircle2 className="h-4 w-4" /> Todos conformes
            </Button>
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
                      onClick={() => setLinha(l.cpfHash, (cur) => ({ ...cur, ausente: !cur.ausente }))}
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                        e.ausente ? "bg-navy text-white" : "border border-navy/15 bg-white/70 text-muted-foreground hover:bg-navy/5",
                      )}
                    >
                      <UserX className="h-3.5 w-3.5" /> Ausente
                    </button>
                  </div>

                  {!e.ausente && (
                    <div className="mt-3 flex flex-wrap gap-2 border-t border-navy/5 pt-3">
                      {grade.epis.map((epi) => {
                        const v = e.respostas[epi.id]
                        return (
                          <div key={epi.id} className="flex items-center gap-1.5 rounded-2xl border border-border/60 bg-white/60 px-2.5 py-1.5">
                            <span className="text-xs font-medium text-navy">{epi.nome}</span>
                            <button
                              type="button"
                              aria-label={`${epi.nome} conforme`}
                              onClick={() => setLinha(l.cpfHash, (cur) => ({ ...cur, respostas: { ...cur.respostas, [epi.id]: true } }))}
                              className={cn("rounded-lg p-1 transition-colors", v === true ? "bg-emerald-500 text-white" : "text-muted-foreground hover:bg-emerald-500/10 hover:text-emerald-600")}
                            >
                              <CheckCircle2 className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              aria-label={`${epi.nome} não conforme`}
                              onClick={() => setLinha(l.cpfHash, (cur) => ({ ...cur, respostas: { ...cur.respostas, [epi.id]: false } }))}
                              className={cn("rounded-lg p-1 transition-colors", v === false ? "bg-red-500 text-white" : "text-muted-foreground hover:bg-red-500/10 hover:text-red-600")}
                            >
                              <XCircle className="h-4 w-4" />
                            </button>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          <div className="flex justify-end">
            <Button type="button" variant="gradient" onClick={registrar} disabled={ocupado}>
              <ClipboardCheck className="h-4 w-4" /> {ocupado ? "Registrando…" : grade.registrada ? "Atualizar registro" : "Registrar utilização"}
            </Button>
          </div>
        </>
      )}
    </div>
  )
}
