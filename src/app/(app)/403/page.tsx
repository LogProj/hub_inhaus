import type { Metadata } from "next"
import { EmptyState } from "@/components/states/EmptyState"

export const metadata: Metadata = {
  title: "Acesso restrito",
}

/**
 * Tela de acesso negado a uma tela específica do hub. Diferente do 404: aqui
 * a página existe, só não foi liberada para este usuário — por isso o texto
 * explica a quem pedir e não trata isso como erro do sistema.
 */
export default function AcessoRestritoPage() {
  return (
    <div className="grid min-h-[60vh] place-items-center">
      <EmptyState
        titulo="Você ainda não tem acesso a esta tela."
        descricao="Peça a liberação a um administrador do hub In-Haus — o acesso é concedido pelo painel de usuários, tela a tela, sem precisar de TI."
        acao={{ label: "Voltar para a Home", href: "/home" }}
      />
    </div>
  )
}
