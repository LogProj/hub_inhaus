"use client"

import { QRCodeCanvas } from "qrcode.react"
import { useState } from "react"
import { Button } from "@/components/ui/button"

/** URL pública do treinamento a partir do token (usa a origem atual). */
function urlPublica(token: string): string {
  if (typeof window === "undefined") return `/t/${token}`
  return `${window.location.origin}/t/${token}`
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
    // Escapa o nome (definido pelo usuário) antes de injetar no HTML da janela de impressão.
    const seguro = (t: string) =>
      t.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!))
    const nomeSeguro = seguro(nome)
    janela.document.write(
      `<html><head><title>${nomeSeguro}</title></head><body style="font-family:sans-serif;text-align:center;padding:24px">
       <h2>${nomeSeguro}</h2><p>Aponte a câmera para registrar presença</p>
       <img src="${canvas?.toDataURL() ?? ""}" style="width:280px"/>
       <p style="font-size:12px;color:gray">${seguro(url)}</p></body></html>`,
    )
    janela.document.close()
    janela.focus()
    janela.print()
  }

  return (
    <div className="glass rounded-3xl p-6 space-y-4 text-center">
      <div id="qr-treino" className="flex justify-center">
        <QRCodeCanvas value={url} size={200} marginSize={4} />
      </div>
      <p className="text-xs text-navy/60 break-all">{url}</p>
      <div className="flex gap-2 justify-center">
        <Button variant="outline" onClick={copiar}>{copiado ? "Copiado!" : "Copiar link"}</Button>
        <Button variant="outline" onClick={() => window.open(url, "_blank")}>Abrir</Button>
        <Button variant="outline" onClick={imprimir}>Imprimir</Button>
      </div>
    </div>
  )
}
