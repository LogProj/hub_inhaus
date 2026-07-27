/**
 * Camada 1 da atmosfera — gradiente radial de profundidade.
 *
 * "Profundidade no ambiente, planura nos dados": este gradiente dá volume ao
 * fundo navy; nunca é usado atrás de um painel que carregue número.
 *
 * Server Component, sem estado, sem interatividade.
 */

type DepthGradientProps = {
  /** Opacidade da camada, de 0 a 100 — controlada pelo mapa de intensidade do `Atmosphere`. */
  opacidade?: number
}

export function DepthGradient({ opacidade = 100 }: DepthGradientProps): JSX.Element {
  return (
    <div
      className="pointer-events-none absolute inset-0"
      style={{
        opacity: opacidade / 100,
        // Gradiente construído a partir dos tokens de marca (var(--navy) e
        // var(--navy-deep)) — não um valor de cor fixo. Esta é a única
        // exceção permitida à regra do hexadecimal solto em componente,
        // porque o valor em si vem do token, não de um literal de cor.
        background:
          "radial-gradient(120% 100% at 30% 20%, hsl(var(--navy)) 0%, hsl(var(--navy-deep)) 100%)",
      }}
    />
  )
}
