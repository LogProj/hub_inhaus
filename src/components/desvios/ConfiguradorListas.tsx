"use client"

import { useEffect, useState } from "react"
import { Settings2, Trash2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog"

type Campo = { key: string; label: string }

type RespostaOpcoes = {
  opcoes: Record<string, string[]>
  custom: Record<string, string[]>
  campos: Campo[]
}

export function ConfiguradorListas({ onChange }: { onChange?: () => void }) {
  const [aberto, setAberto] = useState(false)
  const [dados, setDados] = useState<RespostaOpcoes | null>(null)
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [novoValor, setNovoValor] = useState<Record<string, string>>({})
  const [salvandoCampo, setSalvandoCampo] = useState<string | null>(null)

  async function carregar() {
    setCarregando(true)
    setErro(null)
    try {
      const res = await fetch("/api/desvios/opcoes")
      if (!res.ok) throw new Error("Falha ao carregar as listas.")
      const json = (await res.json()) as RespostaOpcoes
      setDados(json)
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Falha inesperada.")
    } finally {
      setCarregando(false)
    }
  }

  useEffect(() => {
    if (aberto) carregar()
  }, [aberto])

  async function adicionar(campo: string) {
    const valor = (novoValor[campo] ?? "").trim()
    if (!valor) return
    setSalvandoCampo(campo)
    setErro(null)
    try {
      const res = await fetch("/api/desvios/opcoes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campo, valor }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(
          res.status === 403
            ? "Apenas administradores podem configurar as listas."
            : json.error ?? "Falha ao adicionar o valor.",
        )
      }
      setDados((atual) => (atual ? { ...atual, opcoes: json.opcoes, custom: json.custom } : atual))
      setNovoValor((atual) => ({ ...atual, [campo]: "" }))
      onChange?.()
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Falha inesperada.")
    } finally {
      setSalvandoCampo(null)
    }
  }

  async function remover(campo: string, valor: string) {
    setSalvandoCampo(campo)
    setErro(null)
    try {
      const res = await fetch("/api/desvios/opcoes", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campo, valor }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(
          res.status === 403
            ? "Apenas administradores podem configurar as listas."
            : json.error ?? "Falha ao remover o valor.",
        )
      }
      setDados((atual) => (atual ? { ...atual, opcoes: json.opcoes, custom: json.custom } : atual))
      onChange?.()
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Falha inesperada.")
    } finally {
      setSalvandoCampo(null)
    }
  }

  return (
    <Dialog open={aberto} onOpenChange={setAberto}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="sm">
          <Settings2 className="mr-2 h-4 w-4" />
          Configurar listas
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Configurar listas do formulário</DialogTitle>
          <DialogDescription>
            Os valores padrão não podem ser removidos. Os que você adicionar aqui ficam
            disponíveis no formulário deste cliente.
          </DialogDescription>
        </DialogHeader>

        {erro && (
          <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {erro}
          </div>
        )}

        {carregando && !dados && (
          <p className="text-sm text-muted-foreground">Carregando...</p>
        )}

        {dados && (
          <div className="space-y-6">
            {dados.campos.map((campo) => {
              const opcoes = dados.opcoes[campo.key] ?? []
              const custom = new Set(dados.custom[campo.key] ?? [])
              return (
                <div key={campo.key} className="space-y-2">
                  <p className="text-sm font-semibold text-navy">{campo.label}</p>
                  <ul className="flex flex-wrap gap-2">
                    {opcoes.map((valor) => (
                      <li
                        key={valor}
                        className="flex items-center gap-1.5 rounded-full border border-navy/10 bg-white/80 px-3 py-1 text-xs text-foreground"
                      >
                        {valor}
                        {custom.has(valor) && (
                          <button
                            type="button"
                            onClick={() => remover(campo.key, valor)}
                            disabled={salvandoCampo === campo.key}
                            aria-label={`Remover ${valor}`}
                            className="text-muted-foreground hover:text-destructive disabled:opacity-50"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        )}
                      </li>
                    ))}
                    {opcoes.length === 0 && (
                      <li className="text-xs text-muted-foreground">Nenhum valor.</li>
                    )}
                  </ul>
                  <div className="flex gap-2">
                    <Input
                      value={novoValor[campo.key] ?? ""}
                      onChange={(e) =>
                        setNovoValor((atual) => ({ ...atual, [campo.key]: e.target.value }))
                      }
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault()
                          adicionar(campo.key)
                        }
                      }}
                      placeholder={`Novo valor para ${campo.label.toLowerCase()}`}
                      className="h-9"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => adicionar(campo.key)}
                      disabled={salvandoCampo === campo.key || !(novoValor[campo.key] ?? "").trim()}
                    >
                      Adicionar
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
