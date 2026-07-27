"use client"

import { useEffect } from "react"
import { EmptyState } from "@/components/states/EmptyState"

type ErrorAppProps = {
  error: Error & { digest?: string }
  reset: () => void
}

/**
 * Error boundary do grupo `(app)`. Precisa de "use client" — exigência do
 * Next.js para `error.tsx`. NUNCA exibir stack trace ou mensagem técnica ao
 * usuário: o erro completo só vai para o console, para quem for investigar.
 */
export default function ErrorApp({ error, reset }: ErrorAppProps) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="grid min-h-[60vh] place-items-center">
      <EmptyState
        titulo="Algo não saiu como esperado."
        descricao="A equipe técnica já foi avisada. Tente novamente em instantes."
        acao={{ label: "Tentar de novo", onClick: reset }}
      />
    </div>
  )
}
