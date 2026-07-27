"use client"

import { Moon, Sun } from "lucide-react"
import { useTema } from "@/lib/theme"

/**
 * Botão sol/lua do rodapé da sidebar. O morph entre os dois ícones é feito só
 * com opacidade + rotação + escala — os dois SVGs sempre existem no DOM.
 */
export function ThemeToggle() {
  const { tema, alternar } = useTema()
  const escuro = tema === "dark"

  return (
    <button
      type="button"
      onClick={alternar}
      aria-label={escuro ? "Mudar para o tema claro" : "Mudar para o tema escuro"}
      className="relative grid h-9 w-9 shrink-0 place-items-center rounded-md text-white/55 transition-colors duration-[240ms] ease-calm hover:bg-white/5 hover:text-white"
    >
      <Sun
        strokeWidth={1.5}
        aria-hidden="true"
        className={`absolute h-[18px] w-[18px] transition-all duration-[320ms] ease-calm ${
          escuro ? "rotate-90 scale-50 opacity-0" : "rotate-0 scale-100 opacity-100"
        }`}
      />
      <Moon
        strokeWidth={1.5}
        aria-hidden="true"
        className={`absolute h-[18px] w-[18px] transition-all duration-[320ms] ease-calm ${
          escuro ? "rotate-0 scale-100 opacity-100" : "-rotate-90 scale-50 opacity-0"
        }`}
      />
    </button>
  )
}
