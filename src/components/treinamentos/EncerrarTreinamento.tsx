"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"

export function EncerrarTreinamento({ id }: { id: string }) {
  const router = useRouter()
  const [confirmando, setConfirmando] = useState(false)

  async function encerrar() {
    setConfirmando(true)
    await fetch(`/api/treinamentos/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status: "ENCERRADO" }),
    })
    router.refresh()
  }

  return (
    <Button variant="outline" onClick={encerrar} disabled={confirmando}>
      {confirmando ? "Encerrando..." : "Encerrar treinamento"}
    </Button>
  )
}
