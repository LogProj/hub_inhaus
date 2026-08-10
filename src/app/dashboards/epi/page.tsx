import { redirect } from "next/navigation"

// A configuração do EPI agora é um assistente guiado. A antiga visão geral
// redireciona para ele.
export default function EpiIndexPage() {
  redirect("/dashboards/epi/configurar")
}
