"use client"

import { useEffect, useRef } from "react"

/**
 * Fundo da tela de login: ROTAS DE TRANSPORTE FLUINDO. Poucas trajetórias
 * curvas cruzam a tela inteira — entrando e saindo pelas bordas — e pulsos de
 * luz correm por elas, como cargas/dados em trânsito. Minimalista e high-tech:
 * as curvas são discretas; os pulsos é que dão o movimento. As curvas ainda
 * "respiram" de leve (pontos de controle oscilando) para não parecerem rígidas.
 *
 * Identidade: logística (rotas, hubs) + tecnologia (fluxo, dados). Canvas 2D,
 * 100% determinístico (sem Math.random / Date.now): tudo vem de tabelas fixas e
 * senoides com fase própria.
 *
 * Comportamento:
 *  - fundo em gradiente vertical navy-ink -> navy;
 *  - ~7 rotas (curvas Bézier) atravessando a tela, várias passando pelo centro
 *    (atrás do card), com extremidades fora da tela;
 *  - pulsos de luz com rastro percorrendo as rotas em loop, escalonados;
 *  - alguns hubs discretos onde as rotas se encontram;
 *  - respeita prefers-reduced-motion (frame estático) e pausa com a aba oculta.
 */

// Paleta In-Haus usada direto no canvas (mesma exceção do HeroCanvas).
const COR_NAVY_INK = "#00121F"
const COR_NAVY = "#002443"
const COR_TEAL = "#027193"
const COR_TEAL_SOFT = "#4FA8C4"
const COR_BRANCO = "#FFFFFF"

// Rotas como curvas Bézier cúbicas (4 pontos de controle em coordenadas
// normalizadas). Extremidades além de [0..1] fazem a rota entrar/sair da tela.
type Rota = { pts: [number, number][] }
const ROTAS: Rota[] = [
  { pts: [[-0.1, 0.26], [0.28, 0.05], [0.66, 0.2], [1.1, 0.12]] }, // 0 — varredura superior L→R
  { pts: [[0.08, -0.1], [0.24, 0.32], [0.5, 0.46], [0.62, 1.1]] }, // 1 — diagonal descendo
  { pts: [[-0.1, 0.52], [0.16, 0.4], [0.22, 0.74], [0.04, 1.1]] }, // 2 — arco à esquerda
  { pts: [[-0.05, 0.16], [0.36, 0.46], [0.66, 0.54], [1.06, 0.84]] }, // 3 — grande diagonal (atrás do card)
  { pts: [[1.1, 0.24], [0.86, 0.46], [0.92, 0.72], [1.04, 1.05]] }, // 4 — arco à direita
  { pts: [[1.1, 0.82], [0.68, 1.02], [0.3, 0.84], [-0.1, 0.96]] }, // 5 — varredura inferior R→L
  { pts: [[-0.1, 0.64], [0.36, 0.74], [0.7, 0.54], [1.1, 0.66]] }, // 6 — arco central (atrás do card)
]

// Hubs discretos (coordenadas normalizadas) onde rotas se cruzam — pequenos
// pontos com glow, para reforçar a ideia de rede logística.
const HUBS: [number, number][] = [
  [0.22, 0.16],
  [0.62, 0.24],
  [0.4, 0.5],
  [0.8, 0.62],
  [0.5, 0.82],
]

// Pulsos de luz percorrendo rotas específicas. Vários por rota, escalonados,
// com durações diferentes para um fluxo calmo e não sincronizado.
type Pulso = { rota: number; duracaoMs: number; fase: number }
const PULSOS: Pulso[] = [
  { rota: 0, duracaoMs: 9000, fase: 0.0 },
  { rota: 0, duracaoMs: 9000, fase: 0.5 },
  { rota: 1, duracaoMs: 11000, fase: 0.2 },
  { rota: 2, duracaoMs: 10000, fase: 0.65 },
  { rota: 3, duracaoMs: 13000, fase: 0.1 },
  { rota: 3, duracaoMs: 13000, fase: 0.55 },
  { rota: 4, duracaoMs: 9500, fase: 0.35 },
  { rota: 5, duracaoMs: 12000, fase: 0.8 },
  { rota: 6, duracaoMs: 10500, fase: 0.25 },
  { rota: 6, duracaoMs: 10500, fase: 0.7 },
]

// Amplitude do "respiro" dos pontos de controle (normalizada).
const AMP_RESPIRO = 0.016

function hexParaRgb(hex: string): [number, number, number] {
  const v = hex.replace("#", "")
  return [
    parseInt(v.substring(0, 2), 16),
    parseInt(v.substring(2, 4), 16),
    parseInt(v.substring(4, 6), 16),
  ]
}

