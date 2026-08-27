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

  const cpfCompleto = cpf.length === 11

  async function enviar(e: React.FormEvent) {
    e.preventDefault()
    if (!cpfCompleto) {
      setErro("Digite os 11 números do CPF (sem ponto e sem traço).")
      return
    }
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
          pattern="\d*"
          maxLength={11}
          placeholder="Somente os 11 números"
          value={cpf}
          // Aceita SÓ dígitos e no máximo 11 (remove ponto, traço, espaço e cola).
          onChange={(e) => setCpf(e.target.value.replace(/\D/g, "").slice(0, 11))}
          autoComplete="off"
          aria-describedby="cpf-ajuda"
        />
        <p id="cpf-ajuda" className="text-xs text-navy/50">
          {cpf.length}/11 dígitos — sem ponto e sem traço.
        </p>
      </div>
      {erro && <p className="text-sm text-red-600">{erro}</p>}
      <Button type="submit" disabled={carregando || !cpfCompleto} className="w-full">
        {carregando ? "Confirmando..." : "Confirmar presença"}
      </Button>
    </form>
  )
}
