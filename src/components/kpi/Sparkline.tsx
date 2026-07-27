import { cn } from "@/lib/utils"

type Ponto = readonly [x: number, y: number]

type SparklineProps = {
  /** Série de valores a plotar — a Home usa 12 pontos (um por mês). */
  pontos: number[]
  className?: string
}

const LARGURA = 120
const ALTURA = 32

/**
 * Converte a série em coordenadas de SVG, normalizando o range de valores
 * para a altura disponível (maior valor encosta no topo, menor na base).
 */
function paraCoordenadas(pontos: number[]): Ponto[] {
  const minimo = Math.min(...pontos)
  const maximo = Math.max(...pontos)
  const alcance = maximo - minimo || 1
  const passo = pontos.length > 1 ? LARGURA / (pontos.length - 1) : 0

  return pontos.map((valor, indice) => {
    const x = indice * passo
    const y = ALTURA - ((valor - minimo) / alcance) * ALTURA
    return [x, y] as const
  })
}

/**
 * Curva Catmull-Rom (tensão uniforme) convertida em segmentos cúbicos de
 * Bézier — produz uma linha suave sem depender de biblioteca de gráficos.
 */
function paraPathSuavizado(coordenadas: Ponto[]): string {
  if (coordenadas.length === 0) return ""
  if (coordenadas.length === 1) {
    const [x, y] = coordenadas[0]
    return `M${x},${y}`
  }

  let d = `M${coordenadas[0][0]},${coordenadas[0][1]}`

  for (let i = 0; i < coordenadas.length - 1; i++) {
    const p0 = coordenadas[i - 1] ?? coordenadas[i]
    const p1 = coordenadas[i]
    const p2 = coordenadas[i + 1]
    const p3 = coordenadas[i + 2] ?? p2

    const c1x = p1[0] + (p2[0] - p0[0]) / 6
    const c1y = p1[1] + (p2[1] - p0[1]) / 6
    const c2x = p2[0] - (p3[0] - p1[0]) / 6
    const c2y = p2[1] - (p3[1] - p1[1]) / 6

    d += ` C${c1x.toFixed(2)},${c1y.toFixed(2)} ${c2x.toFixed(2)},${c2y.toFixed(2)} ${p2[0].toFixed(2)},${p2[1].toFixed(2)}`
  }

  return d
}

/**
 * Sparkline de 12 pontos em SVG, linha suavizada por Catmull-Rom e área com
 * gradiente teal por baixo. O traçado se desenha uma vez via
 * `stroke-dashoffset` normalizado por `pathLength` — não depende de JS, então
 * o componente pode ser um Server Component. `prefers-reduced-motion` já
 * neutraliza a animação globalmente (`globals.css`).
 */
export function Sparkline({ pontos, className }: SparklineProps) {
  const coordenadas = paraCoordenadas(pontos)
  const linha = paraPathSuavizado(coordenadas)
  const area =
    coordenadas.length > 0
      ? `${linha} L${LARGURA},${ALTURA} L0,${ALTURA} Z`
      : ""
  const idGradiente = "sparkline-area"

  return (
    <svg
      viewBox={`0 0 ${LARGURA} ${ALTURA}`}
      preserveAspectRatio="none"
      className={cn("block h-8 w-full", className)}
      aria-hidden="true"
    >
      <style>{`
        @keyframes sparkline-desenhar {
          from { stroke-dashoffset: 1; }
          to { stroke-dashoffset: 0; }
        }
      `}</style>
      <defs>
        <linearGradient id={idGradiente} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="hsl(var(--teal) / 0.12)" />
          <stop offset="100%" stopColor="hsl(var(--teal) / 0)" />
        </linearGradient>
      </defs>
      {area && <path d={area} fill={`url(#${idGradiente})`} stroke="none" />}
      <path
        d={linha}
        fill="none"
        stroke="hsl(var(--teal))"
        strokeWidth={1.5}
        strokeLinecap="round"
        pathLength={1}
        style={{
          strokeDasharray: 1,
          strokeDashoffset: 1,
          animation: "sparkline-desenhar 800ms cubic-bezier(0.22, 1, 0.36, 1) 1 both",
        }}
      />
    </svg>
  )
}
