import { redirect } from "next/navigation"

// A landing (hero) fica OCULTA por enquanto: a entrada do sistema vai direto
// para os dashboards. A tela de boas-vindas está preservada em /home para
// reativarmos depois (basta apontar a raiz para ela).
export default function RootPage() {
  redirect("/dashboards")
}
