"use client"

import * as React from "react"
import { UserCog, Plus, Trash2, UserRound, Building2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Combobox, type ComboOption } from "@/components/ui/Combobox"
import { ToastProvider, useToast } from "@/components/ui/toast"
import { tituloNome } from "@/lib/nomes"
import { postJson, delJson } from "@/components/epi/api"

type CrBase = { cr: string; cliente: string | null; ativos: number }
type Usuario = { authUserId: string; nome: string; email: string }
type Lider = { authUserId: string; nome: string }

export function LideresManager(props: { crs: CrBase[]; usuarios: Usuario[] }) {
  return (
    <ToastProvider>
      <Inner {...props} />
    </ToastProvider>
  )
}

function Inner({ crs, usuarios }: { crs: CrBase[]; usuarios: Usuario[] }) {
  const { sucesso, erro } = useToast()

  const [cr, setCr] = React.useState<string | null>(null)
  const [lideres, setLideres] = React.useState<Lider[]>([])
  const [carregando, setCarregando] = React.useState(false)
  const [usuarioSel, setUsuarioSel] = React.useState<string | null>(null)
  const [ocupado, setOcupado] = React.useState(false)

  const crAtual = crs.find((c) => c.cr === cr) ?? null

  const carregar = React.useCallback((alvo: string) => {
    setCarregando(true)
    fetch(`/api/epi/lideres?cr=${encodeURIComponent(alvo)}`)
      .then((r) => r.json())
      .then((d) => setLideres((d.lideres as Lider[]) ?? []))
      .catch(() => setLideres([]))
      .finally(() => setCarregando(false))
  }, [])

  React.useEffect(() => {
    if (cr) carregar(cr)
    else setLideres([])
  }, [cr, carregar])

  const opcoesCr: ComboOption[] = crs.map((c) => ({
    value: c.cr,
    label: `${c.cr}${c.cliente ? `  ·  ${c.cliente}` : ""}  ·  ${c.ativos} pessoas`,
  }))
  const jaLideres = new Set(lideres.map((l) => l.authUserId))
  const opcoesUsuario: ComboOption[] = usuarios
    .filter((u) => !jaLideres.has(u.authUserId))
    .map((u) => ({ value: u.authUserId, label: `${u.nome} · ${u.email}` }))

  async function adicionar() {
    if (!cr || !usuarioSel) return
    const u = usuarios.find((x) => x.authUserId === usuarioSel)
    if (!u) return
    setOcupado(true)
    try {
      await postJson("/api/epi/lideres/cr", { cr, authUserId: u.authUserId, nome: u.nome })
      sucesso("Líder nomeado", `${u.nome} — CR ${cr}`)
      setUsuarioSel(null)
      carregar(cr)
    } catch (e) {
      erro("Não foi possível nomear", (e as Error).message)
    } finally {
      setOcupado(false)
    }
  }

  async function remover(l: Lider) {
    if (!cr) return
    setOcupado(true)
    try {
      await delJson("/api/epi/lideres/cr", { cr, authUserId: l.authUserId })
      sucesso("Líder removido", l.nome)
      carregar(cr)
    } catch (e) {
      erro("Não foi possível remover", (e as Error).message)
    } finally {
      setOcupado(false)
    }
  }

  if (crs.length === 0) {
    return (
      <div className="glass rounded-3xl p-10 text-center text-sm text-muted-foreground">
        Nenhum CR disponível na base de colaboradores no momento.
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="glass rounded-3xl p-6">
        <label className="mb-1.5 block text-sm font-medium text-navy">CR</label>
        <div className="max-w-xl">
          <Combobox
            value={cr}
            onChange={setCr}
            options={opcoesCr}
            placeholder="Escolha o CR…"
            ariaLabel="CR"
          />
        </div>
        {crAtual && (
          <p className="mt-2 flex items-center gap-2 text-sm text-teal-deep">
            <Building2 className="h-4 w-4" /> Cliente: <strong>{crAtual.cliente ?? "—"}</strong>
          </p>
        )}
      </div>

      {cr && (
        <>
          <div className="glass rounded-3xl p-6">
            <p className="mb-3 flex items-center gap-2 text-sm font-semibold text-navy">
              <UserCog className="h-4 w-4" /> Nomear líder deste CR
            </p>
            <div className="flex flex-wrap items-end gap-3">
              <div className="min-w-[260px] flex-1">
                <label className="mb-1.5 block text-xs font-medium text-navy">Líder (usuário do hub)</label>
                <Combobox
                  value={usuarioSel}
                  onChange={setUsuarioSel}
                  options={opcoesUsuario}
                  placeholder={opcoesUsuario.length ? "Escolha o líder…" : "Nenhum usuário disponível"}
                  ariaLabel="Líder"
                />
              </div>
              <Button type="button" variant="gradient" disabled={ocupado || !usuarioSel} onClick={adicionar}>
                <Plus className="h-4 w-4" /> Nomear
              </Button>
            </div>
          </div>

          <div className="space-y-3">
            {carregando ? (
              <div className="glass rounded-3xl p-8 text-center text-sm text-muted-foreground">Carregando líderes…</div>
            ) : lideres.length === 0 ? (
              <div className="glass rounded-3xl p-8 text-center text-sm text-muted-foreground">
                Nenhum líder nomeado para este CR ainda.
              </div>
            ) : (
              lideres.map((l) => (
                <div key={l.authUserId} className="glass flex flex-wrap items-center gap-3 rounded-3xl p-5">
                  <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-inhaus-grad text-white">
                    <UserRound className="h-5 w-5" />
                  </span>
                  <p className="min-w-[160px] flex-1 font-display text-base font-semibold text-navy">
                    {tituloNome(l.nome)}
                  </p>
                  <button
                    type="button"
                    onClick={() => remover(l)}
                    disabled={ocupado}
                    className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-sm text-muted-foreground transition-colors hover:bg-red-500/10 hover:text-red-600 disabled:opacity-50"
                  >
                    <Trash2 className="h-4 w-4" /> Remover
                  </button>
                </div>
              ))
            )}
          </div>
        </>
      )}
    </div>
  )
}
