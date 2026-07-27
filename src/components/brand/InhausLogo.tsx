import { cn } from "@/lib/utils"

/**
 * Logo oficial da In-Haus (marca principal do hub). SVG bicolor
 * (teal #027193 + cinza). Em fundos escuros (navy), use `onDark` para a versão
 * branca da marca. O tamanho é controlado pela altura via `className` (ex.: "h-8").
 */
export function InhausLogo({
  className,
  onDark = false,
}: {
  className?: string
  onDark?: boolean
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={onDark ? "/inhaus-logo-white.svg" : "/logo_inhaus.svg"}
      alt="In-Haus"
      className={cn("inline-block h-6 w-auto select-none align-middle", className)}
    />
  )
}
