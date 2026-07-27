import { cn } from "@/lib/utils"
import { Aurora } from "./Aurora"
import { DataMesh } from "./DataMesh"
import { DepthGradient } from "./DepthGradient"

/**
 * Composição das três camadas de atmosfera, dosadas por `intensidade`.
 *
 * Server Component: puramente marcação e CSS, sem estado. O contêiner é
 * decorativo — `aria-hidden` e `overflow-hidden` — e nunca deve competir com
 * o conteúdo real da tela pela atenção do leitor de tela ou pelo layout.
 */

export type Intensidade = "cheia" | "media" | "sutil" | "homeopatica"

type AtmosphereProps = {
  intensidade: Intensidade
  /** No tema claro sobre canvas mist, só a aurora entra (intensidade "homeopatica"). */
  className?: string
}

type OpacidadesCamadas = {
  gradiente: number
  malha: number
  aurora: number
}

/** Mapa de intensidade → opacidade (0–100) de cada camada. Ver Task 7 do plano de fundação visual. */
const MAPA_INTENSIDADE: Record<Intensidade, OpacidadesCamadas> = {
  cheia: { gradiente: 100, malha: 100, aurora: 100 },
  media: { gradiente: 100, malha: 60, aurora: 80 },
  sutil: { gradiente: 100, malha: 30, aurora: 0 },
  homeopatica: { gradiente: 0, malha: 0, aurora: 3 },
}

export function Atmosphere({ intensidade, className }: AtmosphereProps): JSX.Element {
  const camadas = MAPA_INTENSIDADE[intensidade]

  return (
    <div
      aria-hidden="true"
      className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)}
    >
      {camadas.gradiente > 0 && <DepthGradient opacidade={camadas.gradiente} />}
      {camadas.malha > 0 && <DataMesh opacidade={camadas.malha} />}
      {camadas.aurora > 0 && <Aurora opacidade={camadas.aurora} />}
    </div>
  )
}
