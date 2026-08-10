import * as React from "react"

import { cn } from "@/lib/utils"

export type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          "flex min-h-[88px] w-full rounded-xl border border-input bg-white/80 px-4 py-3 text-sm text-foreground shadow-sm transition-colors",
          "placeholder:text-muted-foreground/70",
          "focus-visible:outline-none focus-visible:border-teal/50 focus-visible:ring-2 focus-visible:ring-teal/25",
          "disabled:cursor-not-allowed disabled:opacity-50",
          className,
        )}
        ref={ref}
        {...props}
      />
    )
  },
)
Textarea.displayName = "Textarea"

export { Textarea }
