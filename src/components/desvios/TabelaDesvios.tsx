"use client"

import { useEffect, useRef, useState } from "react"
import { ChevronDown } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Combobox } from "@/components/ui/Combobox"
import { StatusBadge } from "@/components/desvios/StatusBadge"
import { STATUS_DESVIO } from "@/lib/desvios/opcoes"

type Desvio = {
  id: number
  responsavelInterno: string | null
  numeroOtbWbs: string | null
  tipo: string | null
  divisao: string | null
  solicitante: string | null
  dataOcorrencia: string | null
  clienteFinal: string | null
  motivo: string | null
  causaRaiz: string | null
  status: string
  valor: string | null
  resumoCaso: string | null
  solucao: string | null
}

type Resposta = {
  itens: Desvio[]
  total: number
  contadores: Record<string, number>
  pagina: number
  porPagina: number
}

const PORPAGINA = 20

function formatarData(iso: string | null): string {
  if (!iso) return "—"
  return iso.slice(0, 10)
}

function formatarValor(valor: string | null): string {
  if (valor === null || valor === undefined || valor === "") return "—"
  const numero = Number(valor)
  if (Number.isNaN(numero)) return "—"
  return numero.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
}

/** Menu compacto de status por linha: mostra o badge atual e abre as opções (cada uma como badge). */
function SeletorStatusLinha({
  status,
  onChange,
}: {
  status: string
  onChange: (novoStatus: string) => void
}) {
  const [aberto, setAberto] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!aberto) return
    function aoClicarFora(evento: MouseEvent) {
      if (!ref.current?.contains(evento.target as Node)) setAberto(false)
    }
    document.addEventListener("mousedown", aoClicarFora)
    return () => document.removeEventListener("mousedown", aoClicarFora)
  }, [aberto])

  return (
    <div ref={ref} className="relative inline-block">
      <button
        type="button"
        onClick={() => setAberto((atual) => !atual)}
        aria-haspopup="listbox"
        aria-expanded={aberto}
        className="flex items-center gap-1 rounded-full hover:opacity-80 focus:outline-none focus:ring-2 focus:ring-teal/20"
      >
        <StatusBadge status={status} />
        <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
      </button>
      {aberto && (
        <div
          role="listbox"
          className="absolute left-0 top-full z-20 mt-1 w-44 space-y-1 rounded-2xl border border-navy/10 bg-white p-1.5 shadow-soft"
        >
          {STATUS_DESVIO.map((s) => (
            <button
              key={s.value}
              type="button"
              role="option"
              aria-selected={s.value === status}
              onClick={() => {
                setAberto(false)
                if (s.value !== status) onChange(s.value)
              }}
              className="flex w-full items-center rounded-xl px-1.5 py-1 text-left hover:bg-teal-tint"
            >
              <StatusBadge status={s.value} />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export function TabelaDesvios() {
  const [dados, setDados] = useState<Resposta | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)
  const [pagina, setPagina] = useState(1)
  const [status, setStatus] = useState("")
  const [busca, setBusca] = useState("")
  const [expandido, setExpandido] = useState<number | null>(null)

  async function carregar() {
    setCarregando(true)
    setErro(null)
    try {
      const params = new URLSearchParams()
      params.set("pagina", String(pagina))
      params.set("porPagina", String(PORPAGINA))
      if (status) params.set("status", status)
      if (busca) params.set("busca", busca)
      const res = await fetch(`/api/desvios?${params.toString()}`)
      if (!res.ok) throw new Error("Falha ao carregar os desvios.")
      const json = (await res.json()) as Resposta
      setDados(json)
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Falha inesperada.")
    } finally {
      setCarregando(false)
    }
  }

  useEffect(() => {
    carregar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pagina, status, busca])

  async function alterarStatus(id: number, novoStatus: string) {
    try {
      const res = await fetch(`/api/desvios/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: novoStatus }),
      })
      if (!res.ok) throw new Error("Falha ao atualizar status.")
      await carregar()
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Falha ao atualizar status.")
    }
  }

  const totalPaginas = dados ? Math.max(1, Math.ceil(dados.total / dados.porPagina)) : 1

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        {STATUS_DESVIO.map((s) => (
          <div key={s.value} className="glass rounded-3xl p-5">
            <StatusBadge status={s.value} />
            <p className="mt-2 text-2xl font-semibold text-navy">
              {dados?.contadores?.[s.value] ?? 0}
            </p>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Combobox
          value={status || null}
          onChange={(v) => {
            setStatus(v ?? "")
            setPagina(1)
          }}
          options={STATUS_DESVIO.map((s) => ({ value: s.value, label: s.label }))}
          placeholder="Todos os status"
          allowClear
          clearLabel="Todos os status"
          ariaLabel="Filtrar por status"
          className="sm:w-56"
        />
        <input
          type="text"
          value={busca}
          onChange={(e) => {
            setBusca(e.target.value)
            setPagina(1)
          }}
          placeholder="Buscar por OTB/WBS, cliente, solicitante..."
          aria-label="Buscar desvios"
          className="h-10 flex-1 rounded-xl border border-input bg-white/80 px-4 text-sm text-foreground placeholder:text-muted-foreground/70 focus:outline-none focus:border-teal/50 focus:ring-2 focus:ring-teal/20"
        />
      </div>

      {erro && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {erro}
        </div>
      )}

      <div className="glass overflow-x-auto rounded-3xl">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead>
            <tr className="border-b border-navy/10 text-xs uppercase tracking-wide text-muted-foreground">
              <th className="px-4 py-3">Data</th>
              <th className="px-4 py-3">OTB/WBS</th>
              <th className="px-4 py-3">Cliente</th>
              <th className="px-4 py-3">Motivo</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Detalhe</th>
            </tr>
          </thead>
          <tbody>
            {!carregando && dados?.itens.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                  Nenhum desvio.
                </td>
              </tr>
            )}
            {dados?.itens.map((item) => (
              <>
                <tr key={item.id} className="border-b border-navy/5 align-top">
                  <td className="px-4 py-3 whitespace-nowrap">{formatarData(item.dataOcorrencia)}</td>
                  <td className="px-4 py-3">{item.numeroOtbWbs ?? "—"}</td>
                  <td className="px-4 py-3">{item.clienteFinal ?? "—"}</td>
                  <td className="px-4 py-3">{item.motivo ?? "—"}</td>
                  <td className="px-4 py-3">
                    <SeletorStatusLinha
                      status={item.status}
                      onChange={(novoStatus) => alterarStatus(item.id, novoStatus)}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setExpandido((atual) => (atual === item.id ? null : item.id))}
                    >
                      {expandido === item.id ? "Fechar" : "Ver"}
                    </Button>
                  </td>
                </tr>
                {expandido === item.id && (
                  <tr key={`${item.id}-detalhe`} className="border-b border-navy/5 bg-teal-tint/30">
                    <td colSpan={6} className="px-4 py-4">
                      <dl className="grid gap-3 text-sm sm:grid-cols-2">
                        <div>
                          <dt className="text-xs uppercase text-muted-foreground">Responsável interno</dt>
                          <dd className="text-foreground">{item.responsavelInterno ?? "—"}</dd>
                        </div>
                        <div>
                          <dt className="text-xs uppercase text-muted-foreground">Tipo</dt>
                          <dd className="text-foreground">{item.tipo ?? "—"}</dd>
                        </div>
                        <div>
                          <dt className="text-xs uppercase text-muted-foreground">Causa raiz</dt>
                          <dd className="text-foreground">{item.causaRaiz ?? "—"}</dd>
                        </div>
                        <div>
                          <dt className="text-xs uppercase text-muted-foreground">Valor</dt>
                          <dd className="text-foreground">{formatarValor(item.valor)}</dd>
                        </div>
                        <div className="sm:col-span-2">
                          <dt className="text-xs uppercase text-muted-foreground">Resumo do caso</dt>
                          <dd className="text-foreground">{item.resumoCaso ?? "—"}</dd>
                        </div>
                        <div className="sm:col-span-2">
                          <dt className="text-xs uppercase text-muted-foreground">Solução</dt>
                          <dd className="text-foreground">{item.solucao ?? "—"}</dd>
                        </div>
                      </dl>
                    </td>
                  </tr>
                )}
              </>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={pagina <= 1}
          onClick={() => setPagina((p) => Math.max(1, p - 1))}
        >
          Anterior
        </Button>
        <p className="text-sm text-muted-foreground">
          Página {dados?.pagina ?? pagina} de {totalPaginas}
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={pagina >= totalPaginas}
          onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))}
        >
          Próxima
        </Button>
      </div>
    </div>
  )
}
