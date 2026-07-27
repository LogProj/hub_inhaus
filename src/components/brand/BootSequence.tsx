"use client"

/**
 * Abertura animada da logo In-Haus — roda uma única vez por sessão do
 * navegador (flag em `sessionStorage`), como um overlay por cima da página
 * já renderizada. Nunca bloqueia nem remonta o conteúdo por baixo: é só uma
 * camada decorativa (`aria-hidden`) que se autodestrói ao final.
 *
 * Linha do tempo (~2,2s), ver Task 8 do plano de fundação visual:
 *   0–400ms    atmosfera entra com revelação radial (mask-image animado)
 *   400–1200ms símbolo e wordmark se traçam (stroke) e depois preenchem
 *   1200–1700ms halo teal irradia da logo
 *   1700–2200ms overlay some e a logo migra para a posição alvo
 *
 * Clique, tecla ou toque em qualquer lugar pula direto para o final.
 * Com `prefers-reduced-motion`, só um fade de 300ms na logo.
 */

import { useEffect, useLayoutEffect, useRef, useState } from "react"
import { Atmosphere } from "@/components/atmosphere/Atmosphere"
import { InhausLogo } from "@/components/brand/InhausLogo"

/** Facilita no JS: mesmo valor do `ease-calm` do tailwind.config.ts. Não dá
 * pra referenciar uma classe Tailwind dentro de uma string de `transition`
 * imperativa — por isso o cubic-bezier é repetido aqui como constante. */
const EASE_CALM = "cubic-bezier(0.22, 1, 0.36, 1)"

type Alvo = { x: number; y: number; escala: number }

type BootSequenceProps = {
  /** Chave da sessão. Default: "inhaus-boot". */
  chaveSessao?: string
  /** Posição/escala alvo para onde a logo migra ao final (ex.: painel esquerdo do login). */
  alvo?: Alvo
}

const CHAVE_PADRAO = "inhaus-boot"

type Estado = "verificando" | "oculto" | "ativo"

