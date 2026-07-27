import type { Metadata } from "next"
import Link from "next/link"
import { Compass } from "lucide-react"

import { Button } from "@/components/ui/button"
import { InhausLogo } from "@/components/brand/InhausLogo"

export const metadata: Metadata = {
  title: "Página não encontrada",
}

/**
 * 404 global. Vive na raiz de `src/app` — quando a rota não bate com nenhum
 * segmento, o Next renderiza este arquivo direto sob o layout raiz, sem o
 * shell dos dashboards. Por isso o fundo e o centering são resolvidos aqui.
 */
export default function NotFound() {
  return (
    <div className="grid min-h-dvh place-items-center bg-inhaus-radial px-6">
      <div className="w-full max-w-md text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-tint text-teal">
          <Compass className="h-7 w-7" />
        </div>
        <h1 className="mt-6 font-display text-3xl font-semibold tracking-tight text-foreground">
          Essa página ainda não existe
        </h1>
        <p className="mt-3 text-muted-foreground">
          O endereço pode ter mudado ou a tela ainda está em construção.
        </p>
        <div className="mt-8 flex justify-center">
          <Button asChild variant="gradient">
            <Link href="/dashboards">Voltar para o hub</Link>
          </Button>
        </div>
        <div className="mt-10 flex justify-center opacity-70">
          <InhausLogo className="h-5" />
        </div>
      </div>
    </div>
  )
}
