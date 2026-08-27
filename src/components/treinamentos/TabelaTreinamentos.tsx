"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { ArrowDown, ArrowUp, ChevronsUpDown } from "lucide-react"

import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { EditarTreinamento } from "@/components/treinamentos/EditarTreinamento"

type Responsavel = { id: string; nome: string }

export type LinhaTreinamento = {
  id: string
  nome: string
  data: string | Date
  duracaoHoras: number
  responsavel: string
  responsavelId?: string
  status: string
  presencas: number
}

type Coluna = "nome" | "responsavel" | "status" | "presencas"
type Direcao = "asc" | "desc"

const POR_PAGINA = 10

/** Data (Date | ISO) → "YYYY-MM-DD" para o formulário de edição. */
function dataISO(d: string | Date): string {
  return new Date(d).toISOString().slice(0, 10)
}

export function TabelaTreinamentos({
  treinamentos,
  responsaveis = [],
  editavel = true,
}: {
  treinamentos: LinhaTreinamento[]
  responsaveis?: Responsavel[]
  /** Mostra a coluna "Editar" (padrão). No painel gerencial, passe false (leitura). */
  editavel?: boolean
}) {
  // Ordenação: por padrão, mais recentes primeiro (por data, decrescente).
  const [coluna, setColuna] = useState<Coluna | "data">("data")
  const [direcao, setDirecao] = useState<Direcao>("desc")
  const [pagina, setPagina] = useState(1)

  function ordenarPor(c: Coluna) {
    if (coluna === c) {
      setDirecao((d) => (d === "asc" ? "desc" : "asc"))
    } else {
      setColuna(c)
      setDirecao("asc")
    }
    setPagina(1)
  }

  const ordenados = useMemo(() => {
    const lista = [...treinamentos]
    lista.sort((a, b) => {
      let cmp = 0
      switch (coluna) {
        case "nome":
          cmp = a.nome.localeCompare(b.nome, "pt-BR")
          break
        case "responsavel":
          cmp = a.responsavel.localeCompare(b.responsavel, "pt-BR")
          break
        case "status":
          cmp = a.status.localeCompare(b.status)
          break
        case "presencas":
          cmp = a.presencas - b.presencas
          break
        case "data":
          cmp = new Date(a.data).getTime() - new Date(b.data).getTime()
          break
      }
      return direcao === "asc" ? cmp : -cmp
    })
    return lista
  }, [treinamentos, coluna, direcao])

  const totalPaginas = Math.max(1, Math.ceil(ordenados.length / POR_PAGINA))
  const paginaAtual = Math.min(pagina, totalPaginas)
  const visiveis = ordenados.slice((paginaAtual - 1) * POR_PAGINA, paginaAtual * POR_PAGINA)

  function Icone({ c }: { c: Coluna }) {
    if (coluna !== c) return <ChevronsUpDown className="h-3.5 w-3.5 opacity-40" />
    return direcao === "asc" ? <ArrowUp className="h-3.5 w-3.5" /> : <ArrowDown className="h-3.5 w-3.5" />
  }

  function Ordenavel({ c, children }: { c: Coluna; children: React.ReactNode }) {
    return (
      <button
        type="button"
        onClick={() => ordenarPor(c)}
        className="flex items-center gap-1.5 uppercase tracking-wide hover:text-teal focus:outline-none focus-visible:text-teal"
      >
        {children}
        <Icone c={c} />
      </button>
    )
  }

  if (treinamentos.length === 0) {
    return <p className="text-sm text-navy/60">Nenhum treinamento criado ainda.</p>
  }

  return (
    <div className="space-y-3">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead><Ordenavel c="nome">Treinamento</Ordenavel></TableHead>
            <TableHead><Ordenavel c="responsavel">Responsáveis</Ordenavel></TableHead>
            <TableHead><Ordenavel c="status">Status</Ordenavel></TableHead>
            <TableHead className="text-right">
              <span className="flex justify-end">
                <Ordenavel c="presencas">Pessoas treinadas</Ordenavel>
              </span>
            </TableHead>
            {editavel && <TableHead className="text-right">Editar</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {visiveis.map((t) => (
            <TableRow key={t.id}>
              <TableCell>
                <Link href={`/dashboards/rh/treinamentos/${t.id}`} className="font-medium text-navy hover:text-teal">
                  {t.nome}
                </Link>
                <div className="text-xs text-navy/50">
                  {new Date(t.data).toLocaleDateString("pt-BR", { timeZone: "UTC" })} · {t.duracaoHoras}h
                </div>
              </TableCell>
              <TableCell className="text-navy">{t.responsavel}</TableCell>
              <TableCell>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs ${
                    t.status === "ABERTO" ? "bg-teal/10 text-teal" : "bg-navy/10 text-navy/70"
                  }`}
                >
                  {t.status === "ABERTO" ? "Aberto" : "Concluído"}
                </span>
              </TableCell>
              <TableCell className="text-right tabular-nums text-navy">{t.presencas}</TableCell>
              {editavel && (
                <TableCell className="text-right">
                  <div className="flex justify-end">
                    <EditarTreinamento
                      id={t.id}
                      nome={t.nome}
                      data={dataISO(t.data)}
                      duracaoHoras={t.duracaoHoras}
                      responsavelId={t.responsavelId ?? ""}
                      responsaveis={responsaveis}
                      variante="icone"
                    />
                  </div>
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {totalPaginas > 1 && (
        <div className="flex items-center justify-between text-sm text-navy/60">
          <span>
            Página {paginaAtual} de {totalPaginas} · {ordenados.length} treinamento(s)
          </span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={paginaAtual <= 1} onClick={() => setPagina((p) => p - 1)}>
              Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={paginaAtual >= totalPaginas}
              onClick={() => setPagina((p) => p + 1)}
            >
              Próxima
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
