"use client"

import { createContext, useCallback, useContext, useEffect, useState } from "react"

export type Tema = "light" | "dark"

/** Claro é o padrão: o hub é usado o dia inteiro em escritório. */
export const TEMA_PADRAO: Tema = "light"

export const CHAVE_TEMA = "inhaus-theme"

export function proximoTema(atual: Tema): Tema {
  return atual === "light" ? "dark" : "light"
}

type ContextoTema = { tema: Tema; alternar: () => void }

const TemaContext = createContext<ContextoTema>({
  tema: TEMA_PADRAO,
  alternar: () => {},
})

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [tema, setTema] = useState<Tema>(TEMA_PADRAO)

  // O script inline no <head> já aplicou a classe antes da pintura; aqui só
  // sincronizamos o estado do React com o que ficou salvo.
  useEffect(() => {
    const salvo = window.localStorage.getItem(CHAVE_TEMA)
    if (salvo === "dark" || salvo === "light") setTema(salvo)
  }, [])

  const alternar = useCallback(() => {
    setTema((atual) => {
      const proximo = proximoTema(atual)
      window.localStorage.setItem(CHAVE_TEMA, proximo)
      document.documentElement.classList.toggle("dark", proximo === "dark")
      return proximo
    })
  }, [])

  return <TemaContext.Provider value={{ tema, alternar }}>{children}</TemaContext.Provider>
}

export function useTema() {
  return useContext(TemaContext)
}
