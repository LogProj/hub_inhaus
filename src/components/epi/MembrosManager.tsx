"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { UserCog, Plus, Trash2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Combobox, type ComboOption } from "@/components/ui/Combobox"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { ToastProvider, useToast } from "@/components/ui/toast"
import { postJson, delJson } from "@/components/epi/api"

type Membro = {
  id: number
  authUserId: string
  papel: string
  clienteId: number | null
  cr: string | null
}
type ClienteView = { id: number; nome: string; crs: string[] }

export function MembrosManager(props: { membros: Membro[]; clientes: ClienteView[] }) {
  return (
    <ToastProvider>
      <Inner {...props} />
    </ToastProvider>
  )
}

function Inner({ membros, clientes }: { membros: Membro[]; clientes: ClienteView[] }) {
  const router = useRouter()
  const { sucesso, erro } = useToast()

  const [authUserId, setAuthUserId] = React.useState("")
  const [papel, setPapel] = React.useState<string | null>("PARAMETRIZADOR")
  const [clienteId, setClienteId] = React.useState<string | null>(null)
  const [cr, setCr] = React.useState<string | null>(null)
  const [ocupado, setOcupado] = React.useState(false)

  const clienteSel = clientes.find((c) => String(c.id) === clienteId) ?? null
  const nomeCliente = (id: number | null) => clientes.find((c) => c.id === id)?.nome ?? null

  const opcoesPapel: ComboOption[] = [
    { value: "PARAMETRIZADOR", label: "Parametrizador" },
    { value: "LIDER", label: "Líder" },
  ]
  const opcoesCliente: ComboOption[] = clientes.map((c) => ({ value: String(c.id), label: c.nome }))
  const opcoesCr: ComboOption[] = (clienteSel?.crs ?? []).map((c) => ({ value: c, label: c }))

  async function conceder(e: React.FormEvent) {
    e.preventDefault()
    if (!authUserId.trim() || !papel) return
    setOcupado(true)
    try {
      await postJson("/api/epi/membros", {
        authUserId: authUserId.trim(),
        papel,
        clienteId: clienteId ? Number(clienteId) : null,
        cr: cr ?? null,
      })
      sucesso("Papel concedido")
      setAuthUserId("")
      setClienteId(null)
      setCr(null)
      router.refresh()
    } catch (err) {
      erro("Não foi possível conceder", (err as Error).message)
    } finally {
      setOcupado(false)
    }
  }

  async function revogar(id: number) {
    setOcupado(true)
    try {
      await delJson(`/api/epi/membros/${id}`)
      sucesso("Papel revogado")
      router.refresh()
    } catch (err) {
      erro("Não foi possível revogar", (err as Error).message)
    } finally {
      setOcupado(false)
    }
  }

  return (
    <div className="space-y-6">
      <form onSubmit={conceder} className="glass rounded-3xl p-6">
        <p className="mb-3 flex items-center gap-2 text-sm font-semibold text-navy">
          <UserCog className="h-4 w-4" /> Conceder papel
        </p>
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-navy">ID do usuário (global_auth)</label>
            <Input value={authUserId} onChange={(e) => setAuthUserId(e.target.value)} placeholder="UUID do usuário" />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-navy">Papel</label>
            <Combobox value={papel} onChange={setPapel} options={opcoesPapel} ariaLabel="Papel" />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-navy">Cliente (opcional)</label>
            <Combobox
              value={clienteId}
              onChange={(v) => {
                setClienteId(v)
                setCr(null)
              }}
              options={opcoesCliente}
              placeholder="Todos"
              allowClear
              clearLabel="Todos os clientes"
              ariaLabel="Cliente do escopo"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-navy">CR (opcional)</label>
            <Combobox
              value={cr}
              onChange={setCr}
              options={opcoesCr}
              placeholder={clienteSel ? "Todos do cliente" : "Escolha um cliente"}
              allowClear
              clearLabel="Todos os CRs"
              ariaLabel="CR do escopo"
            />
          </div>
        </div>
        <div className="mt-4">
          <Button type="submit" variant="gradient" disabled={ocupado || !authUserId.trim() || !papel}>
            <Plus className="h-4 w-4" />
            Conceder papel
          </Button>
        </div>
      </form>

      {membros.length === 0 ? (
        <div className="glass rounded-3xl p-10 text-center text-sm text-muted-foreground">
          Nenhum papel concedido ainda. O administrador do hub já tem acesso total.
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Usuário</TableHead>
              <TableHead>Papel</TableHead>
              <TableHead>Escopo</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {membros.map((m) => (
              <TableRow key={m.id}>
                <TableCell className="font-mono text-xs">{m.authUserId}</TableCell>
                <TableCell>
                  <Badge variant={m.papel === "LIDER" ? "teal" : "neutral"}>
                    {m.papel === "LIDER" ? "Líder" : "Parametrizador"}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {m.cr ?? nomeCliente(m.clienteId) ?? "Todos"}
                </TableCell>
                <TableCell className="text-right">
                  <button
                    type="button"
                    onClick={() => revogar(m.id)}
                    disabled={ocupado}
                    className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-sm text-muted-foreground transition-colors hover:bg-red-500/10 hover:text-red-600 disabled:opacity-50"
                  >
                    <Trash2 className="h-4 w-4" /> Revogar
                  </button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  )
}
