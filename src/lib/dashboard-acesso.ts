import { headers } from "next/headers"
import { redirect } from "next/navigation"

import { getSessionReadOnly } from "@/lib/auth-session"
import { acessoLivreLiberado, USUARIO_DEV } from "@/lib/dev-auth"
import { resolverAcessoEpi, podeConfigurar } from "@/lib/epi/papeis"
import { escopoDoUsuario, podeVerValidacoes } from "@/lib/epi/escopo"

/**
 * Papéis do usuário no shell do dashboard, resolvidos UMA vez e reaproveitados
 * pelo layout, pela Home (redirecionamento por perfil) e pela lista de Checklists.
 *
 *  - `epiConfig`  = admin/Segurança: configura tudo (Configurar/Checklists/Líderes).
 *  - `epiValida`  = admin/Segurança/líder: pode preencher a Utilização de EPIs.
 *  - `soPreenche` = líder puro (valida, mas não configura nem é admin). Este é o
 *    usuário "de chão de fábrica": no celular ele NÃO vê a sidebar e cai direto na
 *    lista de checklists ao logar.
 */
export type PapeisDashboard = {
  nome: string | null
  email: string | null
  isAdmin: boolean
  epiConfig: boolean
  epiValida: boolean
  soPreenche: boolean
}

export async function resolverPapeisDashboard(next = "/dashboards"): Promise<PapeisDashboard> {
  // Acesso livre (dev): admin fictício enxerga tudo — nunca é "só preenche".
  if (acessoLivreLiberado()) {
    return {
      nome: USUARIO_DEV.nome,
      email: null,
      isAdmin: USUARIO_DEV.isAdmin,
      epiConfig: true,
      epiValida: true,
      soPreenche: false,
    }
  }

  const resultado = await getSessionReadOnly()
  if (resultado.status === "anonimo") redirect("/login")
  if (resultado.status === "renovar") {
    const path = headers().get("x-invoke-path") ?? next
    redirect(`/api/auth/refresh?next=${encodeURIComponent(path)}`)
  }

  const { sessao } = resultado
  const acessoEpi = await resolverAcessoEpi({
    authUserId: sessao.user.id,
    isAdmin: sessao.authorization.isAdmin,
  })
  const escopoEpi = await escopoDoUsuario(acessoEpi, sessao.user.id)
  const isAdmin = sessao.authorization.isAdmin
  const epiConfig = podeConfigurar(acessoEpi)
  const epiValida = podeVerValidacoes(escopoEpi)

  return {
    nome: sessao.authorization.nome,
    email: sessao.user.email,
    isAdmin,
    epiConfig,
    epiValida,
    soPreenche: epiValida && !epiConfig && !isAdmin,
  }
}
