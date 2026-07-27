import type { Metadata } from "next"
import { CalendarDays, ShieldCheck, Sparkles } from "lucide-react"

import { LoginCanvasResponsivo, LoginForm } from "@/components/auth/LoginForm"
import { BootSequence } from "@/components/brand/BootSequence"
import { InhausLogo } from "@/components/brand/InhausLogo"

/**
 * Tela de login — split 50/50 no desktop: painel de marca (atmosfera WebGL)
 * à esquerda, cartão de formulário à direita. No mobile, o painel de marca
 * some e só o cartão aparece.
 *
 * Server Component: a data por extenso do rodapé é gerada aqui, uma única
 * vez, no server, e passada pronta para o JSX — gerar `toLocaleDateString`
 * no cliente divergiria da renderização do servidor na hidratação.
 */

export const metadata: Metadata = {
  title: "Entrar",
}

type LoginPageProps = {
  searchParams: { next?: string | string[] }
}

/** Só aceita rota relativa própria do app — evita open redirect via `?next=`. */
function rotaSegura(valor: string | string[] | undefined): string {
  const bruta = Array.isArray(valor) ? valor[0] : valor
  if (bruta && bruta.startsWith("/") && !bruta.startsWith("//")) return bruta
  return "/home"
}

/** `toLocaleDateString("pt-BR")` devolve tudo em minúsculas ("domingo, 27 de
 * julho..."); capitaliza só a primeira letra da frase — `text-transform:
 * capitalize` em CSS capitalizaria CADA palavra ("De Julho De"), o que não
 * é português correto para uma data por extenso. */
function capitalizarPrimeiraLetra(texto: string): string {
  return texto.length > 0 ? texto.charAt(0).toUpperCase() + texto.slice(1) : texto
}

export default function LoginPage({ searchParams }: LoginPageProps) {
  const proximaRota = rotaSegura(searchParams?.next)
  const dataPorExtenso = capitalizarPrimeiraLetra(
    new Date().toLocaleDateString("pt-BR", { dateStyle: "full" }),
  )

  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      {/* Abertura animada: roda uma vez por sessão, como overlay sobre a página
          já renderizada. Ao final, a logo pousa exatamente sobre a logo do
          painel esquerdo — continuidade, não corte. */}
      <BootSequence seletorAlvo="[data-logo-destino]" />

      {/* Painel esquerdo — atmosfera de marca, só no desktop. */}
      <div className="relative hidden overflow-hidden bg-navy lg:block">
        <LoginCanvasResponsivo className="absolute inset-0 h-full w-full" />
        <div className="absolute inset-0 bg-gradient-to-tr from-navy-deep/70 via-transparent to-transparent" />

        <div className="relative z-10 flex h-full flex-col justify-between p-12">
          <div className="flex items-center justify-center">
            <span data-logo-destino className="inline-block">
              <InhausLogo variante="branca" altura={36} />
            </span>
          </div>

          <div className="max-w-md">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-medium uppercase tracking-[0.18em] text-white/90 backdrop-blur">
              <Sparkles className="h-3.5 w-3.5" />
              Hub In-Haus
            </span>
            <h2 className="mt-6 font-display text-4xl font-semibold leading-tight text-white">
              Hub de indicadores da operação
            </h2>
            <p className="mt-4 text-white/75">
              Segurança, RH, qualidade, treinamentos e financeiro reunidos num único painel de indicadores.
            </p>
          </div>

          <div className="flex items-center gap-2 text-sm text-white/70">
            <CalendarDays className="h-4 w-4" />
            {dataPorExtenso}
          </div>
        </div>
      </div>

      {/* Painel direito — cartão de formulário. */}
      <div className="relative flex items-center justify-center bg-background px-5 py-12 sm:px-10">
        <div className="w-full max-w-md">
          <div className="mb-8 flex justify-center lg:hidden">
            <InhausLogo variante="escura" altura={28} />
          </div>

          <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground">
            Bem-vindo de volta
          </h1>
          <p className="mt-2 text-muted-foreground">
            Entre com sua conta corporativa para acessar o hub.
          </p>

          <div className="mt-8 rounded-lg border border-hairline bg-card p-7 shadow-lift sm:p-8">
            <LoginForm proximaRota={proximaRota} />
          </div>

          <p className="mt-6 flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <ShieldCheck className="h-3.5 w-3.5 text-teal" />
            Autenticação segura
          </p>
        </div>
      </div>
    </div>
  )
}
