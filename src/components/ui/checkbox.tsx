"use client"

import * as React from "react"
import { Check, Minus } from "lucide-react"

import { cn } from "@/lib/utils"

export type CheckedState = boolean | "indeterminate"

export interface CheckboxProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "onChange" | "value"> {
  checked?: CheckedState
  onCheckedChange?: (checked: boolean) => void
}

/**
 * Checkbox acessível (sem dependência do Radix Checkbox, que não está instalado).
 * Botão com role="checkbox" + aria-checked; suporta estado "indeterminate" para
 * seleção parcial (ex.: "selecionar todos" numa lista).
 */
const Checkbox = React.forwardRef<HTMLButtonElement, CheckboxProps>(
  ({ className, checked = false, onCheckedChange, disabled, ...props }, ref) => {
    const marcado = checked === true
    const indeterminado = checked === "indeterminate"
    return (
      <button
        ref={ref}
        type="button"
        role="checkbox"
        aria-checked={indeterminado ? "mixed" : marcado}
        disabled={disabled}
        onClick={() => onCheckedChange?.(!marcado)}
        className={cn(
          "inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-colors",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal/40 focus-visible:ring-offset-1",
          marcado || indeterminado
            ? "border-teal bg-teal text-white"
            : "border-navy/25 bg-white/80 text-transparent hover:border-teal/50",
          disabled && "cursor-not-allowed opacity-50",
          className,
        )}
        {...props}
      >
        {indeterminado ? <Minus className="h-3.5 w-3.5" /> : marcado ? <Check className="h-3.5 w-3.5" /> : null}
      </button>
    )
  },
)
Checkbox.displayName = "Checkbox"

export { Checkbox }
