import { NextResponse } from "next/server"

import { getCurrentSession, getSessionReadOnly } from "@/lib/auth-session"
import { acessoLivreLiberado, USUARIO_DEV } from "@/lib/dev-auth"
import {
  resolverAcessoEpi,
  podeConfigurar,
  podeParametrizar,
  type AcessoEpi,
} from "@/lib/epi/papeis"
import { escopoDoUsuario, podeVerValidacoes, type EscopoUsuario } from "@/lib/epi/escopo"

/**
 * Guardas de acesso do módulo de EPI.
 *
 * Precisam honrar o ACESSO LIVRE de desenvolvimento (o layout já pula a sessão e
 * usa um admin fictício sem cookie). Sem isso, os route handlers dariam 401 em
 * dev. Em produção, caem na sessão real do global_auth.
 */

export type UsuarioAtual = {
  authUserId: string | null
  nome: string | null
  email: string | null
  isAdmin: boolean
}

/**
 * Usuário atual para SERVER COMPONENTS (páginas). Não grava cookies. Retorna null
 * quando anônimo (a página decide redirecionar). Em acesso livre, devolve o admin
 * fictício.
 */
export async function getUsuarioAtual(): Promise<UsuarioAtual | null> {
  if (acessoLivreLiberado()) {
    return { authUserId: null, nome: USUARIO_DEV.nome, email: null, isAdmin: USUARIO_DEV.isAdmin }
  }
  const resultado = await getSessionReadOnly()
  if (resultado.status !== "ok") return null
  const { sessao } = resultado
  return {
    authUserId: sessao.user.id ?? null,
    nome: sessao.authorization.nome,
    email: sessao.user.email,
    isAdmin: sessao.authorization.isAdmin,
  }
}

/** Usuário atual para ROUTE HANDLERS (pode rotacionar cookies). */
async function usuarioAtualHandler(): Promise<UsuarioAtual | null> {
  if (acessoLivreLiberado()) {
    return { authUserId: null, nome: USUARIO_DEV.nome, email: null, isAdmin: USUARIO_DEV.isAdmin }
  }
  const sessao = await getCurrentSession()
  if (!sessao) return null
  return {
    authUserId: sessao.user.id ?? null,
    nome: sessao.authorization.nome,
    email: sessao.user.email,
    isAdmin: sessao.authorization.isAdmin,
  }
}

export type ResultadoGuarda =
  | { ok: true; usuario: UsuarioAtual; acesso: AcessoEpi }
  | { ok: false; response: NextResponse }

function negar(status: number, mensagem: string): { ok: false; response: NextResponse } {
  return { ok: false, response: NextResponse.json({ error: mensagem }, { status }) }
}

async function resolver(usuario: UsuarioAtual): Promise<AcessoEpi> {
  return resolverAcessoEpi({ authUserId: usuario.authUserId, isAdmin: usuario.isAdmin })
}

/** Exige poder CONFIGURAR (admin). Para as telas de cliente/turno/checklist/membro. */
export async function guardaConfig(): Promise<ResultadoGuarda> {
  const usuario = await usuarioAtualHandler()
  if (!usuario) return negar(401, "Não autorizado")
  const acesso = await resolver(usuario)
  if (!podeConfigurar(acesso)) return negar(403, "Acesso restrito a administradores")
  return { ok: true, usuario, acesso }
}

/** Exige poder PARAMETRIZAR (admin ou parametrizador). Para a atribuição de turnos. */
export async function guardaParametrizador(): Promise<ResultadoGuarda> {
  const usuario = await usuarioAtualHandler()
  if (!usuario) return negar(401, "Não autorizado")
  const acesso = await resolver(usuario)
  if (!podeParametrizar(acesso)) return negar(403, "Acesso restrito à configuração de EPI")
  return { ok: true, usuario, acesso }
}

export type ResultadoGuardaEscopo =
  | { ok: true; usuario: UsuarioAtual; acesso: AcessoEpi; escopo: EscopoUsuario }
  | { ok: false; response: NextResponse }

/** Exige poder VALIDAR: admin, ou responsável (líder) de ao menos um turno. */
export async function guardaValidador(): Promise<ResultadoGuardaEscopo> {
  const usuario = await usuarioAtualHandler()
  if (!usuario) return negar(401, "Não autorizado")
  const acesso = await resolver(usuario)
  const escopo = await escopoDoUsuario(acesso, usuario.authUserId)
  if (!podeVerValidacoes(escopo)) return negar(403, "Acesso restrito a líderes e administradores")
  return { ok: true, usuario, acesso, escopo }
}

/** Acesso de EPI do usuário atual (+ escopo), para as páginas decidirem o que mostrar. */
export async function getAcessoEpiAtual(): Promise<
  { usuario: UsuarioAtual; acesso: AcessoEpi; escopo: EscopoUsuario } | null
> {
  const usuario = await getUsuarioAtual()
  if (!usuario) return null
  const acesso = await resolver(usuario)
  const escopo = await escopoDoUsuario(acesso, usuario.authUserId)
  return { usuario, acesso, escopo }
}
