/**
 * Camada 2 da atmosfera — malha de dados em SVG.
 *
 * Uma grade fina (linhas a cada 32px) sugere "dado" sem representar dado
 * nenhum, e um punhado de pontos nas interseções pulsa devagar, como se algo
 * estivesse sempre sendo medido em segundo plano.
 *
 * Server Component: nenhum valor vem de `Math.random()` — a duração e o
 * atraso de cada pulso vêm de uma tabela fixa indexada pela posição do
 * ponto, para que o HTML do servidor bata exatamente com o do cliente e não
 * haja erro de hidratação.
 */

type DataMeshProps = {
  /** Opacidade da camada, de 0 a 100 — controlada pelo mapa de intensidade do `Atmosphere`. */
  opacidade?: number
}

const LARGURA_VIEWBOX = 800
const ALTURA_VIEWBOX = 400
const PASSO_GRADE = 32

/** Colunas e linhas onde os pontos da malha são desenhados — grade determinística. */
const COLUNAS = [0, 80, 160, 240, 320, 400, 480, 560, 640, 720, 800]
const LINHAS = [40, 140, 240, 340]

const PONTOS_MALHA = COLUNAS.flatMap((x) => LINHAS.map((y) => ({ x, y })))

/** Índices (dentro de PONTOS_MALHA) que pulsam — cerca de 12, o resto fica estático. */
const INDICES_PULSO = [1, 4, 7, 10, 13, 17, 21, 25, 29, 33, 37, 41]

/** Duração e atraso fixos por posição do pulso — determinístico, sem Math.random. */
const RITMOS_PULSO = [
  { duracao: "6s", atraso: "0s" },
  { duracao: "7s", atraso: "0.8s" },
  { duracao: "8s", atraso: "1.6s" },
  { duracao: "6.5s", atraso: "2.4s" },
  { duracao: "9s", atraso: "3.2s" },
  { duracao: "7.5s", atraso: "4s" },
  { duracao: "10s", atraso: "4.8s" },
  { duracao: "6s", atraso: "5.6s" },
  { duracao: "8.5s", atraso: "6.4s" },
  { duracao: "7s", atraso: "7.2s" },
  { duracao: "9.5s", atraso: "8s" },
  { duracao: "6.5s", atraso: "5s" },
] as const

export function DataMesh({ opacidade = 100 }: DataMeshProps): JSX.Element {
  return (
    <svg
      className="pointer-events-none absolute inset-0 h-full w-full"
      style={{ opacity: opacidade / 100 }}
      viewBox={`0 0 ${LARGURA_VIEWBOX} ${ALTURA_VIEWBOX}`}
      preserveAspectRatio="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <pattern
          id="inhaus-malha-grade"
          width={PASSO_GRADE}
          height={PASSO_GRADE}
          patternUnits="userSpaceOnUse"
        >
          <path
            d={`M ${PASSO_GRADE} 0 L 0 0 0 ${PASSO_GRADE}`}
            fill="none"
            stroke="white"
            strokeOpacity={0.04}
            strokeWidth={1}
          />
        </pattern>
      </defs>
      <rect width={LARGURA_VIEWBOX} height={ALTURA_VIEWBOX} fill="url(#inhaus-malha-grade)" />
      {PONTOS_MALHA.map((ponto, indice) => {
        const posicaoPulso = INDICES_PULSO.indexOf(indice)
        const pulsa = posicaoPulso !== -1
        const ritmo = pulsa ? RITMOS_PULSO[posicaoPulso] : undefined

        return (
          <circle
            key={`${ponto.x}-${ponto.y}`}
            cx={ponto.x}
            cy={ponto.y}
            r={1.2}
            fill="white"
            fillOpacity={pulsa ? undefined : 0.15}
            className={pulsa ? "animate-[mesh-pulse_var(--dur)_ease-in-out_infinite]" : undefined}
            style={
              ritmo
                ? ({
                    "--dur": ritmo.duracao,
                    animationDelay: ritmo.atraso,
                  } as React.CSSProperties)
                : undefined
            }
          />
        )
      })}
    </svg>
  )
}
