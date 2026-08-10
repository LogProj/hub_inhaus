"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Check, X, CircleCheck, TriangleAlert, ShieldCheck, UserRoundX, MinusCircle } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ToastProvider, useToast } from "@/components/ui/toast"
import { postJson } from "@/components/epi/api"
import { cn } from "@/lib/utils"

type ItemResposta = { rotulo: string; conforme: boolean }
type Pessoa = {
  cpfHash: string
  nome: string
  cargo: string | null
  preencheu: boolean
  conforme: boolean | null
  itens: ItemResposta[]
  presente: boolean
}

export function ValidacaoDetalhe(props: { sessaoId: number; validada: boolean; pessoas: Pessoa[] }) {
  return (
    <ToastProvider>
      <Inner {...props} />
    </ToastProvider>
  )
}

function Inner({ sessaoId, validada, pessoas }: { sessaoId: number; validada: boolean; pessoas: Pessoa[] }) {
  const router = useRouter()
  const { sucesso, erro } = useToast()
  const [validando, setValidando] = React.useState(false)

  // presença por pessoa (o líder marca quem estava presente)
  const [presenca, setPresenca] = React.useState<Record<string, boolean>>(() =>
    Object.fromEntries(pessoas.map((p) => [p.cpfHash, p.presente])),
  )

  const presentes = pessoas.filter((p) => presenca[p.cpfHash])
  const preencheram = presentes.filter((p) => p.preencheu)
  const pendentes = presentes.filter((p) => !p.preencheu) // presentes que não preencheram
  const naoConformes = preencheram.filter((p) => p.conforme === false).length

  function alternarPresenca(cpfHash: string) {
    if (validada) return
    setPresenca((s) => ({ ...s, [cpfHash]: !s[cpfHash] }))
  }

  async function validar() {
    setValidando(true)
    try {
      await postJson("/api/epi/validacoes", {
        sessaoId,
        presencas: pessoas.map((p) => ({ cpfHash: p.cpfHash, presente: !!presenca[p.cpfHash] })),
      })
      sucesso("Turno validado", "A utilização de EPI foi confirmada.")
      router.refresh()
    } catch (err) {
      erro("Não foi possível validar", (err as Error).message)
    } finally {
      setValidando(false)
    }
  }

  return (
    <div className="space-y-5">
      <div className="glass flex flex-wrap items-center gap-4 rounded-3xl p-5">
        <Metrica valor={presentes.length} rotulo="Presentes" />
        <Metrica valor={preencheram.length} rotulo="Preencheram" />
        <Metrica valor={pendentes.length} rotulo="Presentes s/ preencher" cor={pendentes.length > 0 ? "text-amber-600" : undefined} />
        <Metrica valor={naoConformes} rotulo="Não conformes" cor={naoConformes > 0 ? "text-red-600" : "text-emerald-600"} />
        <span className="flex-1" />
        {validada ? (
          <Badge variant="success">
            <CircleCheck className="h-3.5 w-3.5" /> Turno validado
          </Badge>
        ) : (
          <Button type="button" variant="gradient" disabled={validando} onClick={validar}>
            <ShieldCheck className="h-4 w-4" />
            {validando ? "Validando…" : "Validar turno"}
          </Button>
        )}
      </div>

      {!validada && (
        <p className="flex items-start gap-2 rounded-2xl bg-teal-tint/60 px-4 py-3 text-sm text-teal-deep">
          <UserRoundX className="mt-0.5 h-4 w-4 shrink-0" />
          Marque como <strong>ausente</strong> quem não estava trabalhando neste turno (ex.: escala
          12x36). Só é cobrado o preenchimento de quem estava presente.
        </p>
      )}

      {pessoas.length === 0 ? (
        <div className="glass rounded-3xl p-10 text-center text-sm text-muted-foreground">
          Nenhuma pessoa alocada neste turno.
        </div>
      ) : (
        <div className="space-y-3">
          {pessoas.map((p) => {
            const presente = !!presenca[p.cpfHash]
            return (
              <div
                key={p.cpfHash}
                className={cn(
                  "glass rounded-2xl p-4 transition-opacity",
                  !presente && "opacity-60",
                  presente && p.preencheu && p.conforme === false && "border border-red-500/30",
                )}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-inhaus-grad text-xs font-semibold text-white">
                    {p.nome.charAt(0)}
                  </span>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-navy">{p.nome}</p>
                    {p.cargo ? <p className="text-xs text-muted-foreground">{p.cargo}</p> : null}
                  </div>

                  {/* status de preenchimento */}
                  {!presente ? (
                    <Badge variant="neutral">Ausente</Badge>
                  ) : p.preencheu ? (
                    p.conforme ? (
                      <Badge variant="success">
                        <CircleCheck className="h-3 w-3" /> Conforme
                      </Badge>
                    ) : (
                      <Badge variant="danger">
                        <TriangleAlert className="h-3 w-3" /> Não conforme
                      </Badge>
                    )
                  ) : (
                    <Badge variant="warn">
                      <MinusCircle className="h-3 w-3" /> Não preencheu
                    </Badge>
                  )}

                  {/* toggle presente/ausente */}
                  <button
                    type="button"
                    onClick={() => alternarPresenca(p.cpfHash)}
                    disabled={validada}
                    className={cn(
                      "rounded-full px-3 py-1 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-70",
                      presente
                        ? "bg-teal-tint text-teal-deep hover:bg-teal-tint/70"
                        : "bg-navy/8 text-muted-foreground hover:bg-navy/15",
                    )}
                  >
                    {presente ? "Presente" : "Ausente"}
                  </button>
                </div>

                {presente && p.preencheu && p.itens.length > 0 && (
                  <ul className="mt-3 space-y-1.5">
                    {p.itens.map((it, j) => (
                      <li key={j} className="flex items-center gap-2 text-sm">
                        {it.conforme ? (
                          <Check className="h-4 w-4 shrink-0 text-emerald-600" />
                        ) : (
                          <X className="h-4 w-4 shrink-0 text-red-600" />
                        )}
                        <span className={cn("flex-1", !it.conforme && "font-medium text-red-700")}>{it.rotulo}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function Metrica({ valor, rotulo, cor }: { valor: number; rotulo: string; cor?: string }) {
  return (
    <div className="text-center">
      <p className={cn("font-display text-2xl font-semibold", cor ?? "text-navy")}>{valor}</p>
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{rotulo}</p>
    </div>
  )
}
