import { forwardRef, type ButtonHTMLAttributes } from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

/**
 * Botão base do design system. Segue o padrão shadcn (cva + `asChild` via
 * Radix Slot), mas com a paleta e o motion DESTE projeto — nunca a paleta
 * padrão do shadcn. Sem hexadecimal solto: só tokens (`bg-teal`, `bg-muted`,
 * `border-hairline`...).
 */
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md font-sans text-sm font-medium transition-colors duration-[240ms] ease-calm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-60",
  {
    variants: {
      variant: {
        default: "bg-teal text-white hover:bg-teal-bright",
        outline:
          "border border-hairline bg-transparent text-foreground hover:border-teal/30",
        ghost: "bg-transparent text-foreground hover:bg-muted",
        link: "bg-transparent text-teal underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4",
        lg: "h-12 w-full px-6 text-[15px]",
        sm: "h-8 px-3 text-[13px]",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
)

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  /** Renderiza como o filho (via Radix Slot) em vez de um `<button>` próprio. */
  asChild?: boolean
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        ref={ref}
        className={cn(buttonVariants({ variant, size }), className)}
        {...props}
      />
    )
  },
)
Button.displayName = "Button"

export { buttonVariants }
