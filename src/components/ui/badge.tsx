import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors",
  {
    variants: {
      variant: {
        neutral: "bg-navy/8 text-navy",
        teal: "bg-teal-tint text-teal-deep",
        success: "bg-emerald-500/12 text-emerald-700",
        warn: "bg-amber-500/15 text-amber-700",
        danger: "bg-red-500/12 text-red-700",
        outline: "border border-navy/20 text-navy",
      },
    },
    defaultVariants: {
      variant: "neutral",
    },
  },
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />
}

export { Badge, badgeVariants }
