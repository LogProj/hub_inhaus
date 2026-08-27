"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export function TreinamentoPublicoForm({ token }: { token: string }) {
  const [cpf, setCpf] = useState("")
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [sucesso, setSucesso] = useState<{ nome: string; localizado: boolean; jaEstava: boolean } | null>(null)

  async function enviar(e: React.FormEvent) {
    e.preventDefault()
    setErro(null)
    setCarregando(true)
    try {
      const resp = await fetch(`/api/t/${token}/confirmar`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ cpf }),
      })
      const dados = await resp.json()
      if (!resp.ok) {
        setErro(dados.error ?? "Não foi possível confirmar.")
        return
      }
      setSucesso({ nome: dados.nome, localizado: dados.localizado, jaEstava: dados.jaEstava })
    } catch {
      setErro("Falha de conexão. Tente de novo.")
    } finally {
      setCarregando(false)
    }
  }

  if (sucesso) {
    return (
      <div className="space-y-2 text-navy">
        <p className="text-lg font-semibold text-teal">
          {sucesso.jaEstava ? "Presença já registrada" : "Presença confirmada!"}
        </p>
        <p>
          {sucesso.localizado
            ? `Obrigado, ${sucesso.nome}.`
            : "Registramos seu CPF. Seu cadastro será confirmado pelo responsável."}
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={enviar} className="space-y-4">
      <div className="space-y-1">
        <Label htmlFor="cpf">CPF</Label>
        <Input
          id="cpf"
          inputMode="numeric"
          placeholder="Somente números"
          value={cpf}
          onChange={(e) => setCpf(e.target.value)}
          autoComplete="off"
        />
      </div>
      {erro && <p className="text-sm text-red-600">{erro}</p>}
      <Button type="submit" disabled={carregando} className="w-full">
        {carregando ? "Confirmando..." : "Confirmar presença"}
      </Button>
    </form>
  )
}
