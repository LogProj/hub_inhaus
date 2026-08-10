"use client"

import * as React from "react"
import { Check, X, ShieldCheck, CircleCheck, TriangleAlert, Info } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Combobox, type ComboOption } from "@/components/ui/Combobox"
import { cn } from "@/lib/utils"

type ItemChecklist = { id: string; rotulo: string; epi?: string; obrigatorio: boolean }
type Pessoa = { id: string; nome: string; cargo: string | null; jaRespondeu: boolean }

export function PreenchimentoPublico({
  token,
  roster,
  itens,
}: {
  token: string
  roster: Pessoa[]
  itens: ItemChecklist[]
}) {
  const [pessoaId, setPessoaId] = React.useState<string | null>(null)
  const [cpf, setCpf] = React.useState("")
  const [respostas, setRespostas] = React.useState<Record<string, boolean>>({})
  const [enviando, setEnviando] = React.useState(false)
  const [erro, setErro] = React.useState<string | null>(null)
  const [concluido, setConcluido] = React.useState<null | { conforme: boolean }>(null)

  const pessoa = roster.find((p) => p.id === pessoaId) ?? null

  const opcoesPessoa: ComboOption[] = roster.map((p) => ({
    value: p.id,
    label: p.jaRespondeu ? `${p.nome}  ✓ já respondeu` : p.nome,
  }))

  const obrigatoriosRespondidos = itens
    .filter((i) => i.obrigatorio)
    .every((i) => respostas[i.id] !== undefined)
  const cpfOk = cpf.replace(/\D/g, "").length === 11
  const podeEnviar = !!pessoaId && cpfOk && obrigatoriosRespondidos && !enviando

  function responder(itemId: string, conforme: boolean) {
    setRespostas((atual) => ({ ...atual, [itemId]: conforme }))
  }

  async function enviar() {
    if (!pessoaId) return
    setEnviando(true)
    setErro(null)
    try {
      const res = await fetch(`/p/${token}/responder`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pessoa: pessoaId,
          cpf,
          respostas: Object.entries(respostas).map(([itemId, conforme]) => ({ itemId, conforme })),
        }),
      })
      const dados = await res.json().catch(() => ({}))
      if (!res.ok) {
        setErro(dados.error ?? "Não foi possível enviar. Tente novamente.")
        return
      }
      setConcluido({ conforme: !!dados.conforme })
    } catch {
      setErro("Falha de conexão. Tente novamente.")
    } finally {
      setEnviando(false)
    }
  }

  if (concluido) {
    return (
      <div className="glass rounded-3xl p-8 text-center">
        <span
          className={cn(
            "mx-auto flex h-14 w-14 items-center justify-center rounded-full",
            concluido.conforme ? "bg-emerald-500/12 text-emerald-600" : "bg-amber-500/15 text-amber-600",
          )}
        >
          {concluido.conforme ? <CircleCheck className="h-7 w-7" /> : <TriangleAlert className="h-7 w-7" />}
        </span>
        <h2 className="mt-4 font-display text-xl font-semibold text-navy">Checklist enviado!</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {pessoa?.nome}, sua resposta foi registrada
          {concluido.conforme ? " como conforme." : " com uma ou mais não conformidades."} O líder fará a validação.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div className="flex items-start gap-2 rounded-2xl bg-teal-tint/70 px-4 py-3">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-teal-deep" />
        <p className="text-sm text-teal-deep">
          Confira você mesmo os seus EPIs e responda com sinceridade. Marque <strong>Conforme</strong> quando
          estiver usando o equipamento certo, e <strong>Não conforme</strong> se estiver faltando ou errado. Em
          caso de não conformidade, procure o seu líder.
        </p>
      </div>

      <div className="glass rounded-3xl p-5">
        <label className="mb-1.5 block text-sm font-semibold text-navy">1. Selecione seu nome</label>
        <Combobox
          value={pessoaId}
          onChange={(v) => {
            setPessoaId(v)
            setErro(null)
          }}
          options={opcoesPessoa}
          placeholder="Toque para escolher…"
          ariaLabel="Seu nome"
        />
        {pessoa?.jaRespondeu && (
          <p className="mt-2 rounded-lg bg-teal-tint px-3 py-2 text-xs text-teal-deep">
            Você já respondeu hoje. Enviar de novo atualiza a sua resposta.
          </p>
        )}

        <label className="mb-1.5 mt-4 block text-sm font-semibold text-navy">2. Confirme seu CPF</label>
        <Input
          value={cpf}
          onChange={(e) => setCpf(e.target.value)}
          inputMode="numeric"
          placeholder="Somente números"
          autoComplete="off"
        />
        <p className="mt-1 text-[11px] text-muted-foreground">
          Usado só para confirmar sua identidade. Não guardamos seu CPF.
        </p>
      </div>

      <div className="glass rounded-3xl p-5">
        <p className="mb-3 flex items-center gap-2 text-sm font-semibold text-navy">
          <ShieldCheck className="h-4 w-4 text-teal" /> 3. Marque cada item
        </p>
        <ul className="space-y-3">
          {itens.map((item, idx) => (
            <li key={item.id} className="rounded-2xl border border-border/60 bg-white/70 p-3">
              <div className="flex items-start gap-2">
                <span className="mt-0.5 text-xs font-semibold text-muted-foreground">{idx + 1}.</span>
                <div className="flex-1">
                  <p className="text-sm font-medium text-navy">{item.rotulo}</p>
                  {item.epi ? <p className="text-xs text-muted-foreground">EPI: {item.epi}</p> : null}
                </div>
              </div>
              <div className="mt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => responder(item.id, true)}
                  className={cn(
                    "flex flex-1 items-center justify-center gap-1.5 rounded-xl border px-3 py-2 text-sm font-medium transition-colors",
                    respostas[item.id] === true
                      ? "border-emerald-500 bg-emerald-500 text-white"
                      : "border-navy/15 bg-white text-navy hover:border-emerald-400",
                  )}
                >
                  <Check className="h-4 w-4" /> Conforme
                </button>
                <button
                  type="button"
                  onClick={() => responder(item.id, false)}
                  className={cn(
                    "flex flex-1 items-center justify-center gap-1.5 rounded-xl border px-3 py-2 text-sm font-medium transition-colors",
                    respostas[item.id] === false
                      ? "border-red-500 bg-red-500 text-white"
                      : "border-navy/15 bg-white text-navy hover:border-red-400",
                  )}
                >
                  <X className="h-4 w-4" /> Não conforme
                </button>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {erro && (
        <p className="rounded-2xl border border-red-500/30 bg-red-50 px-4 py-3 text-sm text-red-700">{erro}</p>
      )}

      <Button
        type="button"
        variant="gradient"
        size="lg"
        className="w-full"
        disabled={!podeEnviar}
        onClick={enviar}
      >
        {enviando ? "Enviando…" : "Enviar checklist"}
      </Button>
      {!obrigatoriosRespondidos && (
        <p className="text-center text-xs text-muted-foreground">Responda todos os itens para enviar.</p>
      )}
    </div>
  )
}
