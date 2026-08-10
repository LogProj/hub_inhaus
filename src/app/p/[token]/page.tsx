import type { Metadata } from "next"
import { CalendarX, ClipboardX, HardHat } from "lucide-react"

import { resolverSessaoPublica } from "@/lib/epi/sessao"
import { nomeDiaSemana, dataBR } from "@/lib/epi/datas"
import { tituloNome } from "@/lib/nomes"
import { InhausLogo } from "@/components/brand/InhausLogo"
import { PreenchimentoPublico } from "@/components/epi/PreenchimentoPublico"

export const metadata: Metadata = { title: "Checklist de EPI" }
export const dynamic = "force-dynamic"

export default async function PreenchimentoPage({ params }: { params: { token: string } }) {
  const resolucao = await resolverSessaoPublica(params.token)

  return (
    <main className="min-h-screen bg-inhaus-radial">
      <header className="bg-inhaus-grad px-5 py-6">
        <div className="mx-auto flex max-w-xl items-center justify-between">
          <InhausLogo className="h-7" onDark />
          <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-white/80">
            <HardHat className="h-4 w-4" />
            Checklist de EPI
          </span>
        </div>
      </header>

      <div className="mx-auto max-w-xl px-5 py-6">
        {resolucao.estado === "invalido" && (
          <Aviso icone={<ClipboardX className="h-6 w-6" />} titulo="Link inválido">
            Este link não corresponde a nenhum turno ativo. Confira o QR com o seu líder.
          </Aviso>
        )}

        {resolucao.estado === "fora_do_dia" && (
          <Aviso icone={<CalendarX className="h-6 w-6" />} titulo="Turno não abre hoje">
            O turno <strong>{resolucao.turno.nome}</strong> não está previsto para{" "}
            {nomeDiaSemana(resolucao.hoje.diaSemana)} ({dataBR(resolucao.hoje.iso)}).
          </Aviso>
        )}

        {resolucao.estado === "sem_checklist" && (
          <Aviso icone={<ClipboardX className="h-6 w-6" />} titulo="Checklist indisponível">
            O checklist deste setor ainda não foi publicado. Avise o seu líder.
          </Aviso>
        )}

        {resolucao.estado === "ok" && (
          <>
            <div className="mb-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-teal">
                {resolucao.turno.clienteNome}
              </p>
              <h1 className="mt-0.5 font-display text-2xl font-semibold text-navy">
                {resolucao.turno.nome}
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                {tituloNome(resolucao.turno.cr)} · {dataBR(resolucao.hoje.iso)}
              </p>
            </div>

            {resolucao.validada ? (
              <Aviso icone={<ClipboardX className="h-6 w-6" />} titulo="Turno já validado">
                O líder já validou este turno hoje. Não é mais possível preencher.
              </Aviso>
            ) : resolucao.roster.length === 0 ? (
              <Aviso icone={<ClipboardX className="h-6 w-6" />} titulo="Sem colaboradores">
                Ninguém está alocado neste turno ainda. Avise o seu líder.
              </Aviso>
            ) : (
              <PreenchimentoPublico
                token={params.token}
                roster={resolucao.roster.map((r) => ({
                  ...r,
                  nome: tituloNome(r.nome),
                }))}
                itens={resolucao.itens}
              />
            )}
          </>
        )}
      </div>
    </main>
  )
}

function Aviso({
  icone,
  titulo,
  children,
}: {
  icone: React.ReactNode
  titulo: string
  children: React.ReactNode
}) {
  return (
    <div className="glass rounded-3xl p-8 text-center">
      <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-navy/8 text-navy">
        {icone}
      </span>
      <h2 className="mt-4 font-display text-lg font-semibold text-navy">{titulo}</h2>
      <p className="mt-2 text-sm text-muted-foreground">{children}</p>
    </div>
  )
}
