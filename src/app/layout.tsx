import type { Metadata, Viewport } from "next"
import { fontVariables } from "@/lib/fonts"
import { ThemeProvider } from "@/lib/theme"
import "./globals.css"

export const metadata: Metadata = {
  title: {
    default: "Hub de Indicadores — In-Haus",
    template: "%s · Hub In-Haus",
  },
  description:
    "Todos os indicadores da In-Haus em um só lugar: segurança, RH, qualidade, treinamentos e financeiro.",
  openGraph: {
    title: "Hub de Indicadores — In-Haus",
    description: "Todos os indicadores da In-Haus em um só lugar.",
    type: "website",
    locale: "pt_BR",
  },
  robots: { index: false, follow: false },
}

export const viewport: Viewport = {
  themeColor: "#002443",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning className={fontVariables}>
      <head>
        {/* Aplica o tema antes da pintura para não piscar. Claro é o padrão. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{if(localStorage.getItem('inhaus-theme')==='dark'){document.documentElement.classList.add('dark')}}catch(e){}})()`,
          }}
        />
      </head>
      <body>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  )
}
