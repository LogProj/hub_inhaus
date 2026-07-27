"use client"

/**
 * Formulário de login. Campos sem caixa (label flutuante + underline que
 * cresce no foco) e segundo fator (2FA) inline: quando a API sinaliza que o
 * segundo fator é necessário, o MESMO contêiner troca de conteúdo com um
 * slide + fade — nunca navega para outra rota.
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

import {
  useEffect,
  useId,
  useRef,
  useState,
  type ClipboardEvent,
  type FormEvent,
  type KeyboardEvent,
} from "react"
import { useRouter } from "next/navigation"
import dynamicImport from "next/dynamic"
import { Atmosphere } from "@/components/atmosphere/Atmosphere"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

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
  const [codigo, setCodigo] = useState<string[]>(Array(TAMANHO_CODIGO).fill(""))
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [erroChave, setErroChave] = useState(0)
  const [entrada, setEntrada] = useState(false)

  const codigoRefs = useRef<Array<HTMLInputElement | null>>([])
  const idEmail = useId()
  const idSenha = useId()
  const idCodigoBase = useId()

  // Troca de etapa: slide lateral com fade, 280ms ease-calm — sem navegar.
  useEffect(() => {
    setEntrada(false)
    const reduzida = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    if (reduzida) {
      setEntrada(true)
      return
    }
    const quadro = requestAnimationFrame(() => setEntrada(true))
    return () => cancelAnimationFrame(quadro)
  }, [etapa])

  useEffect(() => {
    if (etapa === "2fa") codigoRefs.current[0]?.focus()
  }, [etapa])

  function dispararErro(mensagem: string) {
    setErro(mensagem)
    // Muda a key do <p role="alert"> para remontar o elemento e reiniciar o
    // shake mesmo quando o mesmo erro se repete duas vezes seguidas.
    setErroChave((chave) => chave + 1)
  }

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
        dispararErro(MENSAGEM_ERRO_CREDENCIAIS)
        return
      }

      const dados = (await resposta.json()) as RespostaLogin
      if ("requiresTwoFactor" in dados && dados.requiresTwoFactor) {
        setTempToken(dados.tempToken)
        setCodigo(Array(TAMANHO_CODIGO).fill(""))
        setEtapa("2fa")
        return
      }

      router.replace(proximaRota)
      router.refresh()
    } catch {
      dispararErro(MENSAGEM_ERRO_REDE)
    } finally {
      setCarregando(false)
    }
  }

  async function verificarCodigo(codigoCompleto: string) {
    if (!tempToken || codigoCompleto.length !== TAMANHO_CODIGO || carregando) return
    setErro(null)
    setCarregando(true)
    try {
      const resposta = await fetch("/api/auth/2fa/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tempToken, totpCode: codigoCompleto }),
      })

      if (!resposta.ok) {
        dispararErro(MENSAGEM_ERRO_CODIGO)
        setCodigo(Array(TAMANHO_CODIGO).fill(""))
        codigoRefs.current[0]?.focus()
        return
      }

      router.replace(proximaRota)
      router.refresh()
    } catch {
      dispararErro(MENSAGEM_ERRO_REDE)
    } finally {
      setCarregando(false)
    }
  }

  function aoMudarDigito(indice: number, valorBruto: string) {
    const digito = valorBruto.replace(/\D/g, "").slice(-1)
    const proximo = [...codigo]
    proximo[indice] = digito
    setCodigo(proximo)

    if (digito && indice < TAMANHO_CODIGO - 1) {
      codigoRefs.current[indice + 1]?.focus()
    }
    if (proximo.every((d) => d !== "")) {
      void verificarCodigo(proximo.join(""))
    }
  }

  function aoTeclarDigito(indice: number, evento: KeyboardEvent<HTMLInputElement>) {
    if (evento.key === "Backspace" && !codigo[indice] && indice > 0) {
      codigoRefs.current[indice - 1]?.focus()
    }
  }

  function aoColarCodigo(evento: ClipboardEvent<HTMLInputElement>) {
    const texto = evento.clipboardData.getData("text").replace(/\D/g, "").slice(0, TAMANHO_CODIGO)
    if (!texto) return
    evento.preventDefault()

    const proximo = Array(TAMANHO_CODIGO).fill("")
    texto.split("").forEach((digito, indice) => {
      proximo[indice] = digito
    })
    setCodigo(proximo)

    const indiceFoco = Math.min(texto.length, TAMANHO_CODIGO - 1)
    codigoRefs.current[indiceFoco]?.focus()

    if (texto.length === TAMANHO_CODIGO) void verificarCodigo(texto)
  }

  function voltarParaCredenciais() {
    setEtapa("credenciais")
    setErro(null)
    setTempToken(null)
    setCodigo(Array(TAMANHO_CODIGO).fill(""))
  }

  return (
    <div className="w-full max-w-[380px]">
      {/* Contêiner de altura fixa: a troca de etapa nunca pula o layout. */}
      <div className="relative min-h-[26rem] overflow-hidden">
        <div
          key={etapa}
          className={cn(
            "transition-all duration-[280ms] ease-calm",
            entrada ? "translate-x-0 opacity-100" : "-translate-x-4 opacity-0",
          )}
        >
          {etapa === "credenciais" ? (
            <form onSubmit={aoSubmeterCredenciais} noValidate>
              <h1 className="font-display text-display-sm text-foreground">Entrar</h1>
              <p className="mt-2 font-sans text-sm text-muted-foreground">
                Acesse o hub de indicadores da In-Haus.
              </p>

              <div className="mt-10 space-y-8">
                <div className="relative flex h-12 items-end">
                  <Input
                    id={idEmail}
                    type="email"
                    autoComplete="email"
                    required
                    placeholder=" "
                    value={email}
                    onChange={(evento) => setEmail(evento.target.value)}
                    aria-invalid={erro ? true : undefined}
                    className="pt-4 pb-1.5"
                  />
                  <label
                    htmlFor={idEmail}
                    className="pointer-events-none absolute left-0 top-1/2 -translate-y-1/2 font-sans text-[15px] text-muted-foreground transition-all duration-[240ms] ease-calm peer-focus:top-0 peer-focus:translate-y-0 peer-focus:text-label peer-focus:text-teal peer-[:not(:placeholder-shown)]:top-0 peer-[:not(:placeholder-shown)]:translate-y-0 peer-[:not(:placeholder-shown)]:text-label peer-[:not(:placeholder-shown)]:text-teal"
                  >
                    E-mail
                  </label>
                  <span aria-hidden="true" className="absolute inset-x-0 bottom-0 h-[1.5px] bg-hairline" />
                  <span
                    aria-hidden="true"
                    className="absolute inset-x-0 bottom-0 h-[1.5px] origin-left scale-x-0 bg-teal transition-transform duration-[240ms] ease-calm peer-focus:scale-x-100"
                  />
                </div>

                <div className="relative flex h-12 items-end">
                  <Input
                    id={idSenha}
                    type="password"
                    autoComplete="current-password"
                    required
                    placeholder=" "
                    value={senha}
                    onChange={(evento) => setSenha(evento.target.value)}
                    aria-invalid={erro ? true : undefined}
                    className="pt-4 pb-1.5"
                  />
                  <label
                    htmlFor={idSenha}
                    className="pointer-events-none absolute left-0 top-1/2 -translate-y-1/2 font-sans text-[15px] text-muted-foreground transition-all duration-[240ms] ease-calm peer-focus:top-0 peer-focus:translate-y-0 peer-focus:text-label peer-focus:text-teal peer-[:not(:placeholder-shown)]:top-0 peer-[:not(:placeholder-shown)]:translate-y-0 peer-[:not(:placeholder-shown)]:text-label peer-[:not(:placeholder-shown)]:text-teal"
                  >
                    Senha
                  </label>
                  <span aria-hidden="true" className="absolute inset-x-0 bottom-0 h-[1.5px] bg-hairline" />
                  <span
                    aria-hidden="true"
                    className="absolute inset-x-0 bottom-0 h-[1.5px] origin-left scale-x-0 bg-teal transition-transform duration-[240ms] ease-calm peer-focus:scale-x-100"
                  />
                </div>
              </div>

              {erro && (
                <p key={erroChave} role="alert" className="mt-6 animate-shake font-sans text-sm text-danger">
                  {erro}
                </p>
              )}

              <Button type="submit" size="lg" className={cn(erro ? "mt-6" : "mt-10")} disabled={carregando} aria-busy={carregando}>
                {carregando ? <PontosDeCarregamento /> : "Entrar"}
              </Button>
            </form>
          ) : (
            <div>
              <h1 className="font-display text-display-sm text-foreground">Verificação em duas etapas</h1>
              <p className="mt-2 font-sans text-sm text-muted-foreground">
                Digite o código de 6 dígitos do seu aplicativo autenticador.
              </p>

              <div
                role="group"
                aria-label="Código de verificação de 6 dígitos"
                className="mt-10 flex justify-between gap-2"
              >
                {codigo.map((digito, indice) => {
                  const idDigito = `${idCodigoBase}-digito-${indice}`
                  return (
                    <div key={indice}>
                      <label htmlFor={idDigito} className="sr-only">
                        Dígito {indice + 1} do código
                      </label>
                      <Input
                        id={idDigito}
                        ref={(el) => {
                          codigoRefs.current[indice] = el
                        }}
                        variant="box"
                        inputMode="numeric"
                        autoComplete={indice === 0 ? "one-time-code" : "off"}
                        maxLength={1}
                        value={digito}
                        aria-invalid={erro ? true : undefined}
                        onChange={(evento) => aoMudarDigito(indice, evento.target.value)}
                        onKeyDown={(evento) => aoTeclarDigito(indice, evento)}
                        onPaste={aoColarCodigo}
                        className="h-14 w-11 text-center font-mono text-lg tabular-nums"
                      />
                    </div>
                  )
                })}
              </div>

              {erro && (
                <p key={erroChave} role="alert" className="mt-6 animate-shake font-sans text-sm text-danger">
                  {erro}
                </p>
              )}

              <Button
                type="button"
                size="lg"
                className={cn(erro ? "mt-6" : "mt-10")}
                disabled={carregando || codigo.some((d) => !d)}
                aria-busy={carregando}
                onClick={() => void verificarCodigo(codigo.join(""))}
              >
                {carregando ? <PontosDeCarregamento /> : "Verificar"}
              </Button>

              <Button type="button" variant="link" size="sm" className="mt-4 px-0" onClick={voltarParaCredenciais}>
                Usar outra conta
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/** Estado de carregando do botão: três pontos em respiração, escalonados. */
function PontosDeCarregamento(): JSX.Element {
  return (
    <span className="flex items-center gap-1.5" aria-hidden="true">
      <span className="h-1 w-1 animate-breathe rounded-full bg-white" style={{ animationDelay: "0ms" }} />
      <span className="h-1 w-1 animate-breathe rounded-full bg-white" style={{ animationDelay: "120ms" }} />
      <span className="h-1 w-1 animate-breathe rounded-full bg-white" style={{ animationDelay: "240ms" }} />
    </span>
  )
}
