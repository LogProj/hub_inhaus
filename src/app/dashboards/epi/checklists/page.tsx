import type { Metadata } from "next"
import { redirect } from "next/navigation"

import { getAcessoEpiAtual } from "@/lib/epi/guardas"
import { podeConfigurar } from "@/lib/epi/papeis"
import { listarChecklists } from "@/lib/epi/config"
import { EpiHeader, SemAcesso } from "@/components/epi/layout"
import { InfoIndicador } from "@/components/dashboard/InfoIndicador"
import { ChecklistsManager } from "@/components/epi/ChecklistsManager"

export const metadata: Metadata = { title: "Checklists · EPI" }
export const dynamic = "force-dynamic"

export default async function ChecklistsEpiPage() {
  const ctx = await getAcessoEpiAtual()
  if (!ctx) redirect("/login")
  if (!podeConfigurar(ctx.acesso)) return <SemAcesso />

  const checklists = await listarChecklists()

  const dados = checklists.map((t) => {
    const ultima = t.versoes[0]
    const itensAtuais =
      ultima && Array.isArray(ultima.itens)
        ? (ultima.itens as unknown as { id: string; rotulo: string; epi?: string; obrigatorio: boolean }[])
        : []
    return {
      id: t.id,
      nome: t.nome,
      emUso: t._count.crs,
      itensAtuais: itensAtuais.map((i) => ({
        pergunta: i.rotulo,
        epi: i.epi ?? "",
        obrigatorio: i.obrigatorio,
      })),
      versoes: t.versoes.map((v) => ({
        id: v.id,
        versao: v.versao,
        publicado: v.publicadoEm != null,
        itens: Array.isArray(v.itens) ? (v.itens as unknown[]).length : 0,
      })),
    }
  })

  return (
    <div className="space-y-8">
      <EpiHeader
        eyebrow="EPI · Configuração"
        titulo="Checklists"
        descricao="Biblioteca de checklists de EPI. Crie um checklist uma vez e reaproveite-o em vários setores (CRs), de qualquer cliente. Na configuração você apenas vincula o checklist ao setor."
        info={
          <InfoIndicador titulo="Como funcionam os checklists">
            <p>Aqui você monta os checklists que a equipe vai preencher.</p>
            <ul className="mt-2 list-disc space-y-1 pl-4">
              <li>Um checklist pode ser <strong>reaproveitado</strong> em quantos setores quiser.</li>
              <li>É <strong>versionado</strong>: editar um checklist publicado cria uma nova versão, preservando o histórico.</li>
              <li>Só checklists com uma versão <strong>publicada</strong> podem ser vinculados a um setor.</li>
            </ul>
          </InfoIndicador>
        }
      />
      <ChecklistsManager checklists={dados} />
    </div>
  )
}
