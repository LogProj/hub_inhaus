import type { Metadata } from "next"
import { LoginCanvasResponsivo, LoginForm } from "@/components/auth/LoginForm"
import { BootSequence } from "@/components/brand/BootSequence"
import { InhausLogo } from "@/components/brand/InhausLogo"

/**
 * Tela de login — a vitrine do produto. Split cinematográfico 58/42 no
 * desktop; no mobile, o painel esquerdo vira o fundo cheio da tela e o
 * formulário sobe como uma folha ancorada na base (ver `LoginForm` e a
 * seção 10 do spec de design).
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
    <div className="relative lg:grid lg:h-dvh lg:grid-cols-[58fr_42fr]">
      {/* Abertura animada: roda uma vez por sessão, como overlay sobre a página
          já renderizada (o formulário abaixo já está pronto quando ela sai, então
          o LCP não é penalizado). Ao final, a logo pousa exatamente sobre a logo
          do painel esquerdo — continuidade, não corte. */}
      <BootSequence seletorAlvo="[data-logo-destino]" />
      {/* Painel esquerdo — no mobile é o fundo cheio da tela (fixed inset-0);
          no desktop volta ao fluxo normal, como a primeira coluna do grid. */}
      <div className="fixed inset-0 z-0 overflow-hidden bg-navy lg:static lg:z-auto">
        <LoginCanvasResponsivo className="absolute inset-0" />

        <div className="relative flex h-full flex-col px-6 pt-14 lg:justify-end lg:px-16 lg:pb-16 lg:pt-16">
          {/* Mobile: só a logo, no topo da tela cheia. */}
          <InhausLogo variante="branca" altura={32} className="lg:hidden" />

          {/* Desktop: logo + headline + subtítulo, ancorados no terço inferior
              esquerdo. O vazio na porção superior é intencional. */}
          <div className="hidden lg:block lg:max-w-[440px]">
            <span data-logo-destino className="inline-block">
              <InhausLogo variante="branca" altura={40} />
            </span>
            <h1 className="mt-10 max-w-[13ch] font-display text-display-md text-white">
              Todos os indicadores da In-Haus. Um só lugar.
            </h1>
            <p className="mt-4 max-w-[38ch] font-sans text-[15px] text-white/60">
              Segurança, RH, qualidade, treinamentos e financeiro reunidos num único painel de indicadores.
            </p>
          </div>

          <div className="relative mt-10 hidden items-center justify-between lg:flex">
            <span className="font-sans text-[13px] text-white/45">{dataPorExtenso}</span>
            <span className="flex items-center gap-2">
              <span aria-hidden="true" className="h-1.5 w-1.5 animate-breathe rounded-full bg-teal" />
              <span className="text-label uppercase text-white/45">Sistema operacional</span>
            </span>
          </div>
        </div>
      </div>

      {/* Painel direito — no mobile é a folha ancorada na base (fixed
          bottom-0), no desktop a segunda coluna do grid, centrada. */}
      <div className="fixed inset-x-0 bottom-0 z-10 h-[62dvh] overflow-y-auto rounded-t-[24px] bg-mist px-6 pb-10 pt-8 lg:static lg:z-auto lg:flex lg:h-dvh lg:items-center lg:justify-center lg:overflow-visible lg:rounded-none lg:px-16 lg:py-16">
        <LoginForm proximaRota={proximaRota} />
      </div>
    </div>
  )
}
