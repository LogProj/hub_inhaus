"use client"

/**
 * Label acessível para os campos em caixa (`Input variant="box"`). Padrão
 * shadcn/Radix — usado sobretudo no formulário de login, que abandonou o
 * padrão de label flutuante em favor de label fixa acima do campo.
 */

import { forwardRef, type ComponentPropsWithoutRef, type ElementRef } from "react"
import * as LabelPrimitive from "@radix-ui/react-label"
import { cn } from "@/lib/utils"

export const Label = forwardRef<
  ElementRef<typeof LabelPrimitive.Root>,
  ComponentPropsWithoutRef<typeof LabelPrimitive.Root>
>(({ className, ...props }, ref) => (
  <LabelPrimitive.Root
    ref={ref}
    className={cn(
      "font-sans text-sm font-medium leading-none text-foreground/80 peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
      className,
    )}
    {...props}
  />
))
Label.displayName = LabelPrimitive.Root.displayName
