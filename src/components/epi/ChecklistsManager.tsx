"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { ClipboardList, Plus, Trash2, CheckCircle2, FileEdit, Pencil, X, Check } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { ToastProvider, useToast } from "@/components/ui/toast"
import { postJson, patchJson, delJson } from "@/components/epi/api"

type VersaoView = { id: number; versao: number; publicado: boolean; itens: number }
type ItemAtual = { pergunta: string; epi: string; obrigatorio: boolean }
type ChecklistView = {
  id: number
  nome: string
  emUso: number
  itensAtuais: ItemAtual[]
  versoes: VersaoView[]
}
type ItemEdicao = { id: string; pergunta: string; epi: string; obrigatorio: boolean }

function novoId(): string {
  try {
    return crypto.randomUUID()
  } catch {
    return `item-${Date.now()}-${Math.floor(performance.now())}`
  }
}

export function ChecklistsManager({ checklists }: { checklists: ChecklistView[] }) {
  return (
    <ToastProvider>
      <Inner checklists={checklists} />
    </ToastProvider>
  )
}

function Inner({ checklists }: { checklists: ChecklistView[] }) {
  const router = useRouter()
  const { sucesso, erro } = useToast()
  const [nome, setNome] = React.useState("")
  const [salvando, setSalvando] = React.useState(false)

  async function criar(e: React.FormEvent) {
    e.preventDefault()
    if (!nome.trim()) return
    setSalvando(true)
    try {
      await postJson("/api/epi/templates", { nome: nome.trim() })
      sucesso("Checklist criado", nome.trim())
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
      <form onSubmit={criar} className="glass flex flex-wrap items-end gap-3 rounded-3xl p-6">
        <div className="min-w-[240px] flex-1">
          <label className="mb-1.5 block text-sm font-medium text-navy">Novo checklist</label>
          <Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex.: Checklist de EPI — Armazém" maxLength={120} />
        </div>
        <Button type="submit" variant="gradient" disabled={salvando || !nome.trim()}>
          <Plus className="h-4 w-4" />
          {salvando ? "Criando…" : "Criar checklist"}
        </Button>
      </form>

      {checklists.length === 0 ? (
        <div className="glass rounded-3xl p-10 text-center text-sm text-muted-foreground">
          Nenhum checklist na biblioteca ainda. Crie o primeiro acima.
        </div>
      ) : (
        <div className="space-y-5">
          {checklists.map((c) => (
            <ChecklistCard key={c.id} checklist={c} />
          ))}
        </div>
      )}
    </div>
  )
}

function ChecklistCard({ checklist }: { checklist: ChecklistView }) {
  const router = useRouter()
  const { sucesso, erro } = useToast()
  const [editando, setEditando] = React.useState(false)
  const [itens, setItens] = React.useState<ItemEdicao[]>([])
  const [ocupado, setOcupado] = React.useState(false)

  const [renomeando, setRenomeando] = React.useState(false)
  const [nomeEdit, setNomeEdit] = React.useState(checklist.nome)

  const temPublicada = checklist.versoes.some((v) => v.publicado)

  function abrirEditor() {
    // pré-carrega os itens da versão atual (edita em cima), ou começa com um item.
    const base: ItemEdicao[] =
      checklist.itensAtuais.length > 0
        ? checklist.itensAtuais.map((i) => ({ id: novoId(), ...i }))
        : [{ id: novoId(), pergunta: "", epi: "", obrigatorio: true }]
    setItens(base)
    setEditando(true)
  }

  async function salvarVersao() {
    const validos = itens.filter((it) => it.pergunta.trim())
    if (validos.length === 0) {
      erro("Checklist vazio", "Adicione ao menos um item com pergunta.")
      return
    }
    setOcupado(true)
    try {
      const ver = (await postJson("/api/epi/versoes", {
        templateId: checklist.id,
        itens: validos.map((it) => ({
          id: it.id,
          rotulo: it.pergunta.trim(),
          epi: it.epi.trim() || undefined,
          obrigatorio: it.obrigatorio,
        })),
      })) as { id: number }
      await postJson(`/api/epi/versoes/${ver.id}/publicar`, {})
      sucesso("Versão publicada", "Os setores que usam este checklist passam a usar a nova versão.")
      setEditando(false)
      router.refresh()
    } catch (err) {
      erro("Não foi possível salvar", (err as Error).message)
    } finally {
      setOcupado(false)
    }
  }

  async function renomear() {
    if (!nomeEdit.trim() || nomeEdit.trim() === checklist.nome) {
      setRenomeando(false)
      setNomeEdit(checklist.nome)
      return
    }
    setOcupado(true)
    try {
      await patchJson(`/api/epi/templates/${checklist.id}`, { nome: nomeEdit.trim() })
      sucesso("Checklist renomeado")
      setRenomeando(false)
      router.refresh()
    } catch (err) {
      erro("Não foi possível renomear", (err as Error).message)
    } finally {
      setOcupado(false)
    }
  }

  async function excluir() {
    setOcupado(true)
    try {
      await delJson(`/api/epi/templates/${checklist.id}`)
      sucesso("Checklist excluído", checklist.nome)
      router.refresh()
    } catch (err) {
      erro("Não foi possível excluir", (err as Error).message)
    } finally {
      setOcupado(false)
    }
  }

  return (
    <div className="glass rounded-3xl p-6">
      <div className="flex flex-wrap items-center gap-2">
        <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-inhaus-grad text-white">
          <ClipboardList className="h-4 w-4" />
        </span>
        {renomeando ? (
          <div className="flex flex-1 items-center gap-2">
            <Input value={nomeEdit} onChange={(e) => setNomeEdit(e.target.value)} className="h-9" autoFocus />
            <button type="button" onClick={renomear} disabled={ocupado} className="rounded-lg p-1.5 text-emerald-600 hover:bg-emerald-500/10" aria-label="Salvar nome">
              <Check className="h-4 w-4" />
            </button>
            <button type="button" onClick={() => { setRenomeando(false); setNomeEdit(checklist.nome) }} className="rounded-lg p-1.5 text-muted-foreground hover:bg-navy/5" aria-label="Cancelar">
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <>
            <h3 className="flex-1 font-display text-base font-semibold text-navy">{checklist.nome}</h3>
            {temPublicada ? <Badge variant="success">Publicado</Badge> : <Badge variant="warn">Sem versão publicada</Badge>}
            {checklist.emUso > 0 && <Badge variant="teal">{checklist.emUso} setor(es)</Badge>}
            <button type="button" onClick={() => setRenomeando(true)} className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-teal-tint hover:text-navy" aria-label="Renomear">
              <Pencil className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={excluir}
              disabled={ocupado}
              title={checklist.emUso > 0 ? "Em uso — troque o checklist dos setores antes" : "Excluir"}
              className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-red-500/10 hover:text-red-600 disabled:opacity-50"
              aria-label="Excluir"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </>
        )}
      </div>

      <ul className="mt-3 space-y-1.5">
        {checklist.versoes.length === 0 ? (
          <li className="text-sm text-muted-foreground">Nenhuma versão ainda. Monte os itens abaixo.</li>
        ) : (
          checklist.versoes.map((v) => (
            <li key={v.id} className="flex items-center gap-2 rounded-xl border border-border/60 bg-white/70 px-3 py-2">
              <span className="text-sm font-medium text-navy">v{v.versao}</span>
              <span className="text-xs text-muted-foreground">{v.itens} item(ns)</span>
              {v.publicado ? <Badge variant="success">Publicada</Badge> : <Badge variant="warn">Rascunho</Badge>}
            </li>
          ))
        )}
      </ul>

      {editando ? (
        <div className="mt-4 rounded-2xl border border-dashed border-navy/20 p-4">
          <p className="mb-3 text-sm font-medium text-navy">
            {checklist.itensAtuais.length > 0 ? "Editar itens (gera uma nova versão)" : "Itens do checklist"}
          </p>
          <div className="space-y-2">
            {itens.map((it, idx) => (
              <div key={it.id} className="flex flex-wrap items-center gap-2">
                <span className="w-5 text-xs text-muted-foreground">{idx + 1}.</span>
                <Input
                  value={it.pergunta}
                  onChange={(e) => setItens((a) => a.map((x) => (x.id === it.id ? { ...x, pergunta: e.target.value } : x)))}
                  placeholder="Pergunta (ex.: Está usando capacete?)"
                  className="h-9 min-w-[220px] flex-1"
                />
                <Input
                  value={it.epi}
                  onChange={(e) => setItens((a) => a.map((x) => (x.id === it.id ? { ...x, epi: e.target.value } : x)))}
                  placeholder="EPI (opcional)"
                  className="h-9 w-40"
                />
                <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Checkbox
                    checked={it.obrigatorio}
                    onCheckedChange={(v) => setItens((a) => a.map((x) => (x.id === it.id ? { ...x, obrigatorio: v } : x)))}
                  />
                  Obrigatório
                </label>
                <button
                  type="button"
                  onClick={() => setItens((a) => (a.length > 1 ? a.filter((x) => x.id !== it.id) : a))}
                  className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-red-500/10 hover:text-red-600"
                  aria-label="Remover item"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={() => setItens((a) => [...a, { id: novoId(), pergunta: "", epi: "", obrigatorio: true }])}>
              <Plus className="h-4 w-4" /> Adicionar item
            </Button>
            <span className="flex-1" />
            <Button type="button" variant="ghost" size="sm" onClick={() => setEditando(false)}>
              Cancelar
            </Button>
            <Button type="button" variant="gradient" size="sm" disabled={ocupado} onClick={salvarVersao}>
              <CheckCircle2 className="h-4 w-4" /> Publicar versão
            </Button>
          </div>
        </div>
      ) : (
        <Button type="button" variant="outline" size="sm" className="mt-4" onClick={abrirEditor}>
          <FileEdit className="h-4 w-4" /> {temPublicada ? "Editar itens" : "Montar itens"}
        </Button>
      )}
    </div>
  )
}
