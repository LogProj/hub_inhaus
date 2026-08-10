import type { Metadata } from "next"
import { redirect } from "next/navigation"

import { getSessionReadOnly } from "@/lib/auth-session"
import { acessoLivreLiberado } from "@/lib/dev-auth"
import { TODAS_AS_TELAS } from "@/lib/domains"
import { UsuariosAdmin } from "@/components/admin/UsuariosAdmin"

export const metadata: Metadata = { title: "Usuários" }
export const dynamic = "force-dynamic"

export default async function UsuariosPage() {
  // Gating admin — honra o acesso livre de dev (Visitante é admin).
  const dev = acessoLivreLiberado()
  let isAdmin = dev
  let meuEmail: string | null = null

  if (!dev) {
    const r = await getSessionReadOnly()
    if (r.status !== "ok") redirect("/login")
    isAdmin = r.sessao.authorization.isAdmin
    meuEmail = r.sessao.user.email
  }
  if (!isAdmin) redirect("/dashboards")

  // Telas do hub para o seletor "quais painéis o usuário pode ver" (autorização local).
  const telaOptions = TODAS_AS_TELAS.map((t) => ({
    value: t.key,
    label: `${t.dominioLabel} · ${t.label}`,
  }))

  return (
    <UsuariosAdmin
      telaOptions={telaOptions}
      meuEmail={meuEmail}
      globalConfigurado={Boolean(process.env.AUTH_BASE_URL)}
    />
  )
}
