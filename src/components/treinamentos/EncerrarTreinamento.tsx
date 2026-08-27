"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Lock } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogTrigger,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"

export function EncerrarTreinamento({ id }: { id: string }) {
  const router = useRouter()
  const [aberto, setAberto] = useState(false)
  const [confirmando, setConfirmando] = useState(false)

  async function encerrar() {
    setConfirmando(true)
    await fetch(`/api/treinamentos/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status: "ENCERRADO" }),
    })
    setAberto(false)
    router.refresh()
  }

  return (
    <Dialog open={aberto} onOpenChange={setAberto}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full gap-2">
          <Lock className="h-4 w-4" />
          Encerrar treinamento
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Encerrar este treinamento?</DialogTitle>
          <DialogDescription>
            Depois de encerrado, <strong>não será mais possível gerar QR Codes</strong> nem
            registrar novas presenças para este treinamento. Esta ação não pode ser desfeita.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => setAberto(false)}>
            Cancelar
          </Button>
          <Button type="button" onClick={encerrar} disabled={confirmando}>
            {confirmando ? "Encerrando..." : "Sim, encerrar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
