"use client"

/**
 * Formulário de login. Campos em caixa com ícone à esquerda e label fixa
 * acima (padrão replicado do hub_amyris, com os tokens DESTE projeto — sem
 * hexadecimal solto). Segundo fator (2FA): quando a API sinaliza que é
 * necessário, o MESMO contêiner troca de conteúdo — nunca navega para outra
 * rota.
 *
 * Contrato real da API (ver src/app/api/auth/login/route.ts e
 * src/app/api/auth/2fa/verify/route.ts):
 *
 *   POST /api/auth/login          body: { email, password }
 *     200 sem 2FA  -> { user: { name, email }, authorization }
 *     200 com 2FA  -> { requiresTwoFactor: true, tempToken }
 *     4xx/5xx      -> { error: string }
 *
 *   POST /api/auth/2fa/verify     body: { tempToken, totpCode }
 *     200          -> { user: { name, email }, authorization }
 *     4xx/5xx      -> { error: string }
 *
 * Este arquivo também exporta `LoginCanvasResponsivo`: o Next.js proíbe
 * `ssr: false` em `next/dynamic` dentro de Server Components, e a página de
 * login (`src/app/(auth)/login/page.tsx`) precisa continuar sendo uma. Como
 * este é o único arquivo "use client" que a Task 11 autoriza a criar além dos
 * primitivos de `ui/`, o carregamento dinâmico do canvas WebGL — que É
 * obrigatoriamente `ssr: false` — vive aqui. Além disso, o canvas só é
 * instanciado a partir de um breakpoint real via `matchMedia` (não só CSS):
 * abaixo de 1024px ele nunca chega a montar, e o fallback em CSS/SVG
 * (`<Atmosphere intensidade="cheia" />`) assume o lugar.
 */

import { useEffect, useId, useState, type FormEvent } from "react"
import { useRouter } from "next/navigation"
import dynamicImport from "next/dynamic"
import { Loader2, Lock, Mail, ShieldCheck } from "lucide-react"
import { Atmosphere } from "@/components/atmosphere/Atmosphere"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

const LoginCanvasDinamico = dynamicImport(
  () => import("@/components/atmosphere/LoginCanvas").then((mod) => mod.LoginCanvas),
  { ssr: false, loading: () => <Atmosphere intensidade="cheia" /> },
)

const BREAKPOINT_DESKTOP_PX = 1024

/** Só é `true` depois do mount, e só em telas ≥1024px — nunca no servidor. */
function useEhDesktop(): boolean {
  const [ehDesktop, setEhDesktop] = useState(false)

  useEffect(() => {
    const consulta = window.matchMedia(`(min-width: ${BREAKPOINT_DESKTOP_PX}px)`)
    setEhDesktop(consulta.matches)
    const ouvirMudanca = (evento: MediaQueryListEvent) => setEhDesktop(evento.matches)
    consulta.addEventListener("change", ouvirMudanca)
    return () => consulta.removeEventListener("change", ouvirMudanca)
  }, [])

  return ehDesktop
}

type LoginCanvasResponsivoProps = { className?: string }

/** Atmosfera do painel esquerdo: WebGL real só a partir do desktop. */
export function LoginCanvasResponsivo({ className }: LoginCanvasResponsivoProps): JSX.Element {
  const ehDesktop = useEhDesktop()
  if (!ehDesktop) return <Atmosphere intensidade="cheia" className={className} />
  return <LoginCanvasDinamico className={className} />
}

type Etapa = "credenciais" | "2fa"

type RespostaLogin =
  | { requiresTwoFactor: true; tempToken: string }
  | { user: { name: string | null; email: string }; authorization: unknown }

const MENSAGEM_ERRO_CREDENCIAIS =
  "Não foi possível entrar com esse e-mail e senha. Confira os dados e tente novamente."
const MENSAGEM_ERRO_CODIGO = "Código inválido. Confira os 6 dígitos e tente novamente."
const MENSAGEM_ERRO_REDE = "Não foi possível conectar. Verifique sua internet e tente novamente."
const TAMANHO_CODIGO = 6

type LoginFormProps = {
  /** Para onde ir depois do login. Vem de `?next=` (ex.: rota que o middleware barrou). */
  proximaRota?: string
}

