"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Pencil } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Combobox } from "@/components/ui/Combobox"
import {
  Dialog,
  DialogContent,
  DialogTrigger,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"

type Responsavel = { id: string; nome: string }

type Props = {
  id: string
  nome: string
  /** Data no formato "YYYY-MM-DD" (para o input date). */
  data: string
  duracaoHoras: number
  responsavelId: string
  responsaveis: Responsavel[]
  /** "botao" (largura cheia, com texto) ou "icone" (compacto, para dentro de tabela). */
  variante?: "botao" | "icone"
}

export function EditarTreinamento({ id, nome, data, duracaoHoras, responsavelId, responsaveis, variante = "botao" }: Props) {
  const router = useRouter()
  const [aberto, setAberto] = useState(false)
  const [n, setNome] = useState(nome)
  const [d, setData] = useState(data)
  const [dur, setDur] = useState(String(duracaoHoras))
  const [resp, setResp] = useState(responsavelId)
  const [erro, setErro] = useState<string | null>(null)
  const [salvando, setSalvando] = useState(false)

  async function salvar(e: React.FormEvent) {
    e.preventDefault()
    setErro(null)
    setSalvando(true)
    try {
      const r = await fetch(`/api/treinamentos/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ nome: n, data: d, duracaoHoras: dur, responsavelId: resp }),
      })
      if (!r.ok) {
        setErro((await r.json()).error ?? "Erro ao salvar")
        return
      }
      setAberto(false)
      router.refresh()
    } finally {
      setSalvando(false)
    }
  }

  return (
    <Dialog open={aberto} onOpenChange={setAberto}>
      <DialogTrigger asChild>
        {variante === "icone" ? (
          <Button variant="ghost" size="icon" aria-label="Editar treinamento">
            <Pencil className="h-4 w-4" />
          </Button>
        ) : (
          <Button variant="outline" className="w-full gap-2">
            <Pencil className="h-4 w-4" />
            Editar treinamento
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar treinamento</DialogTitle>
        </DialogHeader>
        <form onSubmit={salvar} className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="ed-nome">Nome</Label>
            <Input id="ed-nome" value={n} onChange={(e) => setNome(e.target.value)} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="ed-data">Data</Label>
              <Input id="ed-data" type="date" value={d} onChange={(e) => setData(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="ed-dur">Duração (horas)</Label>
              <Input id="ed-dur" type="number" step="0.5" min="0.5" value={dur} onChange={(e) => setDur(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1">
            <Label>Responsável</Label>
            <Combobox
              value={resp || null}
              onChange={(v) => setResp(v ?? "")}
              options={responsaveis.map((r) => ({ value: r.id, label: r.nome }))}
              placeholder="Selecione o responsável"
              ariaLabel="Responsável pelo treinamento"
            />
          </div>
          {erro && <p className="text-sm text-red-600">{erro}</p>}
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setAberto(false)}>Cancelar</Button>
            <Button type="submit" disabled={salvando || !n.trim() || !d || !resp}>
              {salvando ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
