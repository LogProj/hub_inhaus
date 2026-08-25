"use client"

import * as React from "react"
import { Eye } from "lucide-react"

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { StatusBadge } from "@/components/desvios/StatusBadge"

/** Linha de desvio como vem da API (campos podem ser nulos; valor vem como string). */
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
  resumoCaso: string | null
  solucao: string | null
  status: string
  dataFaturamento: string | null
  dataSeparacao: string | null
  valor: string | null
}

const POR_PAGINA = 8

function data(v: string | null): string {
  return v ? v.slice(0, 10).split("-").reverse().join("/") : "—"
}
function moeda(v: string | null): string {
  if (v == null) return "—"
  return Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
}

/**
 * Tabela paginada (somente leitura) dos desvios, para o painel. Segue o mês
 * selecionado no painel. Botão "Ver" abre o detalhe completo num diálogo.
 */
export function TabelaResumoDesvios({ mes }: { mes: string | null }) {
  const [itens, setItens] = React.useState<Desvio[]>([])
  const [total, setTotal] = React.useState(0)
  const [pagina, setPagina] = React.useState(1)
  const [selecionado, setSelecionado] = React.useState<Desvio | null>(null)

  // Volta à primeira página quando o mês muda.
  React.useEffect(() => {
    setPagina(1)
  }, [mes])

  React.useEffect(() => {
    let cancelado = false
    const p = new URLSearchParams({ pagina: String(pagina), porPagina: String(POR_PAGINA) })
    p.set("mes", mes ?? "todos")
    fetch(`/api/desvios?${p.toString()}`)
      .then((r) => r.json())
      .then((d: { itens: Desvio[]; total: number }) => {
        if (cancelado) return
        setItens(d.itens ?? [])
        setTotal(d.total ?? 0)
      })
    return () => {
      cancelado = true
    }
  }, [pagina, mes])

  const totalPaginas = Math.max(1, Math.ceil(total / POR_PAGINA))

  return (
    <div className="glass rounded-3xl p-5">
      <p className="mb-3 text-sm font-semibold text-navy">Desvios do período</p>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="p-2">Data</th>
              <th className="p-2">OTB/WBS</th>
              <th className="p-2">Cliente</th>
              <th className="p-2">Motivo</th>
              <th className="p-2">Status</th>
              <th className="p-2 text-right">Ações</th>
            </tr>
          </thead>
          <tbody>
            {itens.map((d) => (
              <tr key={d.id} className="border-t border-navy/5">
                <td className="whitespace-nowrap p-2">{data(d.dataOcorrencia)}</td>
                <td className="p-2">{d.numeroOtbWbs ?? "—"}</td>
                <td className="p-2">{d.clienteFinal ?? "—"}</td>
                <td className="p-2">{d.motivo ?? "—"}</td>
                <td className="p-2">
                  <StatusBadge status={d.status} />
                </td>
                <td className="p-2 text-right">
                  <button
                    type="button"
                    onClick={() => setSelecionado(d)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-input px-2.5 py-1 text-xs font-medium text-navy transition-colors hover:border-teal/40 hover:text-teal"
                  >
                    <Eye className="h-3.5 w-3.5" />
                    Ver
                  </button>
                </td>
              </tr>
            ))}
            {itens.length === 0 && (
              <tr>
                <td colSpan={6} className="p-6 text-center text-muted-foreground">
                  Nenhum desvio no período.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-3 flex items-center justify-between text-sm">
        <span className="text-muted-foreground">{total} desvio(s)</span>
        <div className="flex items-center gap-2">
          <button
            disabled={pagina <= 1}
            onClick={() => setPagina((p) => p - 1)}
            className="rounded-lg border border-input px-3 py-1 disabled:opacity-40"
          >
            Anterior
          </button>
          <span className="px-1">
            {pagina} / {totalPaginas}
          </span>
          <button
            disabled={pagina >= totalPaginas}
            onClick={() => setPagina((p) => p + 1)}
            className="rounded-lg border border-input px-3 py-1 disabled:opacity-40"
          >
            Próxima
          </button>
        </div>
      </div>

      <Dialog open={selecionado !== null} onOpenChange={(v) => !v && setSelecionado(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Detalhe do desvio</DialogTitle>
          </DialogHeader>
          {selecionado && (
            <dl className="grid gap-3 sm:grid-cols-2">
              <Campo r="Status">
                <StatusBadge status={selecionado.status} />
              </Campo>
              <Campo r="Data da ocorrência" v={data(selecionado.dataOcorrencia)} />
              <Campo r="Responsável Interno" v={selecionado.responsavelInterno} />
              <Campo r="Nº OTB/WBS" v={selecionado.numeroOtbWbs} />
              <Campo r="Tipo" v={selecionado.tipo} />
              <Campo r="Divisão" v={selecionado.divisao} />
              <Campo r="Solicitante" v={selecionado.solicitante} />
              <Campo r="Cliente" v={selecionado.clienteFinal} />
              <Campo r="Motivo" v={selecionado.motivo} />
              <Campo r="Causa Raiz" v={selecionado.causaRaiz} />
              <Campo r="Data de faturamento" v={data(selecionado.dataFaturamento)} />
              <Campo r="Data de separação" v={data(selecionado.dataSeparacao)} />
              <Campo r="Valor" v={moeda(selecionado.valor)} />
              <Campo r="Resumo do Caso" v={selecionado.resumoCaso} full />
              <Campo r="Solução" v={selecionado.solucao} full />
            </dl>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

function Campo({
  r,
  v,
  full,
  children,
}: {
  r: string
  v?: string | null
  full?: boolean
  children?: React.ReactNode
}) {
  return (
    <div className={full ? "sm:col-span-2" : ""}>
      <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{r}</dt>
      <dd className="whitespace-pre-wrap text-sm text-navy">{children ?? v ?? "—"}</dd>
    </div>
  )
}
