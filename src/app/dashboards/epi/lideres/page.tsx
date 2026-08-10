import type { Metadata } from "next"
import { redirect } from "next/navigation"

import { getAcessoEpiAtual } from "@/lib/epi/guardas"
import { podeConfigurar } from "@/lib/epi/papeis"
import { listarUsuariosHub } from "@/lib/epi/config"
import { listarCrsDisponiveis } from "@/lib/epi/colaboradores"
import { EpiHeader, SemAcesso } from "@/components/epi/layout"
import { InfoIndicador } from "@/components/dashboard/InfoIndicador"
import { LideresManager } from "@/components/epi/LideresManager"

export const metadata: Metadata = { title: "Líderes · EPI" }
export const dynamic = "force-dynamic"

export default async function LideresEpiPage() {
  const ctx = await getAcessoEpiAtual()
  if (!ctx) redirect("/login")
  if (!podeConfigurar(ctx.acesso)) return <SemAcesso />

  // Os CRs vêm sempre DA BASE (cada CR já tem seu cliente definido). Basta escolher
  // o CR e nomear os líderes dele.
  const [crs, usuarios] = await Promise.all([listarCrsDisponiveis(), listarUsuariosHub()])

  return (
    <div className="space-y-8">
      <EpiHeader
        eyebrow="EPI · Configuração"
        titulo="Líderes por CR"
        descricao="Escolha um CR (o cliente vem da base) e nomeie quem valida os turnos dele. Um CR pode ter mais de um líder."
        info={
          <InfoIndicador titulo="Como funcionam os líderes">
            <p>O líder é quem <strong>valida</strong> os turnos de um CR.</p>
            <ul className="mt-2 list-disc space-y-1 pl-4">
              <li>Escolha o <strong>CR</strong> na lista da base (o cliente aparece junto).</li>
              <li>Nomeie <strong>um ou mais líderes</strong> (usuários do hub) para esse CR.</li>
              <li>Ser líder de um CR já libera a validação de <strong>todos os turnos</strong> dele.</li>
            </ul>
          </InfoIndicador>
        }
      />
      <LideresManager
        crs={crs.map((c) => ({ cr: c.cr, cliente: c.cliente, ativos: c.ativos }))}
        usuarios={usuarios}
      />
    </div>
  )
}
