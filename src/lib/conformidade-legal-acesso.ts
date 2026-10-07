import { acessoLivreLiberado } from "@/lib/dev-auth"
import { getSessionReadOnly } from "@/lib/auth-session"
import { resolverEscopoDados, type EscopoDados } from "@/lib/seguranca/escopo-dados"

/** Mesmo escopo nas telas gerencial e analítica. Os filtros nunca ampliam a autorização. */
export async function escopoConformidadeAtual(): Promise<EscopoDados> {
  if (acessoLivreLiberado()) return { tipo: "todos" }
  const resultado = await getSessionReadOnly()
  if (resultado.status !== "ok") return { tipo: "lista", crs: [] }
  return resolverEscopoDados({
    authUserId: resultado.sessao.user.id,
    isAdmin: resultado.sessao.authorization.isAdmin,
    classificacao: resultado.sessao.authorization.classificacao,
  })
}
