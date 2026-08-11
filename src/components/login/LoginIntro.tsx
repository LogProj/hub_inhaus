"use client"

import { useEffect, useRef, useState, type CSSProperties } from "react"

import { InhausLogo } from "@/components/brand/InhausLogo"

/**
 * Overlay de abertura cinematográfica da tela de login. Roda uma única vez por
 * sessão (sessionStorage): a logo entra centralizada sobre um fundo navy com um
 * halo teal que respira, aguarda um instante e então "migra" — com transform
 * calculado em runtime — até pousar exatamente sobre a logo real do formulário
 * por trás (marcada com `data-login-logo`), revelando o login com um fade-out
 * simultâneo. Interação (clique/tecla/toque) pula direto para o final.
 * Respeita `prefers-reduced-motion` (fade simples, sem migração de posição).
 */

const SESSION_KEY = "inhaus-login-intro"
const EASING = "cubic-bezier(0.22, 1, 0.36, 1)"
const IDLE_TRANSFORM = "translate(0px, 0px) scale(1) translate(-50%, -50%)"
const PRE_ENTER_TRANSFORM = "translate(0px, 0px) scale(0.92) translate(-50%, -50%)"

type Phase = "idle" | "migrate"

export function LoginIntro() {
  const [active, setActive] = useState(false)
  const [reducedMotion, setReducedMotion] = useState(false)
  const [entered, setEntered] = useState(false)
  const [overlayVisible, setOverlayVisible] = useState(true)
  const [phase, setPhase] = useState<Phase>("idle")
  const [logoTransform, setLogoTransform] = useState(IDLE_TRANSFORM)

  const logoRef = useRef<HTMLDivElement>(null)
  const phaseRef = useRef<Phase>("idle")
  const timers = useRef<Array<ReturnType<typeof setTimeout>>>([])
  const rafIds = useRef<number[]>([])
  const finishedRef = useRef(false)

  // Decide, uma única vez por sessão e só no client (evita mismatch de
  // hidratação — no server e no primeiro render do client isto é null).
  useEffect(() => {
    let alreadySeen = false
    try {
      alreadySeen = sessionStorage.getItem(SESSION_KEY) === "1"
    } catch {
      // sessionStorage indisponível (ex.: modo privado); segue sem rodar por segurança
      alreadySeen = true
    }
    if (alreadySeen) return

    // grava a flag já aqui, antes de animar, para não haver corrida em navegação dupla
    try {
      sessionStorage.setItem(SESSION_KEY, "1")
    } catch {
      /* ignora — pior caso a intro roda de novo numa próxima navegação */
    }

    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false
    setReducedMotion(reduced)
    setActive(true)
  }, [])

  // Coreografia da intro (timeline + salvaguardas de pular/limpar).
  useEffect(() => {
    if (!active) return

    let cancelled = false

    const clearAll = () => {
      timers.current.forEach(clearTimeout)
      timers.current = []
      rafIds.current.forEach(cancelAnimationFrame)
      rafIds.current = []
    }

    const schedule = (fn: () => void, ms: number) => {
      const id = setTimeout(fn, ms)
      timers.current.push(id)
    }

    const nextFrame = (fn: () => void) => {
      const id = requestAnimationFrame(() => {
        if (cancelled) return
        fn()
      })
      rafIds.current.push(id)
    }

    const finish = () => {
      if (finishedRef.current) return
      finishedRef.current = true
      cancelled = true
      clearAll()
      document.removeEventListener("click", skip)
      document.removeEventListener("keydown", skip)
      document.removeEventListener("touchstart", skip)
      window.removeEventListener("resize", handleResize)
      setActive(false)
    }

    const skip = () => finish()

    const getVisibleTargetRect = (): DOMRect | null => {
      const nodes = document.querySelectorAll<HTMLElement>("[data-login-logo]")
      for (const node of Array.from(nodes)) {
        const rect = node.getBoundingClientRect()
        if (rect.width > 0 && rect.height > 0) return rect
      }
      return null
    }

    const computeMigration = () => {
      const target = getVisibleTargetRect()
      const logoEl = logoRef.current
      if (!target || !logoEl) return
      const logoRect = logoEl.getBoundingClientRect()
      if (logoRect.width === 0 || logoRect.height === 0) return

      const dx = target.left + target.width / 2 - (logoRect.left + logoRect.width / 2)
      const dy = target.top + target.height / 2 - (logoRect.top + logoRect.height / 2)
      const scale = target.height / logoRect.height

      setLogoTransform(`translate(${dx}px, ${dy}px) scale(${scale}) translate(-50%, -50%)`)
    }

    const handleResize = () => {
      if (phaseRef.current === "migrate") computeMigration()
    }

    document.addEventListener("click", skip)
    document.addEventListener("keydown", skip)
    document.addEventListener("touchstart", skip)
    window.addEventListener("resize", handleResize)

    if (reducedMotion) {
      // Sem halo contínuo e sem migração de posição: só um fade-in rápido da
      // logo centralizada seguido do fade-out rápido do overlay inteiro.
      nextFrame(() => nextFrame(() => setEntered(true)))
      schedule(() => setOverlayVisible(false), 500)
      schedule(finish, 800)
    } else {
      // Fase 1 — entrada (0-800ms): opacity 0→1, scale 0.92→1.
      nextFrame(() => nextFrame(() => setEntered(true)))
      // Fase 2 — hold (800-1400ms): nada a fazer, permanece centralizada.
      // Fase 3 — migração (1400-2100ms): pousa sobre a logo real e o overlay
      // inteiro faz fade-out simultâneo, revelando o login por trás.
      schedule(() => {
        computeMigration()
        phaseRef.current = "migrate"
        setPhase("migrate")
        setOverlayVisible(false)
      }, 1400)
      // Fim (~2200ms): desmonta o overlay.
      schedule(finish, 2200)
    }

    return () => {
      cancelled = true
      clearAll()
      document.removeEventListener("click", skip)
      document.removeEventListener("keydown", skip)
      document.removeEventListener("touchstart", skip)
      window.removeEventListener("resize", handleResize)
    }
  }, [active, reducedMotion])

  if (!active) return null

  const logoStyle: CSSProperties = reducedMotion
    ? {
        transform: "translate(-50%, -50%)",
        opacity: entered ? 1 : 0,
        transitionProperty: "opacity",
        transitionDuration: "300ms",
        transitionTimingFunction: EASING,
      }
    : {
        transform: entered ? logoTransform : PRE_ENTER_TRANSFORM,
        opacity: entered ? 1 : 0,
        transitionProperty: "transform, opacity",
        transitionDuration: phase === "migrate" ? "700ms" : "800ms",
        transitionTimingFunction: EASING,
      }

  return (
    <div
      aria-hidden="true"
      tabIndex={-1}
      className="pointer-events-none fixed inset-0 z-50 overflow-hidden bg-navy-ink"
      style={{
        opacity: overlayVisible ? 1 : 0,
        transitionProperty: "opacity",
        transitionDuration: reducedMotion ? "300ms" : "700ms",
        transitionTimingFunction: EASING,
      }}
    >
      {!reducedMotion && (
        <div
          className="absolute left-1/2 top-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full"
          style={{
            background:
              "radial-gradient(circle, rgba(2,113,147,0.45) 0%, rgba(2,113,147,0) 70%)",
            animation: "inhaus-login-intro-breathe 2.6s ease-in-out infinite",
          }}
        />
      )}

      <div ref={logoRef} className="absolute left-1/2 top-1/2" style={logoStyle}>
        <InhausLogo onDark className="h-16" />
      </div>

      <style>{`
        @keyframes inhaus-login-intro-breathe {
          0%, 100% { opacity: 0.55; transform: translate(-50%, -50%) scale(0.94); }
          50% { opacity: 0.85; transform: translate(-50%, -50%) scale(1.05); }
        }
      `}</style>
    </div>
  )
}
