"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Clock, Plus, MapPin, UserPlus, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Combobox, type ComboOption } from "@/components/ui/Combobox"
import { ToastProvider, useToast } from "@/components/ui/toast"
import { postJson, delJson } from "@/components/epi/api"
import { QrLinkPublico } from "@/components/epi/QrLinkPublico"

type ClienteView = { id: number; nome: string; crs: string[] }
type Responsavel = { id: number; nome: string; authUserId: string }
type TurnoView = {
  id: number
  cr: string
  nome: string
  diasSemana: number[]
  ativo: boolean
  tokenPublico: string | null
  responsaveis: Responsavel[]
}

const DIAS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"]

export function TurnosManager(props: {
  clientes: ClienteView[]
  selecionadoId: number | null
  turnos: TurnoView[]
}) {
  return (
    <ToastProvider>
      <Inner {...props} />
    </ToastProvider>
  )
}

function Inner({
  clientes,
  selecionadoId,
  turnos,
}: {
  clientes: ClienteView[]
  selecionadoId: number | null
  turnos: TurnoView[]
}) {
  const router = useRouter()
  const cliente = clientes.find((c) => c.id === selecionadoId) ?? null

  const opcoesCliente: ComboOption[] = clientes.map((c) => ({ value: String(c.id), label: c.nome }))

  if (clientes.length === 0) {
    return (
      <div className="glass rounded-3xl p-10 text-center text-sm text-muted-foreground">
        Cadastre um cliente e vincule CRs primeiro, na tela <strong>Clientes e CRs</strong>.
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="glass flex flex-wrap items-end gap-3 rounded-3xl p-6">
        <div className="min-w-[260px] flex-1">
          <label className="mb-1.5 block text-sm font-medium text-navy">Cliente</label>
          <Combobox
            value={selecionadoId ? String(selecionadoId) : null}
            onChange={(v) => router.push(`/dashboards/epi/turnos${v ? `?cliente=${v}` : ""}`)}
            options={opcoesCliente}
            placeholder="Escolher cliente…"
            ariaLabel="Cliente"
          />
        </div>
      </div>

      {cliente && cliente.crs.length === 0 ? (
        <div className="glass rounded-3xl p-10 text-center text-sm text-muted-foreground">
          Este cliente ainda não tem CRs vinculados.
        </div>
      ) : (
        <div className="space-y-5">
          {cliente?.crs.map((cr) => (
            <CrTurnos
              key={cr}
              clienteId={cliente.id}
              cr={cr}
              turnos={turnos.filter((t) => t.cr === cr)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function CrTurnos({ clienteId, cr, turnos }: { clienteId: number; cr: string; turnos: TurnoView[] }) {
  return (
    <div className="glass rounded-3xl p-6">
      <div className="flex items-center gap-2">
        <MapPin className="h-4 w-4 text-teal" />
        <h3 className="font-display text-base font-semibold text-navy">{cr}</h3>
        <Badge variant="neutral">{turnos.length} turno(s)</Badge>
      </div>

      <div className="mt-4 space-y-3">
        {turnos.map((t) => (
          <TurnoCard key={t.id} turno={t} />
        ))}
      </div>

      <NovoTurno clienteId={clienteId} cr={cr} />
    </div>
  )
}

function TurnoCard({ turno }: { turno: TurnoView }) {
  const router = useRouter()
  const { sucesso, erro } = useToast()
  const [authUserId, setAuthUserId] = React.useState("")
  const [nome, setNome] = React.useState("")
  const [ocupado, setOcupado] = React.useState(false)

  async function adicionar(e: React.FormEvent) {
    e.preventDefault()
    if (!authUserId.trim() || !nome.trim()) return
    setOcupado(true)
    try {
      await postJson("/api/epi/responsaveis", {
        turnoId: turno.id,
        authUserId: authUserId.trim(),
        nome: nome.trim(),
      })
      sucesso("Líder adicionado", nome.trim())
      setAuthUserId("")
      setNome("")
      router.refresh()
    } catch (err) {
      erro("Não foi possível adicionar", (err as Error).message)
    } finally {
      setOcupado(false)
    }
  }

  async function remover(id: number, nomeResp: string) {
    setOcupado(true)
    try {
      await delJson(`/api/epi/responsaveis/${id}`)
      sucesso("Líder removido", nomeResp)
      router.refresh()
    } catch (err) {
      erro("Não foi possível remover", (err as Error).message)
    } finally {
      setOcupado(false)
    }
  }

  return (
    <div className="rounded-2xl border border-border/60 bg-white/70 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <Clock className="h-4 w-4 text-navy" />
        <span className="font-medium text-navy">{turno.nome}</span>
        <div className="flex gap-1">
          {DIAS.map((d, i) => (
            <span
              key={d}
              className={
                turno.diasSemana.includes(i)
                  ? "rounded-md bg-teal px-1.5 py-0.5 text-[10px] font-semibold text-white"
                  : "rounded-md bg-navy/8 px-1.5 py-0.5 text-[10px] text-muted-foreground"
              }
            >
              {d}
            </span>
          ))}
        </div>
        {!turno.ativo && <Badge variant="warn">Inativo</Badge>}
      </div>

      {turno.tokenPublico && <QrLinkPublico token={turno.tokenPublico} compacto className="mt-3" />}

      <ul className="mt-3 space-y-1.5">
        {turno.responsaveis.length === 0 ? (
          <li className="text-xs text-muted-foreground">Sem líder responsável ainda.</li>
        ) : (
          turno.responsaveis.map((r) => (
            <li key={r.id} className="flex items-center gap-2 text-sm">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-inhaus-grad text-[10px] font-semibold text-white">
                {r.nome.charAt(0).toUpperCase()}
              </span>
              <span className="flex-1 text-foreground">{r.nome}</span>
              <button
                type="button"
                onClick={() => remover(r.id, r.nome)}
                disabled={ocupado}
                className="rounded-lg p-1 text-muted-foreground transition-colors hover:bg-red-500/10 hover:text-red-600 disabled:opacity-50"
                aria-label={`Remover ${r.nome}`}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </li>
          ))
        )}
      </ul>

      <form onSubmit={adicionar} className="mt-3 flex flex-wrap items-end gap-2">
        <div className="min-w-[150px] flex-1">
          <Input
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder="Nome do líder"
            className="h-9"
          />
        </div>
        <div className="min-w-[150px] flex-1">
          <Input
            value={authUserId}
            onChange={(e) => setAuthUserId(e.target.value)}
            placeholder="ID do usuário (global_auth)"
            className="h-9"
          />
        </div>
        <Button type="submit" variant="outline" size="sm" disabled={ocupado || !authUserId.trim() || !nome.trim()}>
          <UserPlus className="h-4 w-4" />
          Líder
        </Button>
      </form>
    </div>
  )
}

function NovoTurno({ clienteId, cr }: { clienteId: number; cr: string }) {
  const router = useRouter()
  const { sucesso, erro } = useToast()
  const [nome, setNome] = React.useState("")
  const [dias, setDias] = React.useState<number[]>([1, 2, 3, 4, 5])
  const [ocupado, setOcupado] = React.useState(false)

  function alternarDia(i: number) {
    setDias((atual) => (atual.includes(i) ? atual.filter((d) => d !== i) : [...atual, i].sort()))
  }

  async function criar(e: React.FormEvent) {
    e.preventDefault()
    if (!nome.trim() || dias.length === 0) return
    setOcupado(true)
    try {
      await postJson("/api/epi/turnos", { clienteId, cr, nome: nome.trim(), diasSemana: dias })
      sucesso("Turno criado", nome.trim())
      setNome("")
      setDias([1, 2, 3, 4, 5])
      router.refresh()
    } catch (err) {
      erro("Não foi possível criar o turno", (err as Error).message)
    } finally {
      setOcupado(false)
    }
  }

  return (
    <form onSubmit={criar} className="mt-4 rounded-2xl border border-dashed border-navy/20 p-4">
      <p className="mb-2 text-sm font-medium text-navy">Novo turno neste CR</p>
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-[180px] flex-1">
          <Input
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder="Nome do turno (ex.: 1º turno)"
          />
        </div>
        <div className="flex flex-wrap gap-1">
          {DIAS.map((d, i) => (
            <button
              key={d}
              type="button"
              onClick={() => alternarDia(i)}
              className={
                dias.includes(i)
                  ? "rounded-lg bg-teal px-2.5 py-2 text-xs font-semibold text-white"
                  : "rounded-lg border border-navy/15 bg-white/70 px-2.5 py-2 text-xs text-muted-foreground hover:border-teal/40"
              }
            >
              {d}
            </button>
          ))}
        </div>
        <Button type="submit" variant="gradient" disabled={ocupado || !nome.trim() || dias.length === 0}>
          <Plus className="h-4 w-4" />
          Criar turno
        </Button>
      </div>
    </form>
  )
}
