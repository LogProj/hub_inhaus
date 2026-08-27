"use client"

import { useEffect, useState } from "react"
import { Maximize, Minimize } from "lucide-react"

/**
 * Alterna a exibição em tela cheia de um elemento (para mostrar o painel numa TV).
 * Usa a Fullscreen API do navegador; o alvo é identificado por id.
 */
export function BotaoFullscreen({ alvoId }: { alvoId: string }) {
  const [cheia, setCheia] = useState(false)

  useEffect(() => {
    const aoMudar = () => setCheia(Boolean(document.fullscreenElement))
    document.addEventListener("fullscreenchange", aoMudar)
    return () => document.removeEventListener("fullscreenchange", aoMudar)
  }, [])

  function alternar() {
    if (document.fullscreenElement) {
      void document.exitFullscreen()
    } else {
      document.getElementById(alvoId)?.requestFullscreen?.()
    }
  }

  return (
    <button
      type="button"
      onClick={alternar}
      aria-label={cheia ? "Sair da tela cheia" : "Exibir em tela cheia"}
      className="inline-flex h-10 items-center gap-2 rounded-full border border-navy/15 bg-white/80 px-4 text-sm font-medium text-navy shadow-card backdrop-blur transition-colors hover:border-teal/40"
    >
      {cheia ? <Minimize className="h-4 w-4 text-teal" /> : <Maximize className="h-4 w-4 text-teal" />}
      {cheia ? "Sair" : "Tela cheia"}
    </button>
  )
}
