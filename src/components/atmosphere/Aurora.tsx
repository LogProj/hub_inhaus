/**
 * Camada 3 da atmosfera — dois blobs de luz teal derivando devagar.
 *
 * A cor vem só de tokens (`--teal`, `--teal-bright`) via valor arbitrário do
 * Tailwind — nenhum hexadecimal solto. `animate-drift` já está registrado em
 * `tailwind.config.ts`; aqui só variamos o atraso para que os dois blobs não
 * derivem em sincronia.
 *
 * Server Component, sem estado.
 */

type AuroraProps = {
  /** Opacidade da camada, de 0 a 100 — controlada pelo mapa de intensidade do `Atmosphere`. */
  opacidade?: number
}

export function Aurora({ opacidade = 100 }: AuroraProps): JSX.Element {
  return (
    <div className="pointer-events-none absolute inset-0" style={{ opacity: opacidade / 100 }}>
      <div className="absolute left-[8%] top-[12%] h-72 w-72 animate-drift rounded-full bg-[hsl(var(--teal)/0.08)] blur-[80px] [animation-delay:0s]" />
      <div className="absolute right-[10%] top-[42%] h-96 w-96 animate-drift rounded-full bg-[hsl(var(--teal-bright)/0.06)] blur-[80px] [animation-delay:-18s]" />
    </div>
  )
}
