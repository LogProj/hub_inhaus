/**
 * ACESSO LIVRE — MODO DE DESENVOLVIMENTO APENAS.
 *
 * Permite navegar o hub sem as credenciais do `global_auth`, para conseguir
 * revisar o design das telas antes de a autenticação estar configurada.
 *
 * TRAVA DUPLA, de propósito:
 *   1. `NODE_ENV !== "production"` — some sozinho em qualquer build de produção,
 *      mesmo que alguém esqueça a variável ligada no ambiente.
 *   2. `HUB_ACESSO_LIVRE === "1"` — precisa ser ligado explicitamente no
 *      `.env.local`, então não basta rodar `npm run dev` para o hub ficar aberto.
 *
 * Para desligar: apague `HUB_ACESSO_LIVRE` do `.env.local` (ou mude para "0")
 * e reinicie o servidor. A partir daí o login volta a ser obrigatório.
 */

export function acessoLivreLiberado(): boolean {
  return process.env.NODE_ENV !== "production" && process.env.HUB_ACESSO_LIVRE === "1"
}

/** Usuário fictício usado só no acesso livre. Admin, para enxergar todas as telas. */
export const USUARIO_DEV = {
  nome: "Visitante",
  isAdmin: true,
  visibleScreens: [] as string[],
}
