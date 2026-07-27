import { forwardRef, type InputHTMLAttributes } from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

/**
 * Input base do design system. Padrão shadcn (cva), mas com os tokens DESTE
 * projeto. Duas variantes:
 *  - "underline": sem caixa, sem borda completa — usado nos campos com label
 *    flutuante da tela de login (a linha por baixo do campo é desenhada pelo
 *    componente que o consome, via `<span>`s irmãs, não por este componente).
 *  - "box": caixa com borda hairline, para formulários fora do login.
 *
 * Em ambas, a classe `peer` fica sempre presente para permitir o padrão
 * `peer-focus:` / `peer-[:not(:placeholder-shown)]:` usado pelas labels
 * flutuantes.
 */
const inputVariants = cva(
  "peer w-full bg-transparent font-sans text-[15px] text-foreground outline-none transition-colors duration-[240ms] ease-calm placeholder:text-transparent disabled:cursor-not-allowed disabled:opacity-60",
  {
    variants: {
      variant: {
        underline: "border-0 py-2",
        box: "rounded-md border border-hairline bg-card px-3 py-2 focus-visible:border-teal",
      },
    },
    defaultVariants: {
      variant: "underline",
    },
  },
)

export interface InputProps
  extends InputHTMLAttributes<HTMLInputElement>,
    VariantProps<typeof inputVariants> {}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, variant, ...props }, ref) => (
    <input ref={ref} className={cn(inputVariants({ variant }), className)} {...props} />
  ),
)
Input.displayName = "Input"

export { inputVariants }
