import type { Metadata } from "next"
import { redirect } from "next/navigation"

import { getAcessoEpiAtual } from "@/lib/epi/guardas"
import { podeConfigurar } from "@/lib/epi/papeis"
import { acompanhamentoMensal } from "@/lib/epi/acompanhamento"
import { hojeSaoPaulo } from "@/lib/epi/datas"
import { EpiHeader, SemAcesso } from "@/components/epi/layout"
import { InfoIndicador } from "@/components/dashboard/InfoIndicador"
import { AcompanhamentoEpi } from "@/components/epi/AcompanhamentoEpi"

export const metadata: Metadata = { title: "Acompanhamento · EPI" }
export const dynamic = "force-dynamic"

export default async function AcompanhamentoPage({
  searchParams,
}: {
  searchParams: { mes?: string }
}) {
  const ctx = await getAcessoEpiAtual()
  if (!ctx) redirect("/login")
  if (!podeConfigurar(ctx.acesso)) return <SemAcesso mensagem="Esta área é da Segurança e da administração." />

  const mesParam = searchParams.mes
  const mes = mesParam && /^\d{4}-\d{2}$/.test(mesParam) ? mesParam : hojeSaoPaulo().iso.slice(0, 7)
  const dados = await acompanhamentoMensal(mes)

  return (
    <div className="space-y-8">
      <EpiHeader
        eyebrow="EPI · Segurança"
        titulo="Acompanhamento mensal"
        descricao="Torre de controle do uso de EPI: aderência do mês e alertas de pendências, por CR e por líder."
        info={
          <InfoIndicador titulo="Como este painel é calculado">
            <p>Tudo é apurado no <strong>mês escolhido</strong>, considerando os dias até hoje.</p>
            <ul className="mt-2 list-disc space-y-1 pl-4">
              <li><strong>Esperado</strong>: para cada turno, os dias do mês em que ele espera preenchimento, vezes as pessoas alocadas.</li>
              <li><strong>Aderência</strong>: preenchimentos feitos ÷ esperados.</li>
              <li><strong>Sem preenchimento</strong>: pessoa alocada que, num dia com sessão, não preencheu (e não foi marcada ausente).</li>
              <li><strong>Não conformidade</strong>: preencheu, mas marcou algum item como não conforme (EPI faltando).</li>
              <li><strong>Líder com pendências</strong>: sessões preenchidas aguardando o líder validar.</li>
              <li><strong>Turno sem sessão</strong>: dia esperado em que ninguém abriu o link do turno.</li>
              <li>Quem o líder marca <strong>ausente</strong> não é cobrado naquele dia (resolve 12x36).</li>
            </ul>
          </InfoIndicador>
        }
      />
      <AcompanhamentoEpi dados={dados} />
    </div>
  )
}
