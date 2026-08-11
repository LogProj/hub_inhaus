"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  MapPin,
  Clock,
  ClipboardList,
  Users,
  CircleCheck,
  Plus,
  Trash2,
  ArrowLeft,
  ArrowRight,
  Info,
  Check,
  UserRound,
  Building2,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Combobox } from "@/components/ui/Combobox"
import { ToastProvider, useToast } from "@/components/ui/toast"
import { tituloNome } from "@/lib/nomes"
import { postJson } from "@/components/epi/api"
import { cn } from "@/lib/utils"

type CrDisponivel = { cr: string; ativos: number; cliente: string | null }
type Lider = { authUserId: string; nome: string }
type Checklist = { id: number; nome: string }
type TurnoForm = { key: string; nome: string; dias: number[] }
type TurnoCriado = { id: number; nome: string; token: string | null }
type Colaborador = { cpfHash: string; nome: string; cargo: string | null; matricula: string | null }

const PASSOS = [
  { n: 1, rotulo: "CR", icone: MapPin },
  { n: 2, rotulo: "Turnos", icone: Clock },
  { n: 3, rotulo: "Checklist", icone: ClipboardList },
  { n: 4, rotulo: "Pessoas", icone: Users },
]

const DIAS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"]

// Turnos são padronizados — dropdown fixo (não é texto livre).
const OPCOES_TURNO = ["Turno 1", "Turno 2", "Turno 3", "Administrativo"]

function novoId(): string {
  try {
    return crypto.randomUUID()
  } catch {
    return `i-${Date.now()}-${Math.floor(performance.now())}`
  }
}

function mesmoConjunto(a: number[], b: number[]): boolean {
  if (a.length !== b.length) return false
  const s = new Set(a)
  return b.every((x) => s.has(x))
}

export function AssistenteConfiguracao(props: {
  crsDisponiveis: CrDisponivel[]
  checklists: Checklist[]
}) {
  return (
    <ToastProvider>
      <Assistente {...props} />
    </ToastProvider>
  )
}