function rgba(hex: string, alpha: number): string {
  const [r, g, b] = hexParaRgb(hex)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

// Ponto sobre uma Bézier cúbica (4 pontos em px).
function bezier(p: number[][], t: number): { x: number; y: number } {
  const u = 1 - t
  const w0 = u * u * u
  const w1 = 3 * u * u * t
  const w2 = 3 * u * t * t
  const w3 = t * t * t
  return {
    x: w0 * p[0][0] + w1 * p[1][0] + w2 * p[2][0] + w3 * p[3][0],
    y: w0 * p[0][1] + w1 * p[1][1] + w2 * p[2][1] + w3 * p[3][1],
  }
}

export function FluxoCanvas({ className }: { className?: string }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const container = containerRef.current
    const canvas = canvasRef.current
    if (!container || !canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    let raf = 0
    let largura = 0
    let altura = 0
    let dpr = Math.min(2, typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1)

    const reduzMovimento =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches

    const redimensionar = () => {
      const rect = container.getBoundingClientRect()
      largura = Math.max(1, rect.width)
      altura = Math.max(1, rect.height)
      canvas.width = Math.round(largura * dpr)
      canvas.height = Math.round(altura * dpr)
      canvas.style.width = `${largura}px`
      canvas.style.height = `${altura}px`
      ctx.setTransform(1, 0, 0, 1, 0, 0)
      ctx.scale(dpr, dpr)
    }
    redimensionar()

    const resizeObserver = new ResizeObserver(() => {
      dpr = Math.min(2, window.devicePixelRatio || 1)
      redimensionar()
    })
    resizeObserver.observe(container)

    // Pontos de controle de uma rota, em px, com "respiro" senoidal por ponto.
    function pontosRota(indiceRota: number, tempoMs: number): number[][] {
      const base = ROTAS[indiceRota].pts
      return base.map(([bx, by], k) => {
        const ox = Math.sin(tempoMs * 0.0003 + indiceRota * 1.3 + k * 0.7) * AMP_RESPIRO
        const oy = Math.cos(tempoMs * 0.00026 + indiceRota * 0.9 + k * 1.1) * AMP_RESPIRO
        return [(bx + ox) * largura, (by + oy) * altura]
      })
    }

    function desenhaFundo() {
      const grad = ctx!.createLinearGradient(0, 0, 0, altura)
      grad.addColorStop(0, COR_NAVY_INK)
      grad.addColorStop(1, COR_NAVY)
      ctx!.fillStyle = grad
      ctx!.fillRect(0, 0, largura, altura)
    }

    function desenhaRota(p: number[][]) {
      // halo aditivo largo e discreto
      ctx!.save()
      ctx!.globalCompositeOperation = "lighter"
      ctx!.beginPath()
      ctx!.moveTo(p[0][0], p[0][1])
      ctx!.bezierCurveTo(p[1][0], p[1][1], p[2][0], p[2][1], p[3][0], p[3][1])
      ctx!.strokeStyle = rgba(COR_TEAL_SOFT, 0.04)
      ctx!.lineWidth = 3
      ctx!.stroke()
      ctx!.restore()

      // fio-base tênue
      ctx!.beginPath()
      ctx!.moveTo(p[0][0], p[0][1])
      ctx!.bezierCurveTo(p[1][0], p[1][1], p[2][0], p[2][1], p[3][0], p[3][1])
      ctx!.strokeStyle = rgba(COR_TEAL_SOFT, 0.12)
      ctx!.lineWidth = 1
      ctx!.stroke()
    }

    function desenhaHub(nx: number, ny: number, indice: number, tempoMs: number) {
      const x = nx * largura
      const y = ny * altura
      const pulso = 0.5 + 0.5 * Math.sin(tempoMs * 0.0008 + indice * 1.4)
      const raioGlow = 18 + pulso * 4

      ctx!.save()
      ctx!.globalCompositeOperation = "lighter"
      const halo = ctx!.createRadialGradient(x, y, 0, x, y, raioGlow)
      halo.addColorStop(0, rgba(COR_TEAL_SOFT, 0.4 + pulso * 0.2))
      halo.addColorStop(0.5, rgba(COR_TEAL, 0.18))
      halo.addColorStop(1, rgba(COR_TEAL_SOFT, 0))
      ctx!.fillStyle = halo
      ctx!.beginPath()
      ctx!.arc(x, y, raioGlow, 0, Math.PI * 2)
      ctx!.fill()
      ctx!.restore()

      ctx!.beginPath()
      ctx!.arc(x, y, 1.6, 0, Math.PI * 2)
      ctx!.fillStyle = rgba(COR_BRANCO, 0.85)
      ctx!.fill()
    }

    function desenhaPulso(pulso: Pulso, p: number[][], tempoMs: number) {
      const ciclo = tempoMs / pulso.duracaoMs + pulso.fase
      const t = ciclo - Math.floor(ciclo) // 0..1
      const cabeca = bezier(p, t)

      ctx!.save()
      ctx!.globalCompositeOperation = "lighter"

      // rastro: pontos atrás da cabeça ao longo da curva
      const passos = 12
      for (let i = passos; i >= 1; i--) {
        const tt = t - i * 0.012
        if (tt < 0) continue
        const q = bezier(p, tt)
        const queda = 1 - i / passos
        ctx!.beginPath()
        ctx!.arc(q.x, q.y, 1.1 + queda * 1.8, 0, Math.PI * 2)
        ctx!.fillStyle = rgba(COR_TEAL_SOFT, queda * 0.5)
        ctx!.fill()
      }

      // cabeça com glow
      const grad = ctx!.createRadialGradient(cabeca.x, cabeca.y, 0, cabeca.x, cabeca.y, 11)
      grad.addColorStop(0, rgba(COR_BRANCO, 1))
      grad.addColorStop(0.35, rgba(COR_TEAL_SOFT, 0.7))
      grad.addColorStop(1, rgba(COR_TEAL, 0))
      ctx!.fillStyle = grad
      ctx!.beginPath()
      ctx!.arc(cabeca.x, cabeca.y, 11, 0, Math.PI * 2)
      ctx!.fill()

      ctx!.restore()

      ctx!.beginPath()
      ctx!.arc(cabeca.x, cabeca.y, 1.6, 0, Math.PI * 2)
      ctx!.fillStyle = COR_BRANCO
      ctx!.fill()
    }

    function desenhaFrame(tempoMs: number) {
      ctx!.clearRect(0, 0, largura, altura)
      desenhaFundo()

      const pontos = ROTAS.map((_, i) => pontosRota(i, tempoMs))
      pontos.forEach((p) => desenhaRota(p))
      HUBS.forEach(([nx, ny], i) => desenhaHub(nx, ny, i, tempoMs))
      PULSOS.forEach((pulso) => desenhaPulso(pulso, pontos[pulso.rota], tempoMs))
    }

    if (reduzMovimento) {
      // Frame estático: rotas em repouso, pulsos no meio das rotas.
      ctx.clearRect(0, 0, largura, altura)
      desenhaFundo()
      const pontos = ROTAS.map((rota) => rota.pts.map(([bx, by]) => [bx * largura, by * altura]))
      pontos.forEach((p) => desenhaRota(p))
      HUBS.forEach(([nx, ny], i) => desenhaHub(nx, ny, i, 0))
      PULSOS.forEach((pulso) => {
        const q = bezier(pontos[pulso.rota], 0.5)
        ctx.save()
        ctx.globalCompositeOperation = "lighter"
        const grad = ctx.createRadialGradient(q.x, q.y, 0, q.x, q.y, 11)
        grad.addColorStop(0, rgba(COR_BRANCO, 1))
        grad.addColorStop(0.35, rgba(COR_TEAL_SOFT, 0.7))
        grad.addColorStop(1, rgba(COR_TEAL, 0))
        ctx.fillStyle = grad
        ctx.beginPath()
        ctx.arc(q.x, q.y, 11, 0, Math.PI * 2)
        ctx.fill()
        ctx.restore()
      })
      return () => {
        resizeObserver.disconnect()
      }
    }

    const inicio = performance.now()
    let pausado = document.hidden

    const loop = (agora: number) => {
      if (pausado) return
      desenhaFrame(agora - inicio)
      raf = requestAnimationFrame(loop)
    }

    const aoMudarVisibilidade = () => {
      pausado = document.hidden
      if (!pausado) {
        cancelAnimationFrame(raf)
        raf = requestAnimationFrame(loop)
      } else {
        cancelAnimationFrame(raf)
      }
    }
    document.addEventListener("visibilitychange", aoMudarVisibilidade)

    raf = requestAnimationFrame(loop)

    return () => {
      cancelAnimationFrame(raf)
      resizeObserver.disconnect()
      document.removeEventListener("visibilitychange", aoMudarVisibilidade)
    }
  }, [])

  return (
    <div ref={containerRef} aria-hidden="true" className={className}>
      <canvas ref={canvasRef} style={{ display: "block", width: "100%", height: "100%" }} />
    </div>
  )
}
