"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

type Responsavel = { id: string; nome: string }

export function CriarTreinamento({ responsaveis }: { responsaveis: Responsavel[] }) {
  const router = useRouter()
  const [nome, setNome] = useState("")
  const [data, setData] = useState("")
  const [duracaoHoras, setDuracao] = useState("")
  const [responsavelId, setResponsavelId] = useState("")
  const [erro, setErro] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  async function criar(e: React.FormEvent) {
    e.preventDefault()
    setErro(null)
    setEnviando(true)
    try {
      const resp = await fetch("/api/treinamentos", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ nome, data, duracaoHoras, responsavelId }),
      })
      const dados = await resp.json()
      if (!resp.ok) {
        setErro(dados.error ?? "Erro ao criar")
        return
      }
      router.push(`/dashboards/rh/treinamentos/${dados.id}`)
    } finally {
      setEnviando(false)
    }
  }

  return (
    <form onSubmit={criar} className="glass rounded-3xl p-6 space-y-4">
      <h3 className="font-semibold text-navy">Novo treinamento</h3>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1 sm:col-span-2">
          <Label htmlFor="nome">Nome</Label>
          <Input id="nome" value={nome} onChange={(e) => setNome(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="data">Data</Label>
          <Input id="data" type="date" value={data} onChange={(e) => setData(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="dur">Duração (horas)</Label>
          <Input id="dur" type="number" step="0.5" min="0.5" value={duracaoHoras} onChange={(e) => setDuracao(e.target.value)} />
        </div>
        <div className="space-y-1 sm:col-span-2">
          <Label htmlFor="resp">Responsável</Label>
          <select
            id="resp"
            className="w-full rounded-xl border border-navy/20 bg-white/80 px-3 py-2 text-navy"
            value={responsavelId}
            onChange={(e) => setResponsavelId(e.target.value)}
          >
            <option value="">Selecione…</option>
            {responsaveis.map((r) => (
              <option key={r.id} value={r.id}>{r.nome}</option>
            ))}
          </select>
        </div>
      </div>
      {erro && <p className="text-sm text-red-600">{erro}</p>}
      <Button type="submit" disabled={enviando || !responsavelId}>
        {enviando ? "Criando..." : "Criar e gerar QR"}
      </Button>
    </form>
  )
}
