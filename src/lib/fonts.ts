import { Bricolage_Grotesque } from "next/font/google"
import { GeistSans } from "geist/font/sans"
import { GeistMono } from "geist/font/mono"

/**
 * Display com voz própria — nem Inter, nem Roboto.
 * Bricolage Grotesque carrega os títulos, os valores de KPI e a tela de login.
 */
export const display = Bricolage_Grotesque({
  subsets: ["latin"],
  weight: ["600", "700"],
  variable: "--font-display",
  display: "swap",
})

export const sans = GeistSans
export const mono = GeistMono

/** Classes de variável de fonte aplicadas ao <html>. */
export const fontVariables = [display.variable, GeistSans.variable, GeistMono.variable].join(
  " ",
)
