"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Combobox, type ComboOption } from "@/components/ui/Combobox"
import { ConfiguradorListas } from "@/components/desvios/ConfiguradorListas"
import { STATUS_DESVIO } from "@/lib/desvios/opcoes"

function paraOpcoes(lista: readonly string[]): ComboOption[] {
  return lista.map((valor) => ({ value: valor, label: valor }))
}

const OPCOES_STATUS: ComboOption[] = STATUS_DESVIO.map((s) => ({ value: s.value, label: s.label }))

type OpcoesCampos = Record<string, string[]>

type FormState = {
  numeroOtbWbs: string
  tipo: string | null
  divisao: string | null
  solicitante: string
  dataOcorrencia: string
  clienteFinal: string
  motivo: string | null
  causaRaiz: string | null
  status: string | null
  valor: string
  resumoCaso: string
  solucao: string
}

const ESTADO_INICIAL: FormState = {
  numeroOtbWbs: "",
  tipo: null,
  divisao: null,
  solicitante: "",
  dataOcorrencia: "",
  clienteFinal: "",
  motivo: null,
  causaRaiz: null,
  status: "EM_TRATATIVA",
  valor: "",
  resumoCaso: "",
  solucao: "",
}

export function FormularioDesvio({ isAdmin = false }: { isAdmin?: boolean }) {
  const router = useRouter()
  const [form, setForm] = useState<FormState>(ESTADO_INICIAL)
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [opcoes, setOpcoes] = useState<OpcoesCampos>({})

  async function carregarOpcoes() {
    try {
      const res = await fetch("/api/desvios/opcoes")
      if (!res.ok) return
      const json = (await res.json()) as { opcoes: OpcoesCampos }
      setOpcoes(json.opcoes)
    } catch {
      // silencioso: mantém os combos vazios até nova tentativa
    }
  }

  useEffect(() => {
    carregarOpcoes()
  }, [])

  function atualizar<K extends keyof FormState>(campo: K, valor: FormState[K]) {
    setForm((atual) => ({ ...atual, [campo]: valor }))
  }

  async function aoEnviar(evento: React.FormEvent) {
    evento.preventDefault()
    setErro(null)
    setEnviando(true)
    try {
      const payload = {
        numeroOtbWbs: form.numeroOtbWbs.trim() || null,
        tipo: form.tipo,
        divisao: form.divisao,
        solicitante: form.solicitante.trim() || null,
        dataOcorrencia: form.dataOcorrencia || null,
        clienteFinal: form.clienteFinal.trim() || null,
        motivo: form.motivo,
        causaRaiz: form.causaRaiz,
        status: form.status ?? "EM_TRATATIVA",
        valor: form.valor.trim() === "" ? null : Number(form.valor),
        resumoCaso: form.resumoCaso.trim() || null,
        solucao: form.solucao.trim() || null,
      }
      const res = await fetch("/api/desvios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const corpo = await res.json().catch(() => ({}))
        throw new Error(corpo.error ?? "Não foi possível salvar o desvio.")
      }
      router.push("/dashboards/clientes/atlas/desvios")
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Falha inesperada ao salvar.")
    } finally {
      setEnviando(false)
    }
  }

  return (
    <form onSubmit={aoEnviar} className="glass space-y-6 rounded-3xl p-6">
      {isAdmin && (
        <div className="flex justify-end">
          <ConfiguradorListas onChange={carregarOpcoes} />
        </div>
      )}
      {erro && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {erro}
        </div>
      )}

      <div className="grid gap-5 md:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="numeroOtbWbs">Número OTB/WBS</Label>
          <Input
            id="numeroOtbWbs"
            value={form.numeroOtbWbs}
            onChange={(e) => atualizar("numeroOtbWbs", e.target.value)}
            placeholder="Ex.: 123456"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="tipo">Tipo</Label>
          <Combobox
            value={form.tipo}
            onChange={(v) => atualizar("tipo", v)}
            options={paraOpcoes(opcoes.tipo ?? [])}
            placeholder="Selecionar tipo"
            allowClear
            ariaLabel="Tipo"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="divisao">Divisão</Label>
          <Combobox
            value={form.divisao}
            onChange={(v) => atualizar("divisao", v)}
            options={paraOpcoes(opcoes.divisao ?? [])}
            placeholder="Selecionar divisão"
            allowClear
            ariaLabel="Divisão"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="solicitante">Solicitante</Label>
          <Input
            id="solicitante"
            value={form.solicitante}
            onChange={(e) => atualizar("solicitante", e.target.value)}
            placeholder="Nome do solicitante"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="dataOcorrencia">Data da ocorrência</Label>
          <Input
            id="dataOcorrencia"
            type="date"
            value={form.dataOcorrencia}
            onChange={(e) => atualizar("dataOcorrencia", e.target.value)}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="clienteFinal">Cliente final</Label>
          <Input
            id="clienteFinal"
            value={form.clienteFinal}
            onChange={(e) => atualizar("clienteFinal", e.target.value)}
            placeholder="Nome do cliente final"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="motivo">Motivo</Label>
          <Combobox
            value={form.motivo}
            onChange={(v) => atualizar("motivo", v)}
            options={paraOpcoes(opcoes.motivo ?? [])}
            placeholder="Selecionar motivo"
            allowClear
            ariaLabel="Motivo"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="causaRaiz">Causa raiz</Label>
          <Combobox
            value={form.causaRaiz}
            onChange={(v) => atualizar("causaRaiz", v)}
            options={paraOpcoes(opcoes.causaRaiz ?? [])}
            placeholder="Selecionar causa raiz"
            allowClear
            ariaLabel="Causa raiz"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="status">Status</Label>
          <Combobox
            value={form.status}
            onChange={(v) => atualizar("status", v)}
            options={OPCOES_STATUS}
            placeholder="Selecionar status"
            ariaLabel="Status"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="valor">Valor</Label>
          <Input
            id="valor"
            type="number"
            step="0.01"
            min="0"
            value={form.valor}
            onChange={(e) => atualizar("valor", e.target.value)}
            placeholder="0,00"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="resumoCaso">Resumo do caso</Label>
        <textarea
          id="resumoCaso"
          value={form.resumoCaso}
          onChange={(e) => atualizar("resumoCaso", e.target.value)}
          rows={4}
          placeholder="Descreva o que aconteceu"
          className="flex w-full rounded-xl border border-input bg-white/80 px-4 py-3 text-sm text-foreground shadow-sm transition-colors placeholder:text-muted-foreground/70 focus-visible:outline-none focus-visible:border-teal/50 focus-visible:ring-2 focus-visible:ring-teal/25"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="solucao">Solução</Label>
        <textarea
          id="solucao"
          value={form.solucao}
          onChange={(e) => atualizar("solucao", e.target.value)}
          rows={4}
          placeholder="Descreva a resolução (se houver)"
          className="flex w-full rounded-xl border border-input bg-white/80 px-4 py-3 text-sm text-foreground shadow-sm transition-colors placeholder:text-muted-foreground/70 focus-visible:outline-none focus-visible:border-teal/50 focus-visible:ring-2 focus-visible:ring-teal/25"
        />
      </div>

      <div className="flex justify-end gap-3">
        <Button type="submit" variant="gradient" disabled={enviando}>
          {enviando ? "Salvando..." : "Salvar desvio"}
        </Button>
      </div>
    </form>
  )
}
