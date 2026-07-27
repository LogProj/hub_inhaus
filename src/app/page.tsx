import { redirect } from "next/navigation"

/**
 * A raiz não tem conteúdo próprio: manda para a Home. Quem não tem sessão é
 * desviado para o login pelo middleware, com `?next=/home` preservado.
 */
export default function RaizPage() {
  redirect("/home")
}