export function LoginForm({ proximaRota = "/home" }: LoginFormProps): JSX.Element {
  const router = useRouter()

  const [etapa, setEtapa] = useState<Etapa>("credenciais")
  const [email, setEmail] = useState("")
  const [senha, setSenha] = useState("")
  const [tempToken, setTempToken] = useState<string | null>(null)
  const [codigo, setCodigo] = useState("")
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  const idEmail = useId()
  const idSenha = useId()
  const idCodigo = useId()

  async function aoSubmeterCredenciais(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    if (carregando) return
    setErro(null)
    setCarregando(true)
    try {
      const resposta = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password: senha }),
      })

      if (!resposta.ok) {
        // Mensagem genérica sempre — nunca revela se o e-mail existe.
        setErro(MENSAGEM_ERRO_CREDENCIAIS)
        return
      }

      const dados = (await resposta.json()) as RespostaLogin
      if ("requiresTwoFactor" in dados && dados.requiresTwoFactor) {
        setTempToken(dados.tempToken)
        setCodigo("")
        setEtapa("2fa")
        return
      }

      router.replace(proximaRota)
      router.refresh()
    } catch {
      setErro(MENSAGEM_ERRO_REDE)
    } finally {
      setCarregando(false)
    }
  }

  async function aoSubmeterCodigo(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    if (!tempToken || carregando) return
    setErro(null)
    setCarregando(true)
    try {
      const resposta = await fetch("/api/auth/2fa/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tempToken, totpCode: codigo }),
      })

      if (!resposta.ok) {
        setErro(MENSAGEM_ERRO_CODIGO)
        setCodigo("")
        return
      }

      router.replace(proximaRota)
      router.refresh()
    } catch {
      setErro(MENSAGEM_ERRO_REDE)
    } finally {
      setCarregando(false)
    }
  }

  function voltarParaCredenciais() {
    setEtapa("credenciais")
    setErro(null)
    setTempToken(null)
    setCodigo("")
  }

  return (
    <div className="w-full">
      {erro && (
        <div
          role="alert"
          aria-live="polite"
          className="mb-5 rounded-md border border-danger/20 bg-danger/5 px-4 py-3 text-sm text-danger"
        >
          {erro}
        </div>
      )}

      {etapa === "credenciais" ? (
        <form onSubmit={aoSubmeterCredenciais} noValidate className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor={idEmail}>E-mail corporativo</Label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id={idEmail}
                type="email"
                variant="box"
                autoComplete="email"
                required
                value={email}
                onChange={(evento) => setEmail(evento.target.value)}
                placeholder="voce@inhaus.com.br"
                aria-invalid={erro ? true : undefined}
                className="h-11 pl-10"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor={idSenha}>Senha</Label>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id={idSenha}
                type="password"
                variant="box"
                autoComplete="current-password"
                required
                value={senha}
                onChange={(evento) => setSenha(evento.target.value)}
                placeholder="••••••••"
                aria-invalid={erro ? true : undefined}
                className="h-11 pl-10"
              />
            </div>
          </div>

          <Button type="submit" size="lg" className="w-full" disabled={carregando} aria-busy={carregando}>
            {carregando && <Loader2 className="h-4 w-4 animate-spin" />}
            {carregando ? "Entrando…" : "Entrar"}
          </Button>
        </form>
      ) : (
        <form onSubmit={aoSubmeterCodigo} noValidate className="space-y-5">
          <div className="flex items-center gap-3 rounded-md border border-teal/15 bg-teal/5 px-4 py-3 text-sm text-teal">
            <ShieldCheck className="h-5 w-5 shrink-0" />
            Verificação em duas etapas ativada. Informe o código do seu aplicativo autenticador.
          </div>

          <div className="space-y-2">
            <Label htmlFor={idCodigo}>Código de verificação</Label>
            <Input
              id={idCodigo}
              variant="box"
              inputMode="numeric"
              autoComplete="one-time-code"
              required
              value={codigo}
              onChange={(evento) => setCodigo(evento.target.value.replace(/\D/g, "").slice(0, TAMANHO_CODIGO))}
              placeholder="000000"
              aria-invalid={erro ? true : undefined}
              className="h-11 text-center text-lg tracking-[0.5em]"
            />
          </div>

          <Button
            type="submit"
            size="lg"
            className="w-full"
            disabled={carregando || codigo.length !== TAMANHO_CODIGO}
            aria-busy={carregando}
          >
            {carregando ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
            {carregando ? "Verificando…" : "Verificar e entrar"}
          </Button>

          <button
            type="button"
            onClick={voltarParaCredenciais}
            className="w-full text-center text-sm text-muted-foreground hover:text-teal"
          >
            Usar outra conta
          </button>
        </form>
      )}
    </div>
  )
}
