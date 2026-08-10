"use client"

import * as React from "react"
import { CheckCircle2, AlertTriangle, X } from "lucide-react"

import { cn } from "@/lib/utils"

/**
 * Feedback leve (toast) para as ações de escrita do hub (salvou, falhou…). Sem
 * dependência externa: um provider com fila em estado + viewport fixa. Envolver a
 * árvore com <ToastProvider> e disparar com `useToast().toast(...)`.
 */

type TipoToast = "sucesso" | "erro" | "info"

type Toast = {
  id: number
  tipo: TipoToast
  titulo: string
  descricao?: string
}

type ContextoToast = {
  toast: (t: Omit<Toast, "id">) => void
  sucesso: (titulo: string, descricao?: string) => void
  erro: (titulo: string, descricao?: string) => void
}

const ToastContext = React.createContext<ContextoToast | null>(null)

let seq = 0

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<Toast[]>([])

  const remover = React.useCallback((id: number) => {
    setToasts((atual) => atual.filter((t) => t.id !== id))
  }, [])

  const toast = React.useCallback(
    (t: Omit<Toast, "id">) => {
      const id = ++seq
      setToasts((atual) => [...atual, { ...t, id }])
      setTimeout(() => remover(id), 5000)
    },
    [remover],
  )

  const valor = React.useMemo<ContextoToast>(
    () => ({
      toast,
      sucesso: (titulo, descricao) => toast({ tipo: "sucesso", titulo, descricao }),
      erro: (titulo, descricao) => toast({ tipo: "erro", titulo, descricao }),
    }),
    [toast],
  )

  return (
    <ToastContext.Provider value={valor}>
      {children}
      <div className="pointer-events-none fixed bottom-4 right-4 z-[60] flex w-full max-w-sm flex-col gap-2">
        {toasts.map((t) => (
          <ToastCard key={t.id} toast={t} onClose={() => remover(t.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  )
}

function ToastCard({ toast, onClose }: { toast: Toast; onClose: () => void }) {
  const Icone = toast.tipo === "sucesso" ? CheckCircle2 : toast.tipo === "erro" ? AlertTriangle : null
  return (
    <div
      role="status"
      className={cn(
        "pointer-events-auto flex items-start gap-3 rounded-2xl border bg-card p-4 shadow-card",
        toast.tipo === "sucesso" && "border-emerald-500/30",
        toast.tipo === "erro" && "border-red-500/30",
        toast.tipo === "info" && "border-border/70",
      )}
    >
      {Icone ? (
        <Icone
          className={cn(
            "mt-0.5 h-5 w-5 shrink-0",
            toast.tipo === "sucesso" ? "text-emerald-600" : "text-red-600",
          )}
        />
      ) : null}
      <div className="flex-1">
        <p className="text-sm font-semibold text-navy">{toast.titulo}</p>
        {toast.descricao ? <p className="mt-0.5 text-sm text-muted-foreground">{toast.descricao}</p> : null}
      </div>
      <button
        type="button"
        onClick={onClose}
        className="rounded-full p-1 text-muted-foreground transition-colors hover:bg-teal-tint hover:text-navy"
      >
        <X className="h-4 w-4" />
        <span className="sr-only">Fechar</span>
      </button>
    </div>
  )
}

export function useToast(): ContextoToast {
  const ctx = React.useContext(ToastContext)
  if (!ctx) throw new Error("useToast precisa estar dentro de <ToastProvider>")
  return ctx
}
