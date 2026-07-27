"use client"

import { useRef, type ReactNode } from "react"
import { cn } from "@/lib/utils"

/**
 * Card com inclinação 3D sutil seguindo o cursor (perspective + rotateX/Y) e um
 * brilho que acompanha o ponteiro. Desliga o efeito em telas touch / reduced-motion.
 */
export function TiltCard({
  children,
  className,
  max = 6,
}: {
  children: ReactNode
  className?: string
  max?: number
}) {
  const ref = useRef<HTMLDivElement>(null)

  const handleMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = ref.current
    if (!el) return
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return
    const rect = el.getBoundingClientRect()
    const px = (e.clientX - rect.left) / rect.width
    const py = (e.clientY - rect.top) / rect.height
    const rx = (0.5 - py) * max * 2
    const ry = (px - 0.5) * max * 2
    el.style.transform = `perspective(900px) rotateX(${rx.toFixed(2)}deg) rotateY(${ry.toFixed(2)}deg) translateZ(0)`
    el.style.setProperty("--mx", `${(px * 100).toFixed(1)}%`)
    el.style.setProperty("--my", `${(py * 100).toFixed(1)}%`)
  }

  const reset = () => {
    const el = ref.current
    if (!el) return
    el.style.transform = "perspective(900px) rotateX(0) rotateY(0)"
  }

  return (
    <div
      ref={ref}
      onMouseMove={handleMove}
      onMouseLeave={reset}
      className={cn(
        "tilt-card group relative transition-transform duration-300 ease-out will-change-transform",
        className,
      )}
    >
      {children}
    </div>
  )
}
