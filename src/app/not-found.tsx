import type { Metadata } from "next"
import { EmptyState } from "@/components/states/EmptyState"

export const metadata: Metadata = {
  title: "Página não encontrada",
}

/**
 * 404 global. Vive na raiz de `src/app` — quando a rota não bate com nenhum
 * segmento, o Next renderiza este arquivo direto sob o layout raiz, sem o
 * shell do grupo `(app)` (sidebar/topbar). Por isso o fundo e o centering
 * são resolvidos aqui, não herdados do `<main>` do shell.
 */
export default function NotFound() {
  return (
    <div className="grid min-h-dvh place-items-center bg-background px-6">
      <EmptyState
        titulo="Essa página ainda não existe."
        descricao="O endereço pode ter mudado ou a tela ainda está em construção."
        acao={{ label: "Voltar para a Home", href: "/home" }}
      />
    </div>
  )
}