export function BootSequence({ chaveSessao = CHAVE_PADRAO, alvo }: BootSequenceProps): JSX.Element | null {
  const [estado, setEstado] = useState<Estado>("verificando")
  const [reduzida, setReduzida] = useState(false)

  const overlayRef = useRef<HTMLDivElement>(null)
  const atmosferaRef = useRef<HTMLDivElement>(null)
  const haloRef = useRef<HTMLDivElement>(null)
  const logoWrapRef = useRef<HTMLDivElement>(null)
  const logoContainerRef = useRef<HTMLDivElement>(null)

  const timersRef = useRef<number[]>([])
  const rafsRef = useRef<number[]>([])
  const finalizadoRef = useRef(false)

  // Decide ANTES da pintura se a sequência já rodou nesta sessão — evita
  // qualquer flash do overlay em recarregamentos subsequentes na mesma aba.
  useLayoutEffect(() => {
    let jaVisto = false
    try {
      jaVisto = !!window.sessionStorage.getItem(chaveSessao)
    } catch {
      // sessionStorage indisponível (modo privado restrito, etc.) — trata como não visto.
      jaVisto = false
    }

    if (jaVisto) {
      setEstado("oculto")
      return
    }

    setReduzida(window.matchMedia("(prefers-reduced-motion: reduce)").matches)
    setEstado("ativo")
  }, [chaveSessao])

  useEffect(() => {
    if (estado !== "ativo") return

    finalizadoRef.current = false

    const limpar = () => {
      timersRef.current.forEach((id) => window.clearTimeout(id))
      rafsRef.current.forEach((id) => window.cancelAnimationFrame(id))
      timersRef.current = []
      rafsRef.current = []
    }

    const agendar = (fn: () => void, ms: number) => {
      const id = window.setTimeout(fn, ms)
      timersRef.current.push(id)
      return id
    }

    const finalizar = () => {
      if (finalizadoRef.current) return
      finalizadoRef.current = true
      limpar()
      try {
        window.sessionStorage.setItem(chaveSessao, "1")
      } catch {
        // sem sessionStorage: a sequência roda de novo na próxima vez, sem problema.
      }
      setEstado("oculto")
    }

    // --- Pular: clique, tecla ou toque encerra na hora ---
    const pular = () => {
      limpar()
      const overlay = overlayRef.current
      if (overlay) {
        overlay.style.transition = "opacity 150ms linear"
        overlay.style.opacity = "0"
      }
      agendar(finalizar, 150)
    }
    window.addEventListener("click", pular)
    window.addEventListener("keydown", pular)
    window.addEventListener("touchstart", pular, { passive: true })

    if (reduzida) {
      // Reduced motion: sem linha do tempo, só um fade simples na logo já preenchida.
      const logo = logoWrapRef.current
      if (logo) {
        logo.style.transition = `opacity 300ms linear`
        logo.style.opacity = "0"
        const id = requestAnimationFrame(() => {
          if (logoWrapRef.current) logoWrapRef.current.style.opacity = "1"
        })
        rafsRef.current.push(id)
      }
      agendar(finalizar, 320)

      return () => {
        window.removeEventListener("click", pular)
        window.removeEventListener("keydown", pular)
        window.removeEventListener("touchstart", pular)
        limpar()
      }
    }

    // --- Linha do tempo completa ---

    // Fase 0 (0–400ms): a malha entra por revelação radial (mask-image animado via rAF,
    // não por transição CSS — gradientes nem sempre interpolam de forma confiável entre
    // navegadores quando só o raio muda).
    const inicioMask = performance.now()
    const duracaoMask = 400
    const animarMask = (agora: number) => {
      const el = atmosferaRef.current
      if (!el) return
      const t = Math.min(1, (agora - inicioMask) / duracaoMask)
      const suavizado = 1 - Math.pow(1 - t, 3)
      const raio = suavizado * 140
      const mask = `radial-gradient(circle at 30% 20%, black 0%, black ${(raio * 0.35).toFixed(1)}%, transparent ${raio.toFixed(1)}%)`
      el.style.maskImage = mask
      el.style.webkitMaskImage = mask
      if (t < 1) {
        const id = requestAnimationFrame(animarMask)
        rafsRef.current.push(id)
      }
    }
    rafsRef.current.push(requestAnimationFrame(animarMask))

    // Fase 1 (400–1200ms): traçado do símbolo e do wordmark.
    agendar(() => {
      const container = logoContainerRef.current
      if (!container) return

      const pathsSimbolo = Array.from(
        container.querySelectorAll<SVGPathElement>('[data-parte="simbolo"] .logo-traco'),
      )
      const pathsWordmark = Array.from(
        container.querySelectorAll<SVGPathElement>('[data-parte="wordmark"] .logo-traco'),
      )

      const prepararTraco = (path: SVGPathElement) => {
        const comprimento = path.getTotalLength()
        path.style.transition = "none"
        path.style.strokeDasharray = `${comprimento}`
        path.style.strokeDashoffset = `${comprimento}`
        path.style.fillOpacity = "0"
        path.style.strokeOpacity = "1"
      }
      pathsSimbolo.forEach(prepararTraco)
      pathsWordmark.forEach(prepararTraco)

      // Força um reflow antes de ligar a transição — sem isso o navegador não anima
      // a mudança de stroke-dashoffset porque ela "colaria" no valor inicial.
      void container.getBoundingClientRect()

      const desenhar = (paths: SVGPathElement[], duracaoMs: number) => {
        paths.forEach((path) => {
          path.style.transition = `stroke-dashoffset ${duracaoMs}ms ${EASE_CALM}`
          path.style.strokeDashoffset = "0"
        })
      }
      const preencher = (paths: SVGPathElement[]) => {
        paths.forEach((path) => {
          path.style.transition = `fill-opacity 240ms ease-out, stroke-opacity 240ms ease-out`
          path.style.fillOpacity = "1"
          path.style.strokeOpacity = "0"
        })
      }

      // Símbolo: traça de 0 a 500ms da fase (400–900ms absoluto), depois preenche.
      desenhar(pathsSimbolo, 500)
      agendar(() => preencher(pathsSimbolo), 500)

      // Wordmark: traça de 300 a 800ms da fase (700–1200ms absoluto), sobreposto ao símbolo.
      agendar(() => desenhar(pathsWordmark, 500), 300)
      agendar(() => preencher(pathsWordmark), 800)
    }, 400)

    // Fase 2 (1200–1700ms): halo teal irradiando da logo.
    agendar(() => {
      const halo = haloRef.current
      if (!halo) return
      halo.style.transition = `transform 500ms ${EASE_CALM}, opacity 500ms ${EASE_CALM}`
      halo.style.transform = "scale(3)"
      halo.style.opacity = "0"
    }, 1200)

    // Fase 3 (1700–2200ms): overlay some; logo migra para o alvo (se houver).
    agendar(() => {
      const overlay = overlayRef.current
      const logo = logoWrapRef.current
      if (overlay) {
        overlay.style.transition = `opacity 400ms ${EASE_CALM}`
        overlay.style.opacity = "0"
      }
      if (logo) {
        logo.style.transition = `transform 400ms ${EASE_CALM}`
        logo.style.transform = alvo
          ? `translate(${alvo.x}px, ${alvo.y}px) scale(${alvo.escala})`
          : "scale(0.42)"
      }
    }, 1700)

    // Fim da linha do tempo — desmonta o overlay e grava a flag.
    agendar(finalizar, 2200)

    return () => {
      window.removeEventListener("click", pular)
      window.removeEventListener("keydown", pular)
      window.removeEventListener("touchstart", pular)
      limpar()
    }
  }, [estado, reduzida, chaveSessao, alvo])

  if (estado !== "ativo") return null

  return (
    <div
      ref={overlayRef}
      aria-hidden="true"
      className="fixed inset-0 z-50 bg-navy-deep"
      style={{ opacity: 1 }}
    >
      {!reduzida && (
        <div ref={atmosferaRef} className="absolute inset-0">
          <Atmosphere intensidade="cheia" />
        </div>
      )}

      <div className="absolute inset-0 grid place-items-center">
        {!reduzida && (
          <div
            ref={haloRef}
            className="pointer-events-none absolute h-40 w-40 rounded-full bg-teal/50 blur-3xl"
            style={{ transform: "scale(0)", opacity: 0.5 }}
          />
        )}
        <div ref={logoWrapRef} style={{ opacity: reduzida ? 0 : 1, transform: "scale(1)" }}>
          <div ref={logoContainerRef}>
            <InhausLogo variante="branca" altura={48} tracejar={!reduzida} />
          </div>
        </div>
      </div>
    </div>
  )
}
