"use client"

import * as React from "react"

import { cn } from "@/lib/utils"

export interface SwitchProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "onChange" | "value"> {
  checked?: boolean
  onCheckedChange?: (checked: boolean) => void
}

/**
 * Switch acessível (role="switch"). Usado para ligar/desligar (ativo/inativo,
 * conforme/não conforme quando fizer sentido visual).
 */
const Switch = React.forwardRef<HTMLButtonElement, SwitchProps>(
  ({ className, checked = false, onCheckedChange, disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onCheckedChange?.(!checked)}
        className={cn(
          "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal/40 focus-visible:ring-offset-2",
          checked ? "bg-teal" : "bg-navy/20",
          disabled && "cursor-not-allowed opacity-50",
          className,
        )}
        {...props}
      >
        <span
          className={cn(
            "inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform",
            checked ? "translate-x-5" : "translate-x-0.5",
          )}
        />
      </button>
    )
  },
)
Switch.displayName = "Switch"

export { Switch }
