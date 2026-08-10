"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Building2, Plus, Trash2, MapPin } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Combobox, type ComboOption } from "@/components/ui/Combobox"
import { ToastProvider, useToast } from "@/components/ui/toast"
import { postJson, delJson } from "@/components/epi/api"

type CrCliente = { id: number; cr: string; ativo: boolean }
type ClienteView = { id: number; nome: string; ativo: boolean; crs: CrCliente[] }
type CrDisponivel = { cr: string; ativos: number }

export function ClientesManager({
  clientesIniciais,
  crsDisponiveis,
}: {
  clientesIniciais: ClienteView[]
  crsDisponiveis: CrDisponivel[]
}) {
  return (
    <ToastProvider>
      <Inner clientesIniciais={clientesIniciais} crsDisponiveis={crsDisponiveis} />
    </ToastProvider>
  )
}

function Inner({
  clientesIniciais,
  crsDisponiveis,
}: {
  clientesIniciais: ClienteView[]
  crsDisponiveis: CrDisponivel[]
}) {
  const router = useRouter()
  const { sucesso, erro } = useToast()
  const [nome, setNome] = React.useState("")
  const [salvando, setSalvando] = React.useState(false)

  const opcoesCr: ComboOption[] = crsDisponiveis.map((c) => ({
    value: c.cr,
    label: `${c.cr}  ·  ${c.ativos} ativos`,
  }))

  async function criarCliente(e: React.FormEvent) {
    e.preventDefault()
    if (!nome.trim()) return
    setSalvando(true)
    try {
      await postJson("/api/epi/clientes", { nome: nome.trim() })
      sucesso("Cliente criado", nome.trim())
      setNome("")
      router.refresh()
    } catch (err) {
      erro("Não foi possível criar", (err as Error).message)
    } finally {
      setSalvando(false)
    }
  }

  return (
    <div className="space-y-6">
      <form
        onSubmit={criarCliente}
        className="glass flex flex-wrap items-end gap-3 rounded-3xl p-6"
      >
        <div className="flex-1 min-w-[240px]">
          <label className="mb-1.5 block text-sm font-medium text-navy">Novo cliente</label>
          <Input
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder="Nome do cliente"
            maxLength={120}
          />
        </div>
        <Button type="submit" variant="gradient" disabled={salvando || !nome.trim()}>
          <Plus className="h-4 w-4" />
          {salvando ? "Criando…" : "Criar cliente"}
        </Button>
      </form>

      {clientesIniciais.length === 0 ? (
        <div className="glass rounded-3xl p-10 text-center text-sm text-muted-foreground">
          Nenhum cliente cadastrado ainda. Crie o primeiro acima para começar.
        </div>
      ) : (
        <div className="grid gap-5 lg:grid-cols-2">
          {clientesIniciais.map((cliente) => (
            <ClienteCard key={cliente.id} cliente={cliente} opcoesCr={opcoesCr} />
          ))}
        </div>
      )}
    </div>
  )
}

function ClienteCard({ cliente, opcoesCr }: { cliente: ClienteView; opcoesCr: ComboOption[] }) {
  const router = useRouter()
  const { sucesso, erro } = useToast()
  const [crSelecionado, setCrSelecionado] = React.useState<string | null>(null)
  const [ocupado, setOcupado] = React.useState(false)

  async function vincularCr() {
    if (!crSelecionado) return
    setOcupado(true)
    try {
      await postJson("/api/epi/crs", { clienteId: cliente.id, cr: crSelecionado })
      sucesso("CR vinculado", crSelecionado)
      setCrSelecionado(null)
      router.refresh()
    } catch (err) {
      erro("Não foi possível vincular", (err as Error).message)
    } finally {
      setOcupado(false)
    }
  }

  async function removerCr(cr: CrCliente) {
    setOcupado(true)
    try {
      await delJson(`/api/epi/crs/${cr.id}`)
      sucesso("CR removido", cr.cr)
      router.refresh()
    } catch (err) {
      erro("Não foi possível remover", (err as Error).message)
    } finally {
      setOcupado(false)
    }
  }

  return (
    <div className="glass rounded-3xl p-6">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-inhaus-grad text-white">
          <Building2 className="h-5 w-5" />
        </span>
        <div className="flex-1">
          <h3 className="font-display text-lg font-semibold text-navy">{cliente.nome}</h3>
          <p className="text-xs text-muted-foreground">
            {cliente.crs.length} {cliente.crs.length === 1 ? "CR vinculado" : "CRs vinculados"}
          </p>
        </div>
        {!cliente.ativo && <Badge variant="warn">Inativo</Badge>}
      </div>

      <ul className="mt-4 space-y-2">
        {cliente.crs.length === 0 ? (
          <li className="rounded-xl border border-dashed border-navy/15 px-3 py-3 text-sm text-muted-foreground">
            Nenhum CR vinculado. Adicione um setor abaixo.
          </li>
        ) : (
          cliente.crs.map((cr) => (
            <li
              key={cr.id}
              className="flex items-center gap-2 rounded-xl border border-border/60 bg-white/70 px-3 py-2"
            >
              <MapPin className="h-4 w-4 shrink-0 text-teal" />
              <span className="flex-1 text-sm text-foreground">{cr.cr}</span>
              <button
                type="button"
                onClick={() => removerCr(cr)}
                disabled={ocupado}
                className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-red-500/10 hover:text-red-600 disabled:opacity-50"
                aria-label={`Remover ${cr.cr}`}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          ))
        )}
      </ul>

      <div className="mt-4 flex items-end gap-2">
        <div className="flex-1">
          <Combobox
            value={crSelecionado}
            onChange={setCrSelecionado}
            options={opcoesCr}
            placeholder="Escolher um CR para vincular…"
            ariaLabel="CR disponível"
          />
        </div>
        <Button type="button" variant="outline" onClick={vincularCr} disabled={ocupado || !crSelecionado}>
          <Plus className="h-4 w-4" />
          Vincular
        </Button>
      </div>
    </div>
  )
}
