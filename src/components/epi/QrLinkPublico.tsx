"use client"

import * as React from "react"
import { QRCodeSVG } from "qrcode.react"
import { Copy, Check, ExternalLink, Printer } from "lucide-react"

import { cn } from "@/lib/utils"

/**
 * QR Code + link público do checklist de um turno. O QR aponta para /p/<token>.
 * `tamanho` controla o QR; `compacto` esconde o QR e mostra só o link (útil em
 * listas). Server-side o QR não renderiza — a URL absoluta é montada no cliente.
 */
export function QrLinkPublico({
  token,
  titulo,
  tamanho = 168,
  compacto = false,
  className,
}: {
  token: string
  /** Legenda impressa junto do QR (ex.: nome do turno / cliente). */
  titulo?: string
  tamanho?: number
  compacto?: boolean
  className?: string
}) {
  const [copiado, setCopiado] = React.useState(false)
  const [url, setUrl] = React.useState("")
  const qrRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    setUrl(`${window.location.origin}/p/${token}`)
  }, [token])

  function imprimir() {
    const svg = qrRef.current?.querySelector("svg")?.outerHTML ?? ""
    const janela = window.open("", "_blank", "width=520,height=680")
    if (!janela) return
    janela.document.write(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">
      <title>Checklist de EPI — QR</title>
      <style>
        *{box-sizing:border-box} body{font-family:Arial,Helvetica,sans-serif;color:#002443;margin:0;padding:40px;text-align:center}
        .eyebrow{letter-spacing:.18em;text-transform:uppercase;font-size:12px;color:#027193;font-weight:700}
        h1{font-size:22px;margin:6px 0 2px}
        .cr{font-size:13px;color:#5b6b7a;margin-bottom:22px}
        .qr{display:inline-block;border:1px solid #e2e8f0;border-radius:16px;padding:18px}
        .dica{font-size:13px;color:#5b6b7a;margin-top:16px}
        .link{font-family:monospace;font-size:12px;color:#015066;margin-top:6px;word-break:break-all}
        @media print{body{padding:0}}
      </style></head><body>
      <div class="eyebrow">Checklist de EPI</div>
      ${titulo ? `<h1>${titulo}</h1>` : "<h1>Preenchimento do turno</h1>"}
      <div class="cr">Aponte a câmera do celular para o código abaixo</div>
      <div class="qr">${svg}</div>
      <div class="dica">Cada colaborador seleciona o próprio nome, confirma o CPF e marca os itens.</div>
      <div class="link">${url}</div>
      </body></html>`)
    janela.document.close()
    janela.focus()
    // pequena espera para o SVG renderizar antes do diálogo de impressão
    setTimeout(() => janela.print(), 250)
  }

  async function copiar() {
    if (!url) return
    try {
      await navigator.clipboard.writeText(url)
      setCopiado(true)
      setTimeout(() => setCopiado(false), 1500)
    } catch {
      /* clipboard indisponível */
    }
  }

  const barra = (
    <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-teal/30 bg-teal-tint/50 px-3 py-2">
      <span className="min-w-0 flex-1 truncate font-mono text-xs text-teal-deep">/p/{token}</span>
      <button
        type="button"
        onClick={copiar}
        className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-teal-deep transition-colors hover:bg-white/60"
      >
        {copiado ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
        {copiado ? "Copiado" : "Copiar"}
      </button>
      <a
        href={`/p/${token}`}
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-teal-deep transition-colors hover:bg-white/60"
      >
        <ExternalLink className="h-3.5 w-3.5" /> Abrir
      </a>
    </div>
  )

  if (compacto) return <div className={className}>{barra}</div>

  return (
    <div className={cn("flex flex-col items-center gap-3", className)}>
      <div ref={qrRef} className="rounded-2xl border border-navy/10 bg-white p-3 shadow-card">
        {url ? (
          <QRCodeSVG value={url} size={tamanho} level="M" marginSize={1} />
        ) : (
          <div style={{ width: tamanho, height: tamanho }} className="animate-pulse rounded bg-navy/5" />
        )}
      </div>
      <p className="text-xs text-muted-foreground">Aponte a câmera para abrir o checklist</p>
      <div className="flex w-full max-w-xs flex-col gap-2">
        {barra}
        <button
          type="button"
          onClick={imprimir}
          disabled={!url}
          className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-navy/15 bg-white/80 px-3 py-2 text-sm font-medium text-navy transition-colors hover:bg-teal-tint disabled:opacity-50"
        >
          <Printer className="h-4 w-4" /> Imprimir QR Code
        </button>
      </div>
    </div>
  )
}
