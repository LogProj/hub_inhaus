import type { Metadata } from "next"
import Link from "next/link"
import { ShieldCheck, ArrowRight } from "lucide-react"

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
    <div className="relative min-h-dvh overflow-hidden bg-navy-ink">
      {/* Intro cinematográfica — a logo entra suave e migra para a logo do login. */}
      <LoginIntro />

      {/* Fundo animado — rede de rotas logísticas com pacotes fluindo (logística +
          tecnologia), agora espalhada pela tela inteira, sem split de painéis. */}
      <FluxoCanvas className="absolute inset-0 h-full w-full" />

      {/* Vinheta de legibilidade: escurece as bordas e dá um leve foco no centro,
          para o card do formulário se destacar sobre a animação. */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,36,67,0.15)_0%,rgba(0,18,31,0.55)_65%,rgba(0,18,31,0.8)_100%)]" />

      {/* Conteúdo — formulário centralizado, flutuando sobre a animação. */}
      <div className="relative z-10 flex min-h-dvh flex-col items-center justify-center px-5 py-12">
        <div className="w-full max-w-md">
          {/* Logo limpa e centralizada, com respiro — a marca fala por si. */}
          <div className="mb-10 flex items-center justify-center">
            <span data-login-logo className="inline-block">
              <InhausLogo onDark className="h-10" />
            </span>
          </div>

          <div className="reveal text-center">
            <span className="eyebrow-dark">In-Haus Hub</span>
            <h1 className="mt-4 font-display text-3xl font-semibold tracking-tight text-white">
              Bem-vindo de volta
            </h1>
            <p className="mt-2 text-sm text-white/55">
              Entre com sua conta corporativa para acessar o hub.
            </p>
          </div>

          {/* Card de vidro escuro imersivo — funde com o fundo animado. */}
          <div className="reveal delay-1 glass-dark mt-8 rounded-3xl p-7 sm:p-8">
            <LoginForm />
          </div>

          <p className="reveal delay-2 mt-6 flex items-center justify-center gap-2 text-xs text-white/45">
            <ShieldCheck className="h-3.5 w-3.5 text-teal-soft" />
            Autenticação segura
          </p>

          {/* Atalho de acesso — só no modo de desenvolvimento (acesso livre),
              para revisar o hub sem as credenciais do global_auth. Nunca aparece
              em produção. */}
          {acessoLivreLiberado() && (
            <div className="reveal delay-3 mt-8 rounded-2xl border border-dashed border-teal/25 bg-white/[0.03] p-4 text-center backdrop-blur">
              <p className="text-xs font-medium text-white/80">Modo de desenvolvimento</p>
              <p className="mt-1 text-xs text-white/45">
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
