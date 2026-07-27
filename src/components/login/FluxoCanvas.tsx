"use client"

import { useEffect, useRef } from "react"

/**
 * Fundo do painel esquerdo da tela de login: uma constelação de nós e rotas
 * que funde LOGÍSTICA (hubs, rotas de distribuição) com TECNOLOGIA (rede,
 * pacotes de dados em trânsito). Canvas 2D, 100% determinístico (sem
 * Math.random) — todas as posições e trajetos vêm de tabelas fixas.
 *
 * Comportamento:
 *  - fundo em gradiente vertical navy-ink -> navy;
 *  - grade técnica sutil (~4% de opacidade);
 *  - 8 nós fixos (2 "primários", maiores e com glow mais forte), pulsando
 *    devagar em senoide com fase própria por índice;
 *  - rotas fixas entre nós, desenhadas como curvas suaves e discretas;
 *  - pacotes (pontos com cauda) percorrendo rotas específicas em loop,
 *    acendendo um pulso extra no nó de destino ao chegar;
 *  - respeita prefers-reduced-motion (frame estático, sem rAF) e pausa
 *    quando a aba fica oculta.
 */

// Paleta In-Haus usada diretamente no canvas (mesma exceção do HeroCanvas,
// que também desenha com hexadecimais brutos por não haver tokens CSS
// acessíveis dentro de um contexto 2d de canvas).
const COR_NAVY_INK = "#00121F"
const COR_NAVY = "#002443"
const COR_NAVY_DEEP = "#023A54"
const COR_TEAL = "#027193"
const COR_TEAL_SOFT = "#4FA8C4"
const COR_BRANCO = "#FFFFFF"

type No = {
  x: number
  y: number
  primario: boolean
}

// 8 hubs em coordenadas normalizadas [0..1] x [0..1], desenhados à mão para
// formar uma constelação equilibrada cobrindo o painel inteiro, sem simetria
// mecânica nem aglomeração.
const NOS: No[] = [
  { x: 0.18, y: 0.15, primario: true }, // 0 — hub norte-oeste
  { x: 0.62, y: 0.1, primario: false }, // 1 — hub norte
  { x: 0.85, y: 0.28, primario: false }, // 2 — hub leste
  { x: 0.3, y: 0.38, primario: false }, // 3 — hub central-oeste
  { x: 0.55, y: 0.5, primario: true }, // 4 — hub central (âncora)
  { x: 0.15, y: 0.62, primario: false }, // 5 — hub sudoeste
  { x: 0.75, y: 0.68, primario: false }, // 6 — hub sudeste
  { x: 0.45, y: 0.85, primario: false }, // 7 — hub sul
]

// Arestas fixas (índices em NOS) — cobrem a constelação sem poluir o painel.
const ARESTAS: [number, number][] = [
  [0, 3],
  [0, 1],
  [1, 2],
  [1, 4],
  [2, 4],
  [3, 4],
  [3, 5],
  [4, 5],
  [4, 6],
  [4, 7],
  [5, 7],
  [6, 7],
]

type Pacote = {
  arestaIndex: number
  duracaoMs: number
  faseInicial: number // 0..1, desfasagem inicial dentro do ciclo
}

// 12 pacotes escalonados sobre rotas específicas, com durações e fases
// diferentes para um movimento calmo e não sincronizado.
const PACOTES: Pacote[] = [
  { arestaIndex: 0, duracaoMs: 8200, faseInicial: 0.05 },
  { arestaIndex: 1, duracaoMs: 6400, faseInicial: 0.35 },
  { arestaIndex: 2, duracaoMs: 11000, faseInicial: 0.6 },
  { arestaIndex: 3, duracaoMs: 7300, faseInicial: 0.15 },
  { arestaIndex: 4, duracaoMs: 9600, faseInicial: 0.8 },
  { arestaIndex: 5, duracaoMs: 6900, faseInicial: 0.45 },
  { arestaIndex: 6, duracaoMs: 12500, faseInicial: 0.2 },
  { arestaIndex: 7, duracaoMs: 8800, faseInicial: 0.7 },
  { arestaIndex: 8, duracaoMs: 7700, faseInicial: 0.9 },
  { arestaIndex: 9, duracaoMs: 13500, faseInicial: 0.1 },
  { arestaIndex: 10, duracaoMs: 6100, faseInicial: 0.55 },
  { arestaIndex: 11, duracaoMs: 10200, faseInicial: 0.3 },
]

// Duração do pulso extra que um nó recebe ao ser atingido por um pacote.
const DURACAO_PULSO_CHEGADA_MS = 900

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

