// Landing (hero) — atualmente OCULTA do fluxo principal: a raiz "/" redireciona
// direto para /dashboards. Esta rota /home preserva a tela para reativarmos depois.
import Link from "next/link"
import { ArrowRight, Sparkles, ShieldCheck } from "lucide-react"

import { Button } from "@/components/ui/button"
import { HeroCanvas } from "@/components/HeroCanvas"
import { SiteHeader } from "@/components/site/SiteHeader"

export default function LandingPage() {
  return (
    <div className="relative flex min-h-dvh flex-col bg-inhaus-radial">
      <SiteHeader />

      <main className="flex-1">
        {/* ===================== HERO (única seção da página) ===================== */}
        <section className="relative flex min-h-dvh items-center overflow-hidden">
          {/* Fundo 3D WebGL (fallback: gradiente do contêiner). Véu claro à esquerda
              para legibilidade do texto; a névoa navy/teal fica visível à direita. */}
          <div className="pointer-events-none absolute inset-0 -z-10">
            <HeroCanvas className="absolute inset-0 h-full w-full" />
            <div className="absolute inset-0 bg-gradient-to-r from-white/90 from-5% via-white/45 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-b from-white/30 via-transparent to-transparent" />
            <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-background via-background/70 to-transparent" />
          </div>

          {/* glow suave atrás do título, para profundidade */}
          <div className="pointer-events-none absolute left-1/2 top-1/2 -z-10 h-[420px] w-[680px] -translate-x-[60%] -translate-y-1/2 rounded-full bg-teal-soft/25 blur-[120px]" />

          <div className="mx-auto flex w-full max-w-7xl flex-col items-start px-5 pb-16 pt-32 sm:px-8 sm:pt-36">
            <span className="eyebrow reveal">
              <Sparkles className="h-3.5 w-3.5" />
              Hub de Indicadores In-Haus
            </span>

            <h1 className="reveal delay-1 mt-6 max-w-4xl font-display text-5xl font-semibold leading-[1.04] tracking-tight text-foreground sm:text-6xl lg:text-7xl">
              Os indicadores da In-Haus com{" "}
              <span className="text-gradient">controle e clareza</span>.
            </h1>

            <p className="reveal delay-2 mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground">
              Uma única plataforma para acompanhar, em tempo real, os indicadores de
              Segurança, RH, Qualidade, Treinamentos e Financeiro — com transparência,
              precisão e governança.
            </p>

            <div className="reveal delay-3 mt-9 flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg" variant="gradient" className="group">
                <Link href="/dashboards">
                  Acessar Dashboards
                  <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
                </Link>
              </Button>
            </div>

            <div className="reveal delay-4 mt-8 flex items-center gap-2 text-sm text-muted-foreground">
              <ShieldCheck className="h-4 w-4 text-teal" />
              Acesso corporativo com autenticação segura.
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}
