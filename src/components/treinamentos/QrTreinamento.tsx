"use client"

import { QRCodeCanvas } from "qrcode.react"
import { useState } from "react"
import { QrCode } from "lucide-react"

import { Button } from "@/components/ui/button"
import { InhausLogo } from "@/components/brand/InhausLogo"
import {
  Dialog,
  DialogContent,
  DialogTrigger,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"

/** URL pública do treinamento a partir do token (usa a origem atual). */
function urlPublica(token: string): string {
  if (typeof window === "undefined") return `/t/${token}`
  return `${window.location.origin}/t/${token}`
}

/** Escapa texto definido pelo usuário antes de injetar no HTML da janela de impressão. */
function escapar(t: string): string {
  return t.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!))
}

export function QrTreinamento({ token, nome }: { token: string; nome: string }) {
  const url = urlPublica(token)
  const [copiado, setCopiado] = useState(false)

  async function copiar() {
    await navigator.clipboard.writeText(url)
    setCopiado(true)
    setTimeout(() => setCopiado(false), 1500)
  }

  function imprimir() {
    const janela = window.open("", "_blank", "width=480,height=640")
    if (!janela) return
    const canvas = document.querySelector("#qr-treino canvas") as HTMLCanvasElement | null
    const nomeSeguro = escapar(nome)
    janela.document.write(
      `<html><head><title>${nomeSeguro}</title></head><body style="font-family:sans-serif;text-align:center;padding:24px">
       <h2>${nomeSeguro}</h2><p>Aponte a câmera para registrar presença</p>
       <img src="${canvas?.toDataURL() ?? ""}" style="width:280px"/>
       <p style="font-size:12px;color:gray">${escapar(url)}</p></body></html>`,
    )
    janela.document.close()
    janela.focus()
    janela.print()
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button className="w-full gap-2">
          <QrCode className="h-4 w-4" />
          Abrir QR Code
        </Button>
      </DialogTrigger>

      {/* Tela de apresentação: grande e limpa, feita para projetar/mostrar e o pessoal escanear. */}
      <DialogContent className="max-w-xl">
        <div className="flex flex-col items-center gap-5 pt-2 text-center">
          <InhausLogo className="h-8" />

          <div className="space-y-1">
            <DialogTitle className="text-2xl">{nome}</DialogTitle>
            <DialogDescription className="text-base text-navy/70">
              Aponte a câmera do celular para registrar sua presença
            </DialogDescription>
          </div>

          <div id="qr-treino" className="rounded-3xl bg-white p-6 shadow-card ring-1 ring-navy/5">
            <QRCodeCanvas value={url} size={280} marginSize={2} />
          </div>

          <p className="max-w-full break-all text-xs text-navy/50">{url}</p>

          <div className="flex flex-wrap justify-center gap-2">
            <Button variant="outline" onClick={copiar}>{copiado ? "Copiado!" : "Copiar link"}</Button>
            <Button variant="outline" onClick={() => window.open(url, "_blank")}>Abrir link</Button>
            <Button variant="outline" onClick={imprimir}>Imprimir</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