// Ponto sobre uma curva quadrática (mesmo controle usado no desenho da rota),
// para posicionar pacotes e cauda de forma consistente com a rota desenhada.
function pontoNaCurva(
  x0: number,
  y0: number,
  cx: number,
  cy: number,
  x1: number,
  y1: number,
  t: number
) {
  const u = 1 - t
  const x = u * u * x0 + 2 * u * t * cx + t * t * x1
  const y = u * u * y0 + 2 * u * t * cy + t * t * y1
  return { x, y }
}

function pontoControle(x0: number, y0: number, x1: number, y1: number, indice: number) {
  const mx = (x0 + x1) / 2
  const my = (y0 + y1) / 2
  // curvatura leve e determinística, alternando de lado conforme o índice
  const dx = x1 - x0
  const dy = y1 - y0
  const nx = -dy
  const ny = dx
  const comprimento = Math.hypot(nx, ny) || 1
  const sinal = indice % 2 === 0 ? 1 : -1
  const intensidade = 0.12
  return {
    cx: mx + (nx / comprimento) * comprimento * intensidade * sinal,
    cy: my + (ny / comprimento) * comprimento * intensidade * sinal,
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

    // timestamp (em "tempo de animação") em que cada nó recebeu o último
    // pulso de chegada de um pacote — usado para reforçar o glow por um
    // curto período após o impacto.
    const ultimaChegadaPorNo = new Array(NOS.length).fill(-Infinity)

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

    function desenhaFundo() {
      const grad = ctx!.createLinearGradient(0, 0, 0, altura)
      grad.addColorStop(0, COR_NAVY_INK)
      grad.addColorStop(1, COR_NAVY)
      ctx!.fillStyle = grad
      ctx!.fillRect(0, 0, largura, altura)
    }

    function desenhaGrade() {
      ctx!.save()
      ctx!.strokeStyle = rgba(COR_BRANCO, 0.04)
      ctx!.lineWidth = 1
      const colunas = 10
      const linhas = 14
      for (let i = 0; i <= colunas; i++) {
        const x = (i / colunas) * largura
        ctx!.beginPath()
        ctx!.moveTo(x, 0)
        ctx!.lineTo(x, altura)
        ctx!.stroke()
      }
      for (let j = 0; j <= linhas; j++) {
        const y = (j / linhas) * altura
        ctx!.beginPath()
        ctx!.moveTo(0, y)
        ctx!.lineTo(largura, y)
        ctx!.stroke()
      }
      ctx!.restore()
    }

    function desenhaRotas() {
      ctx!.save()
      ARESTAS.forEach(([iA, iB], indice) => {
        const a = NOS[iA]
        const b = NOS[iB]
        const x0 = a.x * largura
        const y0 = a.y * altura
        const x1 = b.x * largura
        const y1 = b.y * altura
        const { cx, cy } = pontoControle(x0, y0, x1, y1, indice)

        ctx!.beginPath()
        ctx!.moveTo(x0, y0)
        ctx!.quadraticCurveTo(cx, cy, x1, y1)
        ctx!.strokeStyle = rgba(COR_TEAL_SOFT, 0.1)
        ctx!.lineWidth = 1
        ctx!.stroke()
      })
      ctx!.restore()
    }

    function desenhaNo(no: No, indice: number, tempoMs: number) {
      const x = no.x * largura
      const y = no.y * altura
      const fase = indice * 0.9
      const pulso = 0.5 + 0.5 * Math.sin(tempoMs * 0.0009 + fase)

      const desdeChegada = tempoMs - ultimaChegadaPorNo[indice]
      const pulsoChegada =
        desdeChegada >= 0 && desdeChegada < DURACAO_PULSO_CHEGADA_MS
          ? 1 - desdeChegada / DURACAO_PULSO_CHEGADA_MS
          : 0

      const raioBase = no.primario ? 5.5 : 3.5
      const raioAnel = raioBase + 2.5 + pulso * 1.5
      const intensidadeGlow = (no.primario ? 0.55 : 0.32) + pulso * 0.25 + pulsoChegada * 0.45
      const raioGlow = (no.primario ? 34 : 22) + pulsoChegada * 14

      // glow radial
      const grad = ctx!.createRadialGradient(x, y, 0, x, y, raioGlow)
      grad.addColorStop(0, rgba(COR_TEAL_SOFT, Math.min(0.9, intensidadeGlow)))
      grad.addColorStop(1, rgba(COR_TEAL_SOFT, 0))
      ctx!.fillStyle = grad
      ctx!.beginPath()
      ctx!.arc(x, y, raioGlow, 0, Math.PI * 2)
      ctx!.fill()

      // anel
      ctx!.beginPath()
      ctx!.arc(x, y, raioAnel, 0, Math.PI * 2)
      ctx!.strokeStyle = rgba(COR_TEAL, 0.6 + pulsoChegada * 0.3)
      ctx!.lineWidth = no.primario ? 1.5 : 1
      ctx!.stroke()

      // ponto central
      ctx!.beginPath()
      ctx!.arc(x, y, raioBase * 0.4, 0, Math.PI * 2)
      ctx!.fillStyle = rgba(COR_BRANCO, 0.85 + pulsoChegada * 0.15)
      ctx!.fill()
    }

    function desenhaNos(tempoMs: number) {
      NOS.forEach((no, indice) => desenhaNo(no, indice, tempoMs))
    }

    function desenhaPacote(pacote: Pacote, tempoMs: number) {
      const [iA, iB] = ARESTAS[pacote.arestaIndex]
      const a = NOS[iA]
      const b = NOS[iB]
      const x0 = a.x * largura
      const y0 = a.y * altura
      const x1 = b.x * largura
      const y1 = b.y * altura
      const { cx, cy } = pontoControle(x0, y0, x1, y1, pacote.arestaIndex)

      const cicloMs = tempoMs / pacote.duracaoMs + pacote.faseInicial
      const progresso = cicloMs - Math.floor(cicloMs) // 0..1, avança e reinicia
      const t = progresso

      const { x, y } = pontoNaCurva(x0, y0, cx, cy, x1, y1, t)

      // registra chegada quando o pacote está muito perto do destino
      if (!reduzMovimento && t > 0.985) {
        ultimaChegadaPorNo[iB] = tempoMs
      }

      // cauda curta: alguns pontos atrás no parâmetro t
      const passosCauda = 6
      for (let i = passosCauda; i >= 0; i--) {
        const tCauda = Math.max(0, t - i * 0.015)
        const p = pontoNaCurva(x0, y0, cx, cy, x1, y1, tCauda)
        const alpha = (1 - i / passosCauda) * 0.5
        ctx!.beginPath()
        ctx!.arc(p.x, p.y, 1.6, 0, Math.PI * 2)
        ctx!.fillStyle = rgba(COR_TEAL_SOFT, alpha)
        ctx!.fill()
      }

      // cabeça do pacote com glow
      const grad = ctx!.createRadialGradient(x, y, 0, x, y, 8)
      grad.addColorStop(0, rgba(COR_BRANCO, 0.95))
      grad.addColorStop(0.4, rgba(COR_TEAL_SOFT, 0.7))
      grad.addColorStop(1, rgba(COR_TEAL, 0))
      ctx!.fillStyle = grad
      ctx!.beginPath()
      ctx!.arc(x, y, 8, 0, Math.PI * 2)
      ctx!.fill()

      ctx!.beginPath()
      ctx!.arc(x, y, 2, 0, Math.PI * 2)
      ctx!.fillStyle = COR_BRANCO
      ctx!.fill()
    }

    function desenhaPacotes(tempoMs: number) {
      PACOTES.forEach((pacote) => desenhaPacote(pacote, tempoMs))
    }

    function desenhaFrame(tempoMs: number) {
      ctx!.clearRect(0, 0, largura, altura)
      desenhaFundo()
      desenhaGrade()
      desenhaRotas()
      desenhaNos(tempoMs)
      desenhaPacotes(tempoMs)
    }

    // marca de profundidade extra sutil no canto inferior (navy-deep), só
    // para evitar chapado uniforme — aplicada uma vez, não animada.
    void COR_NAVY_DEEP

    if (reduzMovimento) {
      // frame estático: pacotes parados na metade de suas rotas (t = 0.5)
      const tempoEstatico = 0
      ctx.clearRect(0, 0, largura, altura)
      desenhaFundo()
      desenhaGrade()
      desenhaRotas()
      desenhaNos(tempoEstatico)
      PACOTES.forEach((pacote) => {
        const [iA, iB] = ARESTAS[pacote.arestaIndex]
        const a = NOS[iA]
        const b = NOS[iB]
        const x0 = a.x * largura
        const y0 = a.y * altura
        const x1 = b.x * largura
        const y1 = b.y * altura
        const { cx, cy } = pontoControle(x0, y0, x1, y1, pacote.arestaIndex)
        const { x, y } = pontoNaCurva(x0, y0, cx, cy, x1, y1, 0.5)
        const grad = ctx.createRadialGradient(x, y, 0, x, y, 8)
        grad.addColorStop(0, rgba(COR_BRANCO, 0.95))
        grad.addColorStop(0.4, rgba(COR_TEAL_SOFT, 0.7))
        grad.addColorStop(1, rgba(COR_TEAL, 0))
        ctx.fillStyle = grad
        ctx.beginPath()
        ctx.arc(x, y, 8, 0, Math.PI * 2)
        ctx.fill()
        ctx.beginPath()
        ctx.arc(x, y, 2, 0, Math.PI * 2)
        ctx.fillStyle = COR_BRANCO
        ctx.fill()
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
