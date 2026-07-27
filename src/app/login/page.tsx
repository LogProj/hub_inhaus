import type { Metadata } from "next"
import Link from "next/link"
import { Sparkles, ShieldCheck, ArrowRight } from "lucide-react"

import { FluxoCanvas } from "@/components/login/FluxoCanvas"
import { LoginIntro } from "@/components/login/LoginIntro"
import { LoginForm } from "@/components/auth/LoginForm"
import { InhausLogo } from "@/components/brand/InhausLogo"
import { Button } from "@/components/ui/button"
import { acessoLivreLiberado } from "@/lib/dev-auth"

export const metadata: Metadata = {
  title: "Entrar",
  description: "Acesse o In-Haus Hub com sua conta corporativa.",
}

export default function LoginPage() {
  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      {/* Intro cinematográfica — a logo entra suave e migra para a logo do login. */}
      <LoginIntro />

      {/* Painel da marca — rede de rotas logísticas com pacotes fluindo (logística + tecnologia). */}
      <div className="relative hidden overflow-hidden bg-navy-ink lg:block">
        <FluxoCanvas className="absolute inset-0 h-full w-full" />
        <div className="absolute inset-0 bg-gradient-to-tr from-navy-ink/60 via-navy-ink/10 to-transparent" />
        <div className="relative z-10 flex h-full flex-col justify-between p-12">
          <div className="flex items-center justify-center">
            <span data-login-logo className="inline-block">
              <InhausLogo onDark className="h-8" />
            </span>
          </div>
          <div className="max-w-md">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-medium uppercase tracking-[0.18em] text-white/90 backdrop-blur">
              <Sparkles className="h-3.5 w-3.5" />
              In-Haus Hub
            </span>
            <h2 className="mt-6 font-display text-4xl font-semibold leading-tight text-white">
              Hub de indicadores da In-Haus
            </h2>
            <p className="mt-4 text-white/75">
              Acesse os painéis de Segurança, RH, Qualidade, Treinamentos e Financeiro em
              um só lugar.
            </p>
          </div>
          <div className="flex items-center gap-2 text-sm text-white/70">
            <ShieldCheck className="h-4 w-4" />
            Autenticação corporativa segura.
          </div>
        </div>
      </div>

      {/* Formulário */}
      <div className="relative flex items-center justify-center bg-inhaus-radial px-5 py-12 sm:px-10">
        <div className="w-full max-w-md">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <span data-login-logo className="inline-block">
              <InhausLogo className="h-7" />
            </span>
          </div>

          <div className="reveal">
            <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground">
              Bem-vindo de volta
            </h1>
            <p className="mt-2 text-muted-foreground">
              Entre com sua conta corporativa para acessar o hub.
            </p>
          </div>

          <div className="reveal delay-1 mt-8 rounded-3xl border border-navy/10 bg-white/80 p-7 shadow-soft backdrop-blur-xl sm:p-8">
            <LoginForm />
          </div>

          <p className="reveal delay-2 mt-6 flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <ShieldCheck className="h-3.5 w-3.5 text-teal" />
            Autenticação segura
          </p>

          {/* Atalho de acesso — só no modo de desenvolvimento (acesso livre),
              para revisar o hub sem as credenciais do global_auth. Nunca aparece
              em produção. */}
          {acessoLivreLiberado() && (
            <div className="reveal delay-3 mt-8 rounded-2xl border border-dashed border-teal/30 bg-teal-tint/50 p-4 text-center">
              <p className="text-xs font-medium text-navy">Modo de desenvolvimento</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Entre no hub sem autenticar para revisar os painéis.
              </p>
              <Button asChild variant="gradient" size="sm" className="mt-3">
                <Link href="/dashboards">
                  Acessar o hub
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
