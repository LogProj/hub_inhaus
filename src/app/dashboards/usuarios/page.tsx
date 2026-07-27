import type { Metadata } from "next"
import { EmConstrucao } from "@/components/dashboard/EmConstrucao"

export const metadata: Metadata = { title: "Usuários" }

export default function UsuariosPage() {
  return (
    <div className="mx-auto max-w-6xl">
      <EmConstrucao
        dominioLabel="Administração"
        titulo="Usuários"
        descricao="Vai permitir conceder e revogar acesso ao hub, definir quem é administrador e escolher, por pessoa, quais painéis cada usuário pode ver. É aqui que a gestão controla quem enxerga cada indicador."
      />
    </div>
  )
}