function Assistente({ crsDisponiveis, checklists }: {
  crsDisponiveis: CrDisponivel[]
  checklists: Checklist[]
}) {
  const router = useRouter()
  const { erro } = useToast()

  const [etapa, setEtapa] = React.useState(1)
  const [ocupado, setOcupado] = React.useState(false)

  const [clienteId, setClienteId] = React.useState<number | null>(null)
  const [clienteNome, setClienteNome] = React.useState("")
  const [cr, setCr] = React.useState<string | null>(null)
  const [turnosCriados, setTurnosCriados] = React.useState<TurnoCriado[]>([])

  // ----- passo 1: setor (escolher o CR resolve o cliente via dm_cr) -----
  const [crSelecionado, setCrSelecionado] = React.useState<string | null>(null)
  const clienteDoCrSelecionado =
    crsDisponiveis.find((c) => c.cr === crSelecionado)?.cliente ?? null

  async function continuarSetor() {
    if (!crSelecionado) return
    setOcupado(true)
    try {
      const r = (await postJson("/api/epi/setor", { cr: crSelecionado })) as {
        clienteId: number
        clienteNome: string
        cr: string
      }
      setClienteId(r.clienteId)
      setClienteNome(r.clienteNome)
      setCr(r.cr)
      setEtapa(2)
    } catch (e) {
      erro("Não foi possível salvar o setor", (e as Error).message)
    } finally {
      setOcupado(false)
    }
  }

  // ----- passo 2: turnos (vários). O líder responsável é DERIVADO do CR (os que
  // foram vinculados na tela de Líderes) — aqui é só exibição, não cadastro. -----
  const [lideresDoCr, setLideresDoCr] = React.useState<Lider[]>([])
  const [carregandoLideres, setCarregandoLideres] = React.useState(false)
  const [turnoForms, setTurnoForms] = React.useState<TurnoForm[]>([
    { key: novoId(), nome: "", dias: [1, 2, 3, 4, 5] },
  ])

  React.useEffect(() => {
    if (etapa !== 2 || !cr) return
    setCarregandoLideres(true)
    fetch(`/api/epi/lideres?cr=${encodeURIComponent(cr)}`)
      .then((r) => r.json())
      .then((d) => setLideresDoCr((d.lideres as Lider[]) ?? []))
      .catch(() => setLideresDoCr([]))
      .finally(() => setCarregandoLideres(false))
  }, [etapa, cr])

  const turnosValidos = turnoForms.filter((t) => t.nome.trim() && t.dias.length > 0)

  async function continuarTurnos() {
    if (turnosValidos.length === 0) {
      erro("Nenhum turno", "Escolha o turno e os dias de ao menos um turno.")
      return
    }
    setOcupado(true)
    try {
      const criados: TurnoCriado[] = []
      for (const t of turnosValidos) {
        const r = (await postJson("/api/epi/turnos", {
          clienteId,
          cr,
          nome: t.nome.trim(),
          diasSemana: t.dias,
        })) as { id: number; nome: string; tokenPublico: string | null }
        criados.push({ id: r.id, nome: r.nome, token: r.tokenPublico })
      }
      setTurnosCriados(criados)
      setEtapa(3)
    } catch (e) {
      erro("Não foi possível criar os turnos", (e as Error).message)
    } finally {
      setOcupado(false)
    }
  }

  // ----- passo 3: vincular um checklist da biblioteca (criar é só na aba Checklists) -----
  const [checklistId, setChecklistId] = React.useState<string | null>(null)

  async function continuarChecklist() {
    if (!cr) return
    if (!checklistId) {
      erro("Escolha um checklist", "Selecione um checklist da biblioteca.")
      return
    }
    setOcupado(true)
    try {
      await postJson("/api/epi/crs/checklist", { cr, checklistTemplateId: Number(checklistId) })
      setEtapa(4)
    } catch (e) {
      erro("Não foi possível vincular o checklist", (e as Error).message)
    } finally {
      setOcupado(false)
    }
  }

  // ----- passo 4: pessoas (aloca cobrindo os vários turnos) -----
  const [roster, setRoster] = React.useState<Colaborador[] | null>(null)
  const [carregandoRoster, setCarregandoRoster] = React.useState(false)
  const [atrib, setAtrib] = React.useState<Record<string, number | null>>({})

  React.useEffect(() => {
    if (etapa !== 4 || !cr || turnosCriados.length === 0) return
    setCarregandoRoster(true)
    fetch(`/api/epi/colaboradores?cr=${encodeURIComponent(cr)}`)
      .then((r) => r.json())
      .then((d) => {
        const lista: Colaborador[] = d.colaboradores ?? []
        setRoster(lista)
        // por padrão, todo mundo no primeiro turno
        const padrao = turnosCriados[0].id
        setAtrib(Object.fromEntries(lista.map((c) => [c.cpfHash, padrao])))
      })
      .catch(() => erro("Não foi possível carregar as pessoas", "Tente novamente."))
      .finally(() => setCarregandoRoster(false))
  }, [etapa, cr, turnosCriados, erro])

  function definirTodos(turnoId: number | null) {
    setAtrib((a) => Object.fromEntries(Object.keys(a).map((k) => [k, turnoId])))
  }

  const totalAlocados = Object.values(atrib).filter((v) => v != null).length

  async function continuarPessoas() {
    if (!cr) return
    const porTurno = new Map<number, Colaborador[]>()
    for (const c of roster ?? []) {
      const tid = atrib[c.cpfHash]
      if (tid == null) continue
      const arr = porTurno.get(tid) ?? []
      arr.push(c)
      porTurno.set(tid, arr)
    }
    if (porTurno.size === 0) {
      erro("Ninguém alocado", "Atribua ao menos uma pessoa a um turno.")
      return
    }
    setOcupado(true)
    try {
      for (const [tid, pessoas] of porTurno) {
        await postJson("/api/epi/atribuicoes", {
          turnoId: tid,
          cr,
          colaboradores: pessoas.map((c) => ({ cpfHash: c.cpfHash, matricula: c.matricula })),
        })
      }
      setEtapa(5)
      router.refresh()
    } catch (e) {
      erro("Não foi possível alocar as pessoas", (e as Error).message)
    } finally {
      setOcupado(false)
    }
  }

  function recomecarSetor() {
    setClienteId(null)
    setClienteNome("")
    setCr(null)
    setCrSelecionado(null)
    setTurnosCriados([])
    setLideresDoCr([])
    setTurnoForms([{ key: novoId(), nome: "", dias: [1, 2, 3, 4, 5] }])
    setChecklistId(null)
    setRoster(null)
    setAtrib({})
    setEtapa(1)
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header>
        <p className="eyebrow flex items-center gap-2">
          <ClipboardList className="h-3.5 w-3.5" />
          EPI · Configuração
        </p>
        <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight text-navy">
          Assistente de configuração
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Configure o controle de EPI por CR. Escolha o CR e o cliente é reconhecido
          automaticamente — depois crie os turnos, vincule um checklist e aloque as pessoas.
        </p>
      </header>

      <Stepper etapa={etapa} />

      <div className="glass rounded-3xl p-6 sm:p-8">
        {etapa === 1 && (
          <Passo titulo="Qual CR vamos configurar?" instrucao="Selecione o CR.">
            <Campo rotulo="CR (da base de colaboradores)">
              <Combobox
                value={crSelecionado}
                onChange={setCrSelecionado}
                options={crsDisponiveis.map((c) => ({
                  value: c.cr,
                  label: `${c.cr}${c.cliente ? `  ·  ${c.cliente}` : ""}  ·  ${c.ativos} pessoas`,
                }))}
                placeholder="Escolha o CR…"
                ariaLabel="CR"
              />
              <p className="mt-1.5 text-xs text-muted-foreground">
                A lista mostra os CRs da base com o cliente e o número de pessoas ativas.
              </p>
            </Campo>

            {clienteDoCrSelecionado && (
              <div className="flex items-center gap-2 rounded-2xl bg-teal-tint/60 px-4 py-3 text-sm text-teal-deep">
                <Building2 className="h-4 w-4 shrink-0" />
                <span>
                  Cliente reconhecido: <strong>{clienteDoCrSelecionado}</strong>
                </span>
              </div>
            )}

            <Navegacao podeContinuar={!!crSelecionado} ocupado={ocupado} onContinuar={continuarSetor} />
          </Passo>
        )}

        {etapa === 2 && (
          <Passo titulo="Crie os turnos deste CR" instrucao="Escolha os turnos deste CR e os dias em que cada um espera preenchimento. Para escalas que rodam todo dia, como 12x36, use “Todos os dias”.">
            <Campo rotulo="Líderes responsáveis por este CR">
              {carregandoLideres ? (
                <p className="text-sm text-muted-foreground">Carregando líderes…</p>
              ) : lideresDoCr.length === 0 ? (
                <p className="rounded-2xl bg-amber-500/10 px-4 py-3 text-sm text-amber-700">
                  Nenhum líder vinculado a este CR ainda. Cadastre na aba <strong>Líderes</strong> — são eles que
                  validam os turnos deste CR.
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {lideresDoCr.map((l) => (
                    <span
                      key={l.authUserId}
                      className="inline-flex items-center gap-1.5 rounded-full bg-teal-tint/60 px-3 py-1 text-sm text-teal-deep"
                    >
                      <UserRound className="h-3.5 w-3.5" /> {tituloNome(l.nome)}
                    </span>
                  ))}
                </div>
              )}
            </Campo>

            <div className="space-y-3">
              {turnoForms.map((t, idx) => (
                <div key={t.key} className="rounded-2xl border border-border/60 bg-white/60 p-4">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-muted-foreground">Turno {idx + 1}</span>
                    <span className="flex-1" />
                    {turnoForms.length > 1 && (
                      <button
                        type="button"
                        onClick={() => setTurnoForms((a) => a.filter((x) => x.key !== t.key))}
                        className="rounded-lg p-1 text-muted-foreground transition-colors hover:bg-red-500/10 hover:text-red-600"
                        aria-label="Remover turno"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                  <div className="mt-2">
                    <Combobox
                      value={t.nome || null}
                      onChange={(v) => setTurnoForms((a) => a.map((x) => (x.key === t.key ? { ...x, nome: v ?? "" } : x)))}
                      options={OPCOES_TURNO.map((o) => ({ value: o, label: o }))}
                      placeholder="Escolha o turno…"
                      ariaLabel="Turno"
                    />
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <PresetDia rotulo="Seg a Sex" ativo={mesmoConjunto(t.dias, [1, 2, 3, 4, 5])} onClick={() => setTurnoForms((a) => a.map((x) => (x.key === t.key ? { ...x, dias: [1, 2, 3, 4, 5] } : x)))} />
                    <PresetDia rotulo="Todos os dias" ativo={mesmoConjunto(t.dias, [0, 1, 2, 3, 4, 5, 6])} onClick={() => setTurnoForms((a) => a.map((x) => (x.key === t.key ? { ...x, dias: [0, 1, 2, 3, 4, 5, 6] } : x)))} />
                    <PresetDia rotulo="Seg a Sáb" ativo={mesmoConjunto(t.dias, [1, 2, 3, 4, 5, 6])} onClick={() => setTurnoForms((a) => a.map((x) => (x.key === t.key ? { ...x, dias: [1, 2, 3, 4, 5, 6] } : x)))} />
                  </div>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {DIAS.map((d, i) => (
                      <button
                        key={d}
                        type="button"
                        onClick={() =>
                          setTurnoForms((a) =>
                            a.map((x) => (x.key === t.key ? { ...x, dias: x.dias.includes(i) ? x.dias.filter((y) => y !== i) : [...x.dias, i].sort() } : x)),
                          )
                        }
                        className={cn(
                          "rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors",
                          t.dias.includes(i) ? "bg-teal text-white" : "border border-navy/15 bg-white/70 text-muted-foreground hover:border-teal/40",
                        )}
                      >
                        {d}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <Button type="button" variant="ghost" size="sm" onClick={() => setTurnoForms((a) => [...a, { key: novoId(), nome: "", dias: [1, 2, 3, 4, 5] }])}>
              <Plus className="h-4 w-4" /> Adicionar outro turno
            </Button>

            <Navegacao onVoltar={() => setEtapa(1)} podeContinuar={turnosValidos.length > 0} ocupado={ocupado} rotuloContinuar={`Criar ${turnosValidos.length || ""} turno(s)`} onContinuar={continuarTurnos} />
          </Passo>
        )}

        {etapa === 3 && (
          <Passo titulo="Vincule o checklist do CR" instrucao="Escolha um checklist já pronto da biblioteca. Novos checklists são criados na aba Checklists.">
            <Campo rotulo="Checklist">
              {checklists.length === 0 ? (
                <p className="rounded-2xl bg-amber-500/10 px-4 py-3 text-sm text-amber-700">
                  Nenhum checklist publicado ainda. Crie um na aba <strong>Checklists</strong> e volte aqui para
                  vinculá-lo a este CR.
                </p>
              ) : (
                <>
                  <Combobox
                    value={checklistId}
                    onChange={setChecklistId}
                    options={checklists.map((c) => ({ value: String(c.id), label: c.nome }))}
                    placeholder="Escolha um checklist…"
                    ariaLabel="Checklist"
                  />
                  <p className="mt-1.5 text-xs text-muted-foreground">
                    Gerencie os checklists na aba <strong>Checklists</strong>.
                  </p>
                </>
              )}
            </Campo>

            <Navegacao onVoltar={() => setEtapa(2)} podeContinuar={!!checklistId} ocupado={ocupado} rotuloContinuar="Vincular e continuar" onContinuar={continuarChecklist} />
          </Passo>
        )}

        {etapa === 4 && (
          <Passo titulo="Aloque as pessoas nos turnos" instrucao="A lista vem do quadro ativo do CR. Defina em qual turno cada pessoa preenche — dá para colocar todos num turno de uma vez e ajustar exceções.">
            {carregandoRoster ? (
              <p className="py-6 text-center text-sm text-muted-foreground">Carregando pessoas…</p>
            ) : !roster || roster.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">Nenhuma pessoa ativa neste CR.</p>
            ) : (
              <>
                <div className="flex flex-wrap items-center gap-2 rounded-2xl bg-teal-tint/50 px-3 py-2 text-sm">
                  <span className="font-medium text-teal-deep">Todos para:</span>
                  {turnosCriados.map((t) => (
                    <button key={t.id} type="button" onClick={() => definirTodos(t.id)} className="rounded-full bg-white/70 px-3 py-1 text-xs font-medium text-teal-deep hover:bg-white">
                      {t.nome}
                    </button>
                  ))}
                  <button type="button" onClick={() => definirTodos(null)} className="rounded-full bg-white/70 px-3 py-1 text-xs font-medium text-muted-foreground hover:bg-white">
                    Ninguém
                  </button>
                  <span className="flex-1" />
                  <span className="text-xs text-muted-foreground">{totalAlocados} de {roster.length} alocadas</span>
                </div>

                <div className="mt-2 max-h-[420px] space-y-1.5 overflow-y-auto rounded-2xl border border-border/60 bg-white/50 p-2">
                  {roster.map((c) => (
                    <div key={c.cpfHash} className="flex flex-wrap items-center gap-2 rounded-xl px-2 py-1.5">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-inhaus-grad text-white">
                        <UserRound className="h-4 w-4" />
                      </span>
                      <span className="min-w-[140px] flex-1">
                        <span className="block text-sm font-medium text-navy">{tituloNome(c.nome)}</span>
                        {c.cargo ? <span className="block text-xs text-muted-foreground">{tituloNome(c.cargo)}</span> : null}
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {turnosCriados.map((t) => {
                          const sel = atrib[c.cpfHash] === t.id
                          return (
                            <button key={t.id} type="button" onClick={() => setAtrib((a) => ({ ...a, [c.cpfHash]: t.id }))} className={cn("rounded-lg px-2.5 py-1 text-xs font-medium transition-colors", sel ? "bg-teal text-white" : "border border-navy/15 bg-white/70 text-muted-foreground hover:border-teal/40")}>
                              {t.nome}
                            </button>
                          )
                        })}
                        <button type="button" onClick={() => setAtrib((a) => ({ ...a, [c.cpfHash]: null }))} className={cn("rounded-lg px-2 py-1 text-xs font-medium transition-colors", atrib[c.cpfHash] == null ? "bg-navy/15 text-navy" : "text-muted-foreground hover:bg-navy/5")}>
                          —
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
            <Navegacao onVoltar={() => setEtapa(3)} podeContinuar={totalAlocados > 0} ocupado={ocupado} rotuloContinuar="Concluir configuração" onContinuar={continuarPessoas} />
          </Passo>
        )}

        {etapa === 5 && (
          <div className="text-center">
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/12 text-emerald-600">
              <CircleCheck className="h-7 w-7" />
            </span>
            <h2 className="mt-4 font-display text-2xl font-semibold text-navy">CR configurado! 🎉</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {turnosCriados.length} turno(s) de <strong>{clienteNome}</strong> prontos. Agora o líder registra a
              <strong> utilização de EPIs</strong> do turno todo dia.
            </p>

            <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
              <Button type="button" variant="outline" onClick={recomecarSetor}>
                <Plus className="h-4 w-4" /> Configurar outro CR
              </Button>
              <Button type="button" variant="ghost" asChild>
                <Link href="/dashboards/epi/utilizacao">Ir para Utilização de EPIs</Link>
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function Stepper({ etapa }: { etapa: number }) {
  return (
    <div className="flex items-center gap-1.5">
      {PASSOS.map((p, i) => {
        const feito = etapa > p.n
        const atual = etapa === p.n
        return (
          <React.Fragment key={p.n}>
            <div className="flex flex-1 flex-col items-center gap-1.5">
              <span className={cn("flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold transition-colors", feito ? "bg-emerald-500 text-white" : atual ? "bg-inhaus-grad text-white" : "bg-navy/8 text-muted-foreground")}>
                {feito ? <Check className="h-4 w-4" /> : <p.icone className="h-4 w-4" />}
              </span>
              <span className={cn("text-[11px] font-medium", atual ? "text-navy" : "text-muted-foreground")}>{p.rotulo}</span>
            </div>
            {i < PASSOS.length - 1 && <span className={cn("mb-5 h-0.5 flex-1", etapa > p.n ? "bg-emerald-400" : "bg-navy/10")} />}
          </React.Fragment>
        )
      })}
    </div>
  )
}

function Passo({ titulo, instrucao, children }: { titulo: string; instrucao: string; children: React.ReactNode }) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-display text-xl font-semibold text-navy">{titulo}</h2>
        <div className="mt-2 flex items-start gap-2 rounded-2xl bg-teal-tint/60 px-4 py-3">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-teal-deep" />
          <p className="text-sm text-teal-deep">{instrucao}</p>
        </div>
      </div>
      {children}
    </div>
  )
}

function Campo({ rotulo, children }: { rotulo: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-navy">{rotulo}</label>
      {children}
    </div>
  )
}

function PresetDia({ rotulo, ativo, onClick }: { rotulo: string; ativo: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className={cn("rounded-full px-3 py-1 text-xs font-medium transition-colors", ativo ? "bg-teal text-white" : "border border-teal/30 bg-teal-tint/40 text-teal-deep hover:bg-teal-tint")}>
      {rotulo}
    </button>
  )
}

function Navegacao({ onVoltar, onContinuar, podeContinuar, ocupado, rotuloContinuar = "Continuar" }: { onVoltar?: () => void; onContinuar: () => void; podeContinuar: boolean; ocupado: boolean; rotuloContinuar?: string }) {
  return (
    <div className="flex items-center justify-between pt-2">
      {onVoltar ? (
        <Button type="button" variant="ghost" onClick={onVoltar} disabled={ocupado}>
          <ArrowLeft className="h-4 w-4" /> Voltar
        </Button>
      ) : (
        <span />
      )}
      <Button type="button" variant="gradient" onClick={onContinuar} disabled={!podeContinuar || ocupado}>
        {ocupado ? "Salvando…" : rotuloContinuar}
        {!ocupado && <ArrowRight className="h-4 w-4" />}
      </Button>
    </div>
  )
}
