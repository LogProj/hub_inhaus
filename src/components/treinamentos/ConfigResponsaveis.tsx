"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

type Responsavel = { id: string; nome: string }

export function ConfigResponsaveis({ responsaveis }: { responsaveis: Responsavel[] }) {
  const router = useRouter()
  const [aberto, setAberto] = useState(false)
  const [nome, setNome] = useState("")
  const [erro, setErro] = useState<string | null>(null)

  async function adicionar() {
    setErro(null)
    const resp = await fetch("/api/treinamentos/responsaveis", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ nome }),
    })
    if (!resp.ok) {
      setErro((await resp.json()).error ?? "Erro ao adicionar")
      return
    }
    setNome("")
    router.refresh()
  }

  async function remover(id: string) {
    await fetch(`/api/treinamentos/responsaveis/${id}`, { method: "DELETE" })
    router.refresh()
  }

  if (!aberto) {
    return <Button variant="outline" onClick={() => setAberto(true)}>Configurar responsáveis</Button>
  }

  return (
    <div className="glass rounded-3xl p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-navy">Responsáveis</h3>
        <Button variant="ghost" onClick={() => setAberto(false)}>Fechar</Button>
      </div>
      <div className="flex gap-2">
        <Input placeholder="Nome do responsável" value={nome} onChange={(e) => setNome(e.target.value)} />
        <Button onClick={adicionar} disabled={!nome.trim()}>Adicionar</Button>
      </div>
      {erro && <p className="text-sm text-red-600">{erro}</p>}
      <ul className="space-y-1">
        {responsaveis.map((r) => (
          <li key={r.id} className="flex items-center justify-between text-navy">
            <span>{r.nome}</span>
            <Button variant="ghost" onClick={() => remover(r.id)}>Remover</Button>
          </li>
        ))}
        {responsaveis.length === 0 && <li className="text-sm text-navy/60">Nenhum responsável cadastrado ainda.</li>}
      </ul>
    </div>
  )
}
