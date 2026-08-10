"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Users, MapPin, AlertTriangle, ArrowRightLeft } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Combobox, type ComboOption } from "@/components/ui/Combobox"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ToastProvider, useToast } from "@/components/ui/toast"
import { tituloNome } from "@/lib/nomes"
import { postJson, delJson } from "@/components/epi/api"

type Turno = { id: number; nome: string }
type Linha = {
  cpfHash: string
  nome: string
  cargo: string | null
  matricula: string | null
  turnoId: number | null
}
type CrOpcao = { cr: string; clienteNome: string }

export function AlocacoesManager(props: {
  crs: CrOpcao[]
  crSelecionado: string | null
  turnos: Turno[]
  linhas: Linha[]
}) {
  return (
    <ToastProvider>
      <Inner {...props} />
    </ToastProvider>
  )
}

function Inner({
  crs,
  crSelecionado,
  turnos,
  linhas,
}: {
  crs: CrOpcao[]
  crSelecionado: string | null
  turnos: Turno[]
  linhas: Linha[]
}) {
  const router = useRouter()
  const { sucesso, erro } = useToast()
  const [selecionados, setSelecionados] = React.useState<Set<string>>(new Set())
  const [turnoAlvo, setTurnoAlvo] = React.useState<string | null>(null)
  const [soNaoAlocados, setSoNaoAlocados] = React.useState(false)
  const [ocupado, setOcupado] = React.useState(false)

  const nomeTurno = React.useCallback(
    (id: number | null) => (id == null ? null : turnos.find((t) => t.id === id)?.nome ?? `Turno ${id}`),
    [turnos],
  )

  const visiveis = soNaoAlocados ? linhas.filter((l) => l.turnoId == null) : linhas
  const naoAlocados = linhas.filter((l) => l.turnoId == null).length

  const opcoesCr: ComboOption[] = crs.map((c) => ({ value: c.cr, label: `${c.cr}  ·  ${c.clienteNome}` }))
  const opcoesTurno: ComboOption[] = turnos.map((t) => ({ value: String(t.id), label: t.nome }))

  function alternar(cpfHash: string) {
    setSelecionados((atual) => {
      const nova = new Set(atual)
      if (nova.has(cpfHash)) nova.delete(cpfHash)
      else nova.add(cpfHash)
      return nova
    })
  }
  function alternarTodos() {
    setSelecionados((atual) => {
      if (visiveis.every((l) => atual.has(l.cpfHash))) return new Set()
      return new Set(visiveis.map((l) => l.cpfHash))
    })
  }
  const estadoTodos =
    visiveis.length > 0 && visiveis.every((l) => selecionados.has(l.cpfHash))
      ? true
      : visiveis.some((l) => selecionados.has(l.cpfHash))
        ? "indeterminate"
        : false

  async function atribuir() {
    if (!turnoAlvo || selecionados.size === 0 || !crSelecionado) return
    const escolhidos = linhas.filter((l) => selecionados.has(l.cpfHash))
    setOcupado(true)
    try {
      const r = (await postJson("/api/epi/atribuicoes", {
        turnoId: Number(turnoAlvo),
        cr: crSelecionado,
        colaboradores: escolhidos.map((l) => ({ cpfHash: l.cpfHash, matricula: l.matricula })),
      })) as { atribuidos: number }
      sucesso("Colaboradores alocados", `${r.atribuidos} atribuição(ões) no turno ${nomeTurno(Number(turnoAlvo))}.`)
      setSelecionados(new Set())
      router.refresh()
    } catch (err) {
      erro("Não foi possível alocar", (err as Error).message)
    } finally {
      setOcupado(false)
    }
  }

  async function desalocar(cpfHash: string) {
    if (!crSelecionado) return
    setOcupado(true)
    try {
      await delJson("/api/epi/atribuicoes", { cpfHash, cr: crSelecionado })
      sucesso("Colaborador desalocado")
      router.refresh()
    } catch (err) {
      erro("Não foi possível desalocar", (err as Error).message)
    } finally {
      setOcupado(false)
    }
  }

  if (crs.length === 0) {
    return (
      <div className="glass rounded-3xl p-10 text-center text-sm text-muted-foreground">
        Nenhum CR vinculado ainda. Faça isso na tela <strong>Clientes e CRs</strong>.
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="glass flex flex-wrap items-end gap-3 rounded-3xl p-6">
        <div className="min-w-[280px] flex-1">
          <label className="mb-1.5 block text-sm font-medium text-navy">Centro de Resultado</label>
          <Combobox
            value={crSelecionado}
            onChange={(v) => {
              setSelecionados(new Set())
              router.push(`/dashboards/epi/alocacoes${v ? `?cr=${encodeURIComponent(v)}` : ""}`)
            }}
            options={opcoesCr}
            placeholder="Escolher CR…"
            ariaLabel="CR"
          />
        </div>
        <div className="flex items-center gap-4">
          <div className="text-center">
            <p className="font-display text-2xl font-semibold text-navy">{linhas.length}</p>
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Ativos</p>
          </div>
          <div className="text-center">
            <p className="font-display text-2xl font-semibold text-amber-600">{naoAlocados}</p>
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Não alocados</p>
          </div>
        </div>
      </div>

      {turnos.length === 0 ? (
        <div className="glass rounded-3xl p-6 text-sm text-amber-700">
          <AlertTriangle className="mr-1 inline h-4 w-4" />
          Este CR ainda não tem turnos. Crie um na tela <strong>Turnos e líderes</strong> antes de alocar.
        </div>
      ) : (
        <div className="glass sticky top-2 z-10 flex flex-wrap items-center gap-3 rounded-3xl p-4">
          <span className="text-sm font-medium text-navy">
            {selecionados.size} selecionado(s)
          </span>
          <span className="flex-1" />
          <button
            type="button"
            onClick={() => setSoNaoAlocados((v) => !v)}
            className={
              soNaoAlocados
                ? "rounded-full bg-amber-500/15 px-3 py-1.5 text-xs font-medium text-amber-700"
                : "rounded-full border border-navy/15 px-3 py-1.5 text-xs text-muted-foreground hover:border-teal/40"
            }
          >
            Só não alocados
          </button>
          <div className="min-w-[180px]">
            <Combobox value={turnoAlvo} onChange={setTurnoAlvo} options={opcoesTurno} placeholder="Turno alvo…" ariaLabel="Turno alvo" />
          </div>
          <Button
            type="button"
            variant="gradient"
            disabled={ocupado || !turnoAlvo || selecionados.size === 0}
            onClick={atribuir}
          >
            <ArrowRightLeft className="h-4 w-4" />
            Alocar selecionados
          </Button>
        </div>
      )}

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-10">
              <Checkbox checked={estadoTodos} onCheckedChange={alternarTodos} />
            </TableHead>
            <TableHead>Colaborador</TableHead>
            <TableHead>Cargo</TableHead>
            <TableHead>Matrícula</TableHead>
            <TableHead>Turno atual</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {visiveis.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="py-8 text-center text-sm text-muted-foreground">
                {soNaoAlocados ? "Todos os ativos estão alocados. 🎉" : "Nenhum colaborador ativo neste CR."}
              </TableCell>
            </TableRow>
          ) : (
            visiveis.map((l) => (
              <TableRow key={l.cpfHash} data-state={selecionados.has(l.cpfHash) ? "selected" : undefined}>
                <TableCell>
                  <Checkbox checked={selecionados.has(l.cpfHash)} onCheckedChange={() => alternar(l.cpfHash)} />
                </TableCell>
                <TableCell className="font-medium text-navy">{tituloNome(l.nome)}</TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {l.cargo ? tituloNome(l.cargo) : "—"}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">{l.matricula ?? "—"}</TableCell>
                <TableCell>
                  {l.turnoId == null ? (
                    <Badge variant="warn">Não alocado</Badge>
                  ) : (
                    <Badge variant="teal">
                      <MapPin className="h-3 w-3" />
                      {nomeTurno(l.turnoId)}
                    </Badge>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  {l.turnoId != null && (
                    <button
                      type="button"
                      onClick={() => desalocar(l.cpfHash)}
                      disabled={ocupado}
                      className="rounded-lg px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-red-500/10 hover:text-red-600 disabled:opacity-50"
                    >
                      Desalocar
                    </button>
                  )}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      <div className="glass flex items-center gap-2 rounded-2xl p-4 text-xs text-muted-foreground">
        <Users className="h-4 w-4 shrink-0 text-teal" />
        A lista reflete o <strong>quadro ativo</strong> do CR em tempo real. Admissões aparecem
        automaticamente; desligamentos somem. A alocação define apenas em qual turno cada pessoa preenche o checklist.
      </div>
    </div>
  )
}
