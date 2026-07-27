# Fundação Visual do Hub In-Haus — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construir a fundação visual e estrutural do hub de indicadores In-Haus — design system, tela de login, shell da aplicação e Home "mission control" — com dados mockados.

**Architecture:** Next.js 14 App Router com Server Components por padrão. O design system vive em `src/styles/tokens.css` + `tailwind.config.ts` e é o contrato que todos os componentes consomem. Os cinco domínios são registrados em `src/lib/domains.ts`, fonte de verdade única que alimenta sidebar, command palette, Home e permissões. A atmosfera visual (gradiente de profundidade, malha de dados, aurora) é implementada em CSS/SVG no shell e em WebGL apenas na rota de login.

**Tech Stack:** Next.js 14.2, TypeScript 5, Tailwind 3.4, shadcn/ui, Prisma 5 + Postgres, Recharts 3, `ogl` (WebGL), `geist` (fontes), Vitest.

**Spec:** `docs/superpowers/specs/2026-07-27-hub-indicadores-inhaus-design.md`

---

## Convenções para quem executa

- **Idioma:** interface, comentários e mensagens de commit em português do Brasil.
- **Nada de hexadecimal solto em componente.** Toda cor vem de token Tailwind (`bg-navy`, `text-teal`, `border-hairline`). Isso é critério de revisão.
- **Server Component por padrão.** Só adicione `"use client"` nos arquivos onde o plano manda.
- **Commit ao fim de cada task**, com a mensagem indicada.
- **Teste onde há lógica.** Componentes puramente visuais são verificados por build + checagem visual descrita no passo; funções (`domains`, `utils`, formatação) têm teste Vitest de verdade.

---

## Estrutura de arquivos

| Arquivo | Responsabilidade |
|---|---|
| `src/styles/tokens.css` | Custom properties de cor, raio e sombra nos dois temas |
| `tailwind.config.ts` | Mapeia tokens para utilitários, escala tipográfica, keyframes |
| `src/app/layout.tsx` | Fontes, `<html>`, providers |
| `src/lib/theme.tsx` | Provider de tema + hook, sem flash na hidratação |
| `src/components/shell/ThemeToggle.tsx` | Botão sol/lua |
| `src/lib/domains.ts` | Registro único dos 5 domínios e suas telas |
| `src/lib/utils.ts` | `cn()` e formatadores numéricos |
| `src/components/brand/InhausLogo.tsx` | Logo em React, aceita `variant` e `animated` |
| `src/components/atmosphere/DepthGradient.tsx` | Camada 1 — gradiente radial de profundidade |
| `src/components/atmosphere/DataMesh.tsx` | Camada 2 — malha de dados em SVG com pulsos |
| `src/components/atmosphere/Aurora.tsx` | Camada 3 — blobs de luz derivando |
| `src/components/atmosphere/Atmosphere.tsx` | Compõe as 3 camadas por `intensity` |
| `src/components/atmosphere/LoginCanvas.tsx` | Versão WebGL reativa ao mouse, só no login |
| `src/components/brand/BootSequence.tsx` | Abertura animada da logo, 1× por sessão |
| `src/app/(auth)/login/page.tsx` | Tela de login |
| `src/components/auth/LoginForm.tsx` | Formulário, campos flutuantes, 2FA inline |
| `src/components/shell/AppSidebar.tsx` | Sidebar navy com domínios |
| `src/components/shell/AppTopbar.tsx` | Topbar contínua com a sidebar |
| `src/components/shell/CommandPalette.tsx` | ⌘K com busca fuzzy sobre indicadores |
| `src/components/kpi/MetricValue.tsx` | Número em Geist Mono com contagem |
| `src/components/kpi/TrendBadge.tsx` | Variação com seta e cor semântica |
| `src/components/kpi/Sparkline.tsx` | Sparkline SVG de 12 pontos |
| `src/components/kpi/KpiCard.tsx` | Card do pulso, compõe os três acima |
| `src/mocks/home-mock.ts` | Dados fictícios tipados da Home |
| `src/app/(app)/home/page.tsx` | Home mission control, 4 faixas |
| `src/components/states/*` | Empty state, 403, 404, error |

---

## Task 1: Scaffold do projeto

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.js`, `postcss.config.js`, `.env.example`
- Create: `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/globals.css`

- [ ] **Step 1: Criar o `package.json`**

```json
{
  "name": "hub_inhaus",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "prisma generate && next build",
    "start": "next start",
    "lint": "next lint",
    "test": "vitest run",
    "test:watch": "vitest",
    "db:generate": "prisma generate",
    "db:push": "prisma db push"
  },
  "dependencies": {
    "@prisma/client": "^5.22.0",
    "@radix-ui/react-dialog": "^1.1.6",
    "@radix-ui/react-label": "^2.1.8",
    "@radix-ui/react-slot": "^1.2.4",
    "@radix-ui/react-tooltip": "^1.1.8",
    "class-variance-authority": "^0.7.1",
    "clsx": "^2.1.1",
    "geist": "^1.3.1",
    "lucide-react": "^0.563.0",
    "next": "^14.2.0",
    "ogl": "^1.0.11",
    "pg": "^8.22.0",
    "react": "^18.3.0",
    "react-dom": "^18.3.0",
    "recharts": "^3.8.1",
    "tailwind-merge": "^3.4.0"
  },
  "devDependencies": {
    "@types/node": "^20.12.0",
    "@types/pg": "^8.20.0",
    "@types/react": "^18.3.0",
    "@types/react-dom": "^18.3.0",
    "autoprefixer": "^10.4.19",
    "eslint": "^8.57.0",
    "eslint-config-next": "^14.2.0",
    "postcss": "^8.4.38",
    "prisma": "^5.22.0",
    "tailwindcss": "^3.4.3",
    "typescript": "^5.4.0",
    "vitest": "^2.1.0"
  }
}
```

- [ ] **Step 2: Criar `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./src/*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 3: Criar `next.config.js` e `postcss.config.js`**

```js
// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = { reactStrictMode: true }
module.exports = nextConfig
```

```js
// postcss.config.js
module.exports = { plugins: { tailwindcss: {}, autoprefixer: {} } }
```

- [ ] **Step 4: Criar `.env.example`**

```bash
# Postgres do hub (autorização local) e do db_inhaus (indicadores)
DATABASE_URL=postgresql://usuario:senha@host:5432/db_inhaus
DATABASE_URL_INHAUS=postgresql://usuario:senha@host:5432/db_inhaus

# global_auth (provedor de identidade)
AUTH_BASE_URL=http://host:55321
AUTH_API_KEY=

AUTH_ACCESS_COOKIE_MAX_AGE_SECONDS=43200
AUTH_REFRESH_COOKIE_MAX_AGE_SECONDS=7776000

# Admin(s) bootstrap, separados por vírgula
BOOTSTRAP_ADMIN_EMAILS=
```

- [ ] **Step 5: Instalar dependências**

Run: `npm install`
Expected: instalação sem erro; `node_modules/` criado.

- [ ] **Step 6: Confirmar que a fonte Bricolage Grotesque existe no `next/font/google` desta versão**

Run: `node -e "const d=require('next/dist/compiled/@next/font/dist/google/font-data.json'); console.log(!!d['Bricolage Grotesque'])"`
Expected: `true`.

Se retornar `false` ou o caminho não existir, pare e reporte — o fallback é instalar `@fontsource-variable/bricolage-grotesque` e importar no `globals.css`. Não substitua a fonte por outra sem avisar.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "chore: scaffold do projeto Next.js 14 com TypeScript e Tailwind"
```

---

## Task 2: Design tokens

**Files:**
- Create: `src/styles/tokens.css`
- Create: `tailwind.config.ts`
- Create: `src/app/globals.css`

Os valores HSL abaixo são as cores da marca convertidas. Não recalcule: `#002443` → `205 100% 13%`, `#F2F3F8` → `230 26% 96%`, `#027193` → `193 96% 29%`, `#00121F` → `205 100% 6%`, `#062B45` → `207 84% 15%`.

- [ ] **Step 1: Criar `src/styles/tokens.css`**

```css
/* Tokens do design system In-Haus.
   Regra estruturante: profundidade no ambiente, planura nos dados.
   O shell é sempre navy nos dois temas; só o canvas de conteúdo troca. */

@layer base {
  :root {
    /* --- Marca --- */
    --navy: 205 100% 13%;        /* #002443 — estrutura */
    --navy-deep: 205 100% 6%;    /* #00121F — profundidade */
    --mist: 230 26% 96%;         /* #F2F3F8 — superfície clara */
    --teal: 193 96% 29%;         /* #027193 — ação */
    --teal-bright: 193 80% 42%;  /* hover/foco do teal */

    /* --- Semânticas (dessaturadas de propósito) --- */
    --success: 168 62% 32%;
    --warn: 38 72% 46%;
    --danger: 356 58% 48%;

    /* --- Tema claro (padrão) --- */
    --background: var(--mist);
    --foreground: 205 60% 12%;
    --card: 0 0% 100%;
    --card-foreground: 205 60% 12%;
    --muted: 230 20% 92%;
    --muted-foreground: 205 14% 44%;
    --hairline: 205 100% 13%;    /* usado com /8 de opacidade */
    --hairline-opacity: 0.08;
    --ring: var(--teal);
    --radius: 0.625rem;          /* 10px */

    /* --- Shell (idêntico nos dois temas) --- */
    --shell: var(--navy);
    --shell-foreground: 0 0% 100%;
    --shell-muted: 0 0% 100%;    /* usado com /55 */
  }

  .dark {
    --background: var(--navy-deep);
    --foreground: 230 26% 94%;
    --card: 207 84% 15%;         /* #062B45 */
    --card-foreground: 230 26% 94%;
    --muted: 207 50% 20%;
    --muted-foreground: 205 16% 66%;
    --hairline: 0 0% 100%;
    --hairline-opacity: 0.08;
  }
}
```

- [ ] **Step 2: Criar `tailwind.config.ts`**

```ts
import type { Config } from "tailwindcss"

const config: Config = {
  darkMode: ["class"],
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        navy: { DEFAULT: "hsl(var(--navy))", deep: "hsl(var(--navy-deep))" },
        mist: "hsl(var(--mist))",
        teal: { DEFAULT: "hsl(var(--teal))", bright: "hsl(var(--teal-bright))" },
        success: "hsl(var(--success))",
        warn: "hsl(var(--warn))",
        danger: "hsl(var(--danger))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        card: { DEFAULT: "hsl(var(--card))", foreground: "hsl(var(--card-foreground))" },
        muted: { DEFAULT: "hsl(var(--muted))", foreground: "hsl(var(--muted-foreground))" },
        shell: { DEFAULT: "hsl(var(--shell))", foreground: "hsl(var(--shell-foreground))" },
        ring: "hsl(var(--ring))",
      },
      borderColor: {
        hairline: "hsl(var(--hairline) / var(--hairline-opacity))",
      },
      fontFamily: {
        display: ["var(--font-display)", "ui-sans-serif", "sans-serif"],
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      fontSize: {
        // Escala razão 1.25, fluida.
        label: ["0.75rem", { lineHeight: "1rem", letterSpacing: "0.04em" }],
        metric: ["clamp(1.75rem, 2.4vw, 2.25rem)", { lineHeight: "1.05", letterSpacing: "-0.02em" }],
        "display-sm": ["clamp(1.5rem, 2vw, 1.75rem)", { lineHeight: "1.15", letterSpacing: "-0.02em" }],
        "display-md": ["clamp(2rem, 3.2vw, 2.5rem)", { lineHeight: "1.1", letterSpacing: "-0.03em" }],
        "display-lg": ["clamp(2.5rem, 4.5vw, 3.5rem)", { lineHeight: "1.05", letterSpacing: "-0.04em" }],
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      boxShadow: {
        // Elevação vem de contraste de superfície, não de blur.
        hairline: "0 1px 2px hsl(var(--navy) / 0.04)",
        lift: "0 2px 8px hsl(var(--navy) / 0.06)",
      },
      transitionTimingFunction: {
        calm: "cubic-bezier(0.22, 1, 0.36, 1)",
      },
      keyframes: {
        "rise-in": { from: { opacity: "0", transform: "translateY(8px)" }, to: { opacity: "1", transform: "translateY(0)" } },
        drift: {
          "0%,100%": { transform: "translate3d(0,0,0) scale(1)" },
          "50%": { transform: "translate3d(6%, -4%, 0) scale(1.12)" },
        },
        "mesh-pulse": { "0%,100%": { opacity: "0.15" }, "50%": { opacity: "0.75" } },
        shimmer: { "100%": { transform: "translateX(100%)" } },
        breathe: { "0%,100%": { opacity: "0.35" }, "50%": { opacity: "1" } },
      },
      animation: {
        "rise-in": "rise-in 320ms cubic-bezier(0.22,1,0.36,1) both",
        drift: "drift 40s ease-in-out infinite",
        breathe: "breathe 2.4s ease-in-out infinite",
      },
    },
  },
  plugins: [],
}

export default config
```

- [ ] **Step 3: Criar `src/app/globals.css`**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@import "../styles/tokens.css";

@layer base {
  html {
    @apply antialiased;
  }
  body {
    @apply bg-background text-foreground font-sans;
  }
  /* Números nunca dançam. */
  .tabular,
  table,
  [data-metric] {
    font-variant-numeric: tabular-nums;
  }
  /* Foco sempre visível, sempre teal. */
  :focus-visible {
    @apply outline-none ring-2 ring-ring ring-offset-2 ring-offset-background;
  }
}

@layer utilities {
  .stagger > * {
    animation: rise-in 320ms cubic-bezier(0.22, 1, 0.36, 1) both;
  }
  .stagger > *:nth-child(1) { animation-delay: 0ms; }
  .stagger > *:nth-child(2) { animation-delay: 60ms; }
  .stagger > *:nth-child(3) { animation-delay: 120ms; }
  .stagger > *:nth-child(4) { animation-delay: 180ms; }
  .stagger > *:nth-child(5) { animation-delay: 240ms; }
}

/* Motion sussurra — e cala quando pedem. */
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

- [ ] **Step 4: Verificar que o Tailwind compila os tokens**

Run: `npx tailwindcss -i src/app/globals.css -o /tmp/out.css --config tailwind.config.ts 2>&1 | tail -5`
Expected: compila sem erro (avisos de "no utility classes detected" são aceitáveis nesta etapa).

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: design tokens e configuracao do Tailwind"
```

---

## Task 3: Fontes e layout raiz

**Files:**
- Create: `src/app/layout.tsx`
- Create: `src/lib/fonts.ts`

- [ ] **Step 1: Criar `src/lib/fonts.ts`**

```ts
import { Bricolage_Grotesque } from "next/font/google"
import { GeistSans } from "geist/font/sans"
import { GeistMono } from "geist/font/mono"

// Display com voz própria — nem Inter, nem Roboto.
export const display = Bricolage_Grotesque({
  subsets: ["latin"],
  weight: ["600", "700"],
  variable: "--font-display",
  display: "swap",
})

export const sans = GeistSans
export const mono = GeistMono

// `geist` já expõe as variáveis --font-geist-sans / --font-geist-mono, mas o
// design system usa nomes próprios; o mapeamento é feito no layout raiz.
export const fontVariables = [
  display.variable,
  GeistSans.variable,
  GeistMono.variable,
].join(" ")
```

- [ ] **Step 2: Criar `src/app/layout.tsx`**

```tsx
import type { Metadata } from "next"
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
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning className={fontVariables}>
      <head>
        {/* Aplica o tema antes da pintura para não piscar. Claro é o padrão. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('inhaus-theme');if(t==='dark'){document.documentElement.classList.add('dark')}}catch(e){}})()`,
          }}
        />
      </head>
      <body>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  )
}
```

- [ ] **Step 3: Mapear as variáveis do Geist para os nomes do design system**

Adicione ao final de `src/app/globals.css`:

```css
@layer base {
  :root {
    --font-sans: var(--font-geist-sans);
    --font-mono: var(--font-geist-mono);
  }
}
```

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: fontes Bricolage Grotesque e Geist com layout raiz"
```

---

## Task 4: Provider de tema e toggle

**Files:**
- Create: `src/lib/theme.tsx`
- Create: `src/components/shell/ThemeToggle.tsx`
- Test: `src/lib/theme.test.ts`

- [ ] **Step 1: Escrever o teste que falha**

```ts
// src/lib/theme.test.ts
import { describe, it, expect } from "vitest"
import { proximoTema, TEMA_PADRAO } from "./theme"

describe("proximoTema", () => {
  it("o padrao do sistema e o tema claro", () => {
    expect(TEMA_PADRAO).toBe("light")
  })

  it("alterna de claro para escuro", () => {
    expect(proximoTema("light")).toBe("dark")
  })

  it("alterna de escuro para claro", () => {
    expect(proximoTema("dark")).toBe("light")
  })
})
```

- [ ] **Step 2: Rodar o teste e confirmar a falha**

Run: `npx vitest run src/lib/theme.test.ts`
Expected: FAIL — `Failed to resolve import "./theme"`.

- [ ] **Step 3: Criar `src/lib/theme.tsx`**

```tsx
"use client"

import { createContext, useContext, useEffect, useState, useCallback } from "react"

export type Tema = "light" | "dark"

/** Claro é o padrão: o hub é usado o dia inteiro em escritório. */
export const TEMA_PADRAO: Tema = "light"

const CHAVE = "inhaus-theme"

export function proximoTema(atual: Tema): Tema {
  return atual === "light" ? "dark" : "light"
}

type Ctx = { tema: Tema; alternar: () => void }

const TemaContext = createContext<Ctx>({ tema: TEMA_PADRAO, alternar: () => {} })

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [tema, setTema] = useState<Tema>(TEMA_PADRAO)

  useEffect(() => {
    const salvo = window.localStorage.getItem(CHAVE) as Tema | null
    if (salvo === "dark" || salvo === "light") setTema(salvo)
  }, [])

  const alternar = useCallback(() => {
    setTema((atual) => {
      const proximo = proximoTema(atual)
      window.localStorage.setItem(CHAVE, proximo)
      document.documentElement.classList.toggle("dark", proximo === "dark")
      return proximo
    })
  }, [])

  return <TemaContext.Provider value={{ tema, alternar }}>{children}</TemaContext.Provider>
}

export function useTema() {
  return useContext(TemaContext)
}
```

- [ ] **Step 4: Rodar o teste e confirmar que passa**

Run: `npx vitest run src/lib/theme.test.ts`
Expected: PASS — 3 testes.

- [ ] **Step 5: Criar `src/components/shell/ThemeToggle.tsx`**

```tsx
"use client"

import { Moon, Sun } from "lucide-react"
import { useTema } from "@/lib/theme"

export function ThemeToggle() {
  const { tema, alternar } = useTema()
  const escuro = tema === "dark"

  return (
    <button
      type="button"
      onClick={alternar}
      aria-label={escuro ? "Mudar para o tema claro" : "Mudar para o tema escuro"}
      className="relative grid h-9 w-9 place-items-center rounded-md text-white/55 transition-colors duration-[240ms] ease-calm hover:bg-white/5 hover:text-white"
    >
      {/* Morph: os dois ícones existem, a opacidade e a rotação fazem a troca. */}
      <Sun
        strokeWidth={1.5}
        className={`absolute h-[18px] w-[18px] transition-all duration-[320ms] ease-calm ${
          escuro ? "rotate-90 scale-50 opacity-0" : "rotate-0 scale-100 opacity-100"
        }`}
      />
      <Moon
        strokeWidth={1.5}
        className={`absolute h-[18px] w-[18px] transition-all duration-[320ms] ease-calm ${
          escuro ? "rotate-0 scale-100 opacity-100" : "-rotate-90 scale-50 opacity-0"
        }`}
      />
    </button>
  )
}
```

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: provider de tema com toggle sol/lua sem flash na hidratacao"
```

---

## Task 5: Registro de domínios

**Files:**
- Create: `src/lib/domains.ts`
- Test: `src/lib/domains.test.ts`

Este é o contrato mais importante do projeto: sidebar, command palette, Home e permissões leem daqui. Nenhuma outra lista de telas pode existir.

- [ ] **Step 1: Escrever o teste que falha**

```ts
// src/lib/domains.test.ts
import { describe, it, expect } from "vitest"
import { DOMINIOS, TODAS_AS_TELAS, buscarTelas, telasVisiveis } from "./domains"

describe("registro de dominios", () => {
  it("registra os cinco dominios da empresa", () => {
    expect(DOMINIOS.map((d) => d.key)).toEqual([
      "seguranca",
      "rh",
      "qualidade",
      "treinamentos",
      "financeiro",
    ])
  })

  it("nao tem chave de tela duplicada", () => {
    const chaves = TODAS_AS_TELAS.map((t) => t.key)
    expect(new Set(chaves).size).toBe(chaves.length)
  })

  it("toda tela habilitada tem href", () => {
    for (const tela of TODAS_AS_TELAS) {
      if (!tela.emBreve) expect(tela.href).toMatch(/^\//)
    }
  })
})

describe("buscarTelas", () => {
  it("encontra por termo do rotulo, ignorando acento e caixa", () => {
    const r = buscarTelas("visao")
    expect(r.length).toBeGreaterThan(0)
  })

  it("encontra por palavra-chave e nao so pelo rotulo", () => {
    const r = buscarTelas("vencimento")
    expect(r.some((t) => t.key === "matriz-competencias")).toBe(true)
  })

  it("devolve vazio para termo sem correspondencia", () => {
    expect(buscarTelas("xyzabc")).toEqual([])
  })
})

describe("telasVisiveis", () => {
  it("admin enxerga todas as telas habilitadas", () => {
    const r = telasVisiveis({ isAdmin: true, visibleScreens: [] })
    expect(r.length).toBe(TODAS_AS_TELAS.filter((t) => !t.emBreve).length)
  })

  it("usuario comum enxerga apenas o que foi concedido", () => {
    const r = telasVisiveis({ isAdmin: false, visibleScreens: ["matriz-competencias"] })
    expect(r.map((t) => t.key)).toEqual(["matriz-competencias"])
  })

  it("ignora chave concedida que nao existe mais", () => {
    const r = telasVisiveis({ isAdmin: false, visibleScreens: ["tela-fantasma"] })
    expect(r).toEqual([])
  })
})
```

- [ ] **Step 2: Rodar o teste e confirmar a falha**

Run: `npx vitest run src/lib/domains.test.ts`
Expected: FAIL — `Failed to resolve import "./domains"`.

- [ ] **Step 3: Criar `src/lib/domains.ts`**

```ts
import {
  ShieldCheck,
  Users,
  BadgeCheck,
  GraduationCap,
  Wallet,
  type LucideIcon,
} from "lucide-react"

export type Tela = {
  /** Chave estável, salva em AuthUser.visibleScreens. Nunca renomear. */
  key: string
  label: string
  href: string
  /** Termos extras para a busca da command palette. */
  palavrasChave?: string[]
  /** Tela ainda não construída: aparece desabilitada na sidebar. */
  emBreve?: boolean
}

export type Dominio = {
  key: string
  label: string
  icone: LucideIcon
  telas: Tela[]
}

export const DOMINIOS: Dominio[] = [
  {
    key: "seguranca",
    label: "Segurança",
    icone: ShieldCheck,
    telas: [
      { key: "seguranca-visao-geral", label: "Visão geral", href: "/seguranca", emBreve: true },
      {
        key: "taxa-frequencia",
        label: "Taxa de frequência",
        href: "/seguranca/taxa-frequencia",
        palavrasChave: ["acidente", "trir", "tf", "afastamento"],
        emBreve: true,
      },
    ],
  },
  {
    key: "rh",
    label: "RH",
    icone: Users,
    telas: [
      { key: "rh-visao-geral", label: "Visão geral", href: "/rh", emBreve: true },
      {
        key: "absenteismo",
        label: "Absenteísmo",
        href: "/rh/absenteismo",
        palavrasChave: ["falta", "presenca", "ponto"],
        emBreve: true,
      },
      {
        key: "turnover",
        label: "Turnover",
        href: "/rh/turnover",
        palavrasChave: ["desligamento", "rotatividade", "admissao"],
        emBreve: true,
      },
    ],
  },
  {
    key: "qualidade",
    label: "Qualidade",
    icone: BadgeCheck,
    telas: [
      { key: "qualidade-visao-geral", label: "Visão geral", href: "/qualidade", emBreve: true },
      {
        key: "nao-conformidades",
        label: "Não conformidades",
        href: "/qualidade/nao-conformidades",
        palavrasChave: ["nc", "auditoria", "retrabalho"],
        emBreve: true,
      },
    ],
  },
  {
    key: "treinamentos",
    label: "Treinamentos",
    icone: GraduationCap,
    telas: [
      { key: "treinamentos-visao-geral", label: "Visão geral", href: "/treinamentos", emBreve: true },
      {
        key: "matriz-competencias",
        label: "Matriz de competências",
        href: "/treinamentos/matriz",
        palavrasChave: ["vencimento", "validade", "apto", "nr", "certificacao"],
        emBreve: true,
      },
      {
        key: "horas-treinamento",
        label: "Horas de treinamento",
        href: "/treinamentos/horas",
        palavrasChave: ["hht", "carga horaria", "per capita"],
        emBreve: true,
      },
    ],
  },
  {
    key: "financeiro",
    label: "Financeiro",
    icone: Wallet,
    telas: [
      { key: "financeiro-visao-geral", label: "Visão geral", href: "/financeiro", emBreve: true },
      {
        key: "custo-pessoal",
        label: "Custo de pessoal",
        href: "/financeiro/custo-pessoal",
        palavrasChave: ["folha", "despesa", "orcamento"],
        emBreve: true,
      },
    ],
  },
]

export type TelaComDominio = Tela & { dominioKey: string; dominioLabel: string }

export const TODAS_AS_TELAS: TelaComDominio[] = DOMINIOS.flatMap((d) =>
  d.telas.map((t) => ({ ...t, dominioKey: d.key, dominioLabel: d.label })),
)

/** Remove acento e caixa para a busca não exigir digitação perfeita. */
function normalizar(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
}

export function buscarTelas(termo: string): TelaComDominio[] {
  const alvo = normalizar(termo)
  if (!alvo) return []
  return TODAS_AS_TELAS.filter((tela) => {
    const campos = [tela.label, tela.dominioLabel, ...(tela.palavrasChave ?? [])]
    return campos.some((campo) => normalizar(campo).includes(alvo))
  })
}

export type PermissaoUsuario = { isAdmin: boolean; visibleScreens: string[] }

/** Admin enxerga tudo; os demais, apenas o que foi concedido e ainda existe. */
export function telasVisiveis(usuario: PermissaoUsuario): TelaComDominio[] {
  const habilitadas = TODAS_AS_TELAS.filter((t) => !t.emBreve)
  if (usuario.isAdmin) return habilitadas
  const concedidas = new Set(usuario.visibleScreens)
  return habilitadas.filter((t) => concedidas.has(t.key))
}
```

- [ ] **Step 4: Rodar o teste**

Run: `npx vitest run src/lib/domains.test.ts`
Expected: os testes de `buscarTelas` e `telasVisiveis` que dependem de telas habilitadas vão falhar, porque nesta etapa **todas** as telas estão marcadas `emBreve`. Isso é esperado.

- [ ] **Step 5: Habilitar a única tela que existe nesta entrega**

Nesta entrega só a Home existe. Adicione ao topo de `DOMINIOS`, como tela sem domínio, um registro dedicado — e corrija os testes para refletir a realidade. Substitua em `src/lib/domains.ts`, logo após a definição de `TODAS_AS_TELAS`:

```ts
/** A Home não pertence a domínio nenhum: é o painel de entrada. */
export const TELA_HOME: TelaComDominio = {
  key: "home",
  label: "Visão geral",
  href: "/home",
  palavrasChave: ["inicio", "pulso", "mission control"],
  dominioKey: "geral",
  dominioLabel: "Geral",
}
```

E ajuste `TODAS_AS_TELAS` para incluí-la:

```ts
export const TODAS_AS_TELAS: TelaComDominio[] = [
  TELA_HOME,
  ...DOMINIOS.flatMap((d) => d.telas.map((t) => ({ ...t, dominioKey: d.key, dominioLabel: d.label }))),
]
```

Atenção à ordem de declaração: `TELA_HOME` precisa ser declarada **antes** de `TODAS_AS_TELAS`.

Ajuste também o teste `"encontra por termo do rotulo"` para buscar `"visao"` (que agora casa com a Home e com as visões gerais) e o teste `"encontra por palavra-chave"` para aceitar `emBreve`, trocando a asserção por:

```ts
  it("encontra por palavra-chave e nao so pelo rotulo", () => {
    const r = buscarTelas("vencimento")
    expect(r.some((t) => t.key === "matriz-competencias")).toBe(true)
  })
```

(esse teste já passa, porque `buscarTelas` não filtra por `emBreve` — a palette mostra telas futuras como desabilitadas.)

E o teste de admin:

```ts
  it("admin enxerga todas as telas habilitadas", () => {
    const r = telasVisiveis({ isAdmin: true, visibleScreens: [] })
    expect(r.map((t) => t.key)).toEqual(["home"])
  })
```

E o de usuário comum:

```ts
  it("usuario comum enxerga apenas o que foi concedido", () => {
    const r = telasVisiveis({ isAdmin: false, visibleScreens: ["home"] })
    expect(r.map((t) => t.key)).toEqual(["home"])
  })
```

- [ ] **Step 6: Rodar os testes e confirmar que passam**

Run: `npx vitest run src/lib/domains.test.ts`
Expected: PASS — todos os testes.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: registro unico dos dominios com busca e controle de visibilidade"
```

---
## Nota sobre o formato das tasks a seguir

As Tasks 1–5 são fundação e o orquestrador as executa diretamente (são o contrato que
todos consomem). As Tasks 6–14 são **briefings de agente**: cada uma define os arquivos,
o contrato de props, os tokens obrigatórios e o critério de pronto. O agente Sonnet
escreve o código; o orquestrador revisa antes de aceitar. Esse é o modelo de execução
definido no `CLAUDE.md`.

**Regras válidas para toda task 6–14, sem exceção:**

- Nenhum valor hexadecimal em componente. Só tokens: `bg-navy`, `bg-navy-deep`, `bg-mist`,
  `text-teal`, `bg-card`, `text-muted-foreground`, `border-hairline`, `bg-success/warn/danger`.
- Easing sempre `ease-calm`; durações entre `240ms` e `320ms`, salvo onde a task disser outro valor.
- `prefers-reduced-motion` já é tratado globalmente no `globals.css`. Não reimplementar,
  mas **não** depender só disso quando a animação for JS: nesse caso checar
  `window.matchMedia("(prefers-reduced-motion: reduce)").matches` e pular a animação.
- Server Component por padrão. `"use client"` só onde a task mandar.
- Todo texto em português do Brasil.
- Todo elemento interativo precisa de `aria-label` ou texto acessível, e foco visível.
- Ao terminar: rodar `npx tsc --noEmit` e `npm run build`. Ambos devem passar limpos.

---

## Task 6: Logo In-Haus como componente

**Files:**
- Create: `src/components/brand/InhausLogo.tsx`
- Fonte: `logo_inhaus_branca.svg` e `logo_inhaus_escura.svg` na raiz do projeto

**Contrato:**

```tsx
type InhausLogoProps = {
  /** "branca" para uso sobre navy; "escura" para uso sobre mist. */
  variante?: "branca" | "escura"
  /** Altura em pixels. A largura é proporcional (viewBox 317×125). */
  altura?: number
  /** Quando true, os paths recebem stroke-dasharray/offset para o traçado da abertura. */
  tracejar?: boolean
  className?: string
}

export function InhausLogo(props: InhausLogoProps): JSX.Element
```

**Detalhes:**
- Converter o conteúdo dos SVGs em JSX inline. Não usar `<img>` nem `next/image` — a
  abertura animada precisa dos paths acessíveis no DOM.
- O símbolo (o path com `fill="#027193"`) recebe `fill="currentColor"` e a cor vem de
  `text-teal`. Os paths do wordmark recebem `fill="currentColor"` herdando `text-white`
  ou `text-navy` conforme a variante.
- Agrupar em dois `<g>`: `data-parte="simbolo"` e `data-parte="wordmark"`. A abertura
  depende disso para animar em duas etapas.
- Quando `tracejar` for true, aplicar `stroke="currentColor" strokeWidth={0.8} fill="none"`
  e a classe que a Task 8 vai controlar.
- Acessibilidade: `role="img"` + `<title>In-Haus</title>`.

**Pronto quando:** a logo renderiza nas duas variantes, em qualquer altura, sem distorção,
e `npx tsc --noEmit` passa.

**Commit:** `feat: logo In-Haus como componente React com paths acessiveis`

---

## Task 7: Camadas de atmosfera em CSS/SVG

**Files:**
- Create: `src/components/atmosphere/DepthGradient.tsx`
- Create: `src/components/atmosphere/DataMesh.tsx`
- Create: `src/components/atmosphere/Aurora.tsx`
- Create: `src/components/atmosphere/Atmosphere.tsx`

Estes quatro são **Server Components** — não têm estado, são só marcação e CSS.

**Contrato:**

```tsx
export type Intensidade = "cheia" | "media" | "sutil" | "homeopatica"

type AtmosphereProps = {
  intensidade: Intensidade
  /** No tema claro sobre canvas mist, só a aurora entra (intensidade "homeopatica"). */
  className?: string
}

export function Atmosphere({ intensidade, className }: AtmosphereProps): JSX.Element
```

Mapa de intensidade → camadas e opacidades:

| Intensidade | Gradiente | Malha | Aurora | Onde é usada |
|---|---|---|---|---|
| `cheia` | 100% | 100% | 100% | fallback do login sem WebGL |
| `media` | 100% | 60% | 80% | faixa de cabeçalho da Home |
| `sutil` | 100% | 30% | 0% | sidebar |
| `homeopatica` | 0% | 0% | 3% | canvas de conteúdo no tema claro |

**DepthGradient:** uma `<div>` absoluta com
`background: radial-gradient(120% 100% at 30% 20%, hsl(var(--navy)) 0%, hsl(var(--navy-deep)) 100%)`.
Escrito em `style` inline porque é gradiente de token, não cor de componente — esta é a
única exceção permitida à regra do hexadecimal, e mesmo assim usando `var(--navy)`.

**DataMesh:** SVG com `<pattern>` de linhas de `white/4%` a cada 32px nos dois eixos, e
uma segunda camada com ~40 `<circle>` de raio 1.2 nas interseções. Cerca de 12 desses
círculos recebem `className="animate-[mesh-pulse_var(--dur)_ease-in-out_infinite]"` com
`--dur` variando entre `6s` e `10s` e `animation-delay` variando entre `0s` e `8s`,
definidos inline por índice. Nada de `Math.random()` — use uma tabela fixa de valores
para o render do servidor bater com o do cliente.

**Aurora:** duas `<div>` com `border-radius: 50%`, `filter: blur(80px)`, uma em
`hsl(var(--teal) / 0.08)` e outra em `hsl(var(--teal-bright) / 0.06)`, ambas com
`animate-drift` e `animation-delay` diferentes (`0s` e `-18s`).

Todas as camadas: `position: absolute; inset: 0; pointer-events: none;` e o contêiner
`Atmosphere` recebe `overflow-hidden` e `aria-hidden="true"`.

**Pronto quando:** uma página de teste com `<div className="relative h-96 bg-navy"><Atmosphere intensidade="cheia" /></div>`
mostra as três camadas, a malha pulsa devagar, a aurora deriva, e não há erro de
hidratação no console.

**Commit:** `feat: camadas de atmosfera em CSS e SVG`

---

## Task 8: Abertura animada da logo

**Files:**
- Create: `src/components/brand/BootSequence.tsx`

`"use client"`.

**Contrato:**

```tsx
type BootSequenceProps = {
  /** Chave da sessão. Default: "inhaus-boot". */
  chaveSessao?: string
}

export function BootSequence({ chaveSessao }: BootSequenceProps): JSX.Element | null
```

**Comportamento obrigatório:**

1. No mount, ler `sessionStorage.getItem(chaveSessao)`. Se existir, retornar `null`
   imediatamente — a abertura roda **uma vez por sessão**.
2. Renderizar um overlay `fixed inset-0 z-50 bg-navy-deep` **por cima** da página já
   renderizada. A página por baixo não pode ser bloqueada nem re-montada.
3. Linha do tempo, com `setTimeout` encadeado ou Web Animations API:
   - `0–400ms`: `<Atmosphere intensidade="cheia" />` entra; a malha faz fade-in do centro
     para fora (use `mask-image: radial-gradient(...)` animando o raio).
   - `400–1200ms`: `<InhausLogo tracejar />` com `stroke-dasharray` igual ao comprimento
     do path e `stroke-dashoffset` indo de 100% a 0. Símbolo primeiro (`0–500ms`),
     wordmark depois (`300–800ms`, sobreposto). Ao fim, `fill` entra por transição de
     opacidade e o `stroke` some.
   - `1200–1700ms`: um `<div>` circular teal com `blur` escala de `0` a `3` e opacidade
     de `0.5` a `0`, irradiando da logo.
   - `1700–2200ms`: o overlay faz fade-out (`opacity 1 → 0`, `400ms`, `ease-calm`) e a
     logo simultaneamente faz `scale(0.42)` e `translate` até a posição alvo.
4. **Pular:** listener de `click`, `keydown` e `touchstart` no `window` que encerra a
   sequência imediatamente (`opacity 0` em `150ms`) e grava a flag de sessão.
5. **Reduced motion:** se `window.matchMedia("(prefers-reduced-motion: reduce)").matches`,
   pular toda a linha do tempo — mostrar a logo com fade de `300ms` e sair.
6. Ao terminar, gravar `sessionStorage.setItem(chaveSessao, "1")` e desmontar o overlay.
7. O overlay tem `aria-hidden="true"` e não recebe foco. O `<main>` por baixo continua
   navegável por teclado durante a animação.

**Posição alvo do passo 4:** receber por prop opcional `alvo?: { x: number; y: number; escala: number }`.
Na tela de login, o alvo é a posição da logo no painel esquerdo. Se `alvo` não vier,
apenas fazer fade-out sem deslocamento.

**Pronto quando:** ao abrir `/login` a sequência roda uma vez; recarregar a página na
mesma aba não repete; abrir aba anônima repete; clicar durante a animação pula; com
`prefers-reduced-motion` ativo só há fade; e o Lighthouse não acusa o overlay como LCP.

**Commit:** `feat: abertura animada da logo com salvaguardas de sessao e acessibilidade`

---

## Task 9: Canvas WebGL do login

**Files:**
- Create: `src/components/atmosphere/LoginCanvas.tsx`

`"use client"`. Carregado com `next/dynamic` e `ssr: false` pela página de login.

**Contrato:**

```tsx
export function LoginCanvas({ className }: { className?: string }): JSX.Element
```

**Comportamento:**
- Usar `ogl` (`Renderer`, `Camera`, `Transform`, `Program`, `Mesh`, `Geometry`).
- Cena: um plano em tela cheia com um fragment shader que compõe as três camadas —
  gradiente radial de profundidade, malha de pontos e dois blobs de aurora derivando com
  `uTime`.
- Uniform `uMouse` atualizado no `pointermove`, com **lerp de 0.06 por frame** para o
  retorno amortecido. Os pontos da malha dentro de um raio de ~0.18 (espaço normalizado)
  ganham brilho e deslocam-se poucos pixels na direção oposta ao cursor.
- Cores passadas como uniforms lidos dos tokens via `getComputedStyle(document.documentElement).getPropertyValue("--navy")`,
  convertidos de HSL para RGB. **Não** hardcodar cor no shader.
- `devicePixelRatio` limitado a 2. `resize` com `ResizeObserver`.
- `cancelAnimationFrame` e `gl.getExtension("WEBGL_lose_context")?.loseContext()` no cleanup.
- Pausar o loop quando `document.hidden` for true.

**Fallback obrigatório:** antes de instanciar, tentar `canvas.getContext("webgl2") || canvas.getContext("webgl")`.
Se falhar, ou se `prefers-reduced-motion` estiver ativo, renderizar
`<Atmosphere intensidade="cheia" />` no lugar, sem quebra visual.

**Pronto quando:** o canvas roda a 60fps num notebook comum, reage ao mouse com
amortecimento, some sem vazar contexto ao navegar para fora, e o fallback aparece quando
o WebGL é desabilitado no navegador.

**Commit:** `feat: canvas WebGL reativo do login com fallback em CSS`

---

## Task 10: Camada de autenticação portada

**Files:**
- Create: `src/lib/global-auth.ts`, `src/lib/auth-session.ts`, `src/lib/db-inhaus.ts`, `src/lib/prisma.ts`
- Create: `middleware.ts`
- Create: `prisma/schema.prisma`
- Create: `src/app/api/auth/login/route.ts`, `logout/route.ts`, `refresh/route.ts`, `session/route.ts`
- Create: `src/app/api/auth/2fa/verify/route.ts`

**Origem:** copiar de `C:/Users/fernando.c.souza/Projetos/hub_amyris` os arquivos de mesmo
nome, **sem nenhuma alteração de lógica**. São infraestrutura sem opinião visual.

**Ajustes permitidos e obrigatórios:**
- Trocar toda menção a "amyris" por "inhaus" em nomes de cookie, chaves de cache e comentários.
- No `prisma/schema.prisma`, manter o modelo `AuthUser` idêntico (incluindo
  `visibleScreens`, `isAdmin`, `hasAccess`, `authUserId`).
- Onde o `hub_amyris` importa `@/lib/screens`, importar `@/lib/domains` e usar
  `TODAS_AS_TELAS` / `telasVisiveis`.

**Não copiar:** nenhum componente de `src/components`, nenhum estilo, nenhuma página.

**Pronto quando:** `npx prisma generate` roda, `npx tsc --noEmit` passa, e
`GET /api/auth/session` responde 401 sem cookie.

**Commit:** `feat: camada de autenticacao portada do hub_amyris`

---

## Task 11: Tela de login

**Files:**
- Create: `src/app/(auth)/login/page.tsx` (Server Component)
- Create: `src/components/auth/LoginForm.tsx` (`"use client"`)
- Create: `src/components/ui/button.tsx`, `src/components/ui/input.tsx` (shadcn, tokens do projeto)

**Layout (desktop, ≥1024px):** `grid grid-cols-[58fr_42fr] h-dvh`.

**Painel esquerdo — `bg-navy relative overflow-hidden`:**
- `<LoginCanvas />` em `absolute inset-0`, carregado por `next/dynamic` com `ssr: false`.
- Conteúdo em `absolute` ancorado ao terço inferior esquerdo, com `padding: 64px`:
  - `<InhausLogo variante="branca" altura={40} />`
  - `<h1 className="font-display text-display-md text-white mt-10 max-w-[13ch]">Todos os indicadores da In-Haus. Um só lugar.</h1>`
  - `<p className="font-sans text-[15px] text-white/60 mt-4 max-w-[38ch]">` com uma linha
    sobre centralizar segurança, RH, qualidade, treinamentos e financeiro.
- Rodapé absoluto: data por extenso em pt-BR (`toLocaleDateString("pt-BR", { dateStyle: "full" })`,
  gerada no Server Component e passada como prop para evitar divergência de hidratação) e,
  à direita, um ponto teal de 6px com `animate-breathe` seguido de "sistema operacional"
  em `text-label uppercase text-white/45`.

**Painel direito — `bg-mist grid place-items-center px-16`:**
- `<LoginForm />` com `w-full max-w-[380px]`, alinhado à esquerda.
- Título `font-display text-display-sm text-foreground`: "Entrar".
- Subtítulo em `text-muted-foreground text-sm`.
- **Campos com label flutuante**: `<input>` com `peer` e `placeholder=" "`; a `<label>`
  começa em `top-1/2` e vai para `top-0 text-label text-teal` quando
  `peer-focus` ou `peer-[:not(:placeholder-shown)]`. Transição `240ms ease-calm`.
- **Underline**: uma `<span>` absoluta de `h-[1.5px] w-full bg-hairline` e, sobre ela,
  outra `bg-teal origin-left scale-x-0 peer-focus:scale-x-100 transition-transform duration-[240ms] ease-calm`.
- Botão primário: `h-12 w-full rounded-md bg-teal text-white font-medium hover:bg-teal-bright
  transition-colors duration-[240ms] ease-calm disabled:opacity-60`. No estado de carregando,
  substituir o texto por três pontos de 4px com `animate-breathe` e `animation-delay`
  escalonado em `0ms/120ms/240ms`.
- **Erro**: `<p role="alert">` acima do botão, `text-danger text-sm`, com uma animação
  `shake` de `6px` em `200ms` (definir o keyframe `shake` no `tailwind.config.ts`).
  Mensagem genérica — nunca revelar se o e-mail existe.
- **2FA inline**: quando a API responder que exige segundo fator, **não navegar**. Trocar o
  conteúdo do mesmo contêiner por 6 `<input inputMode="numeric" maxLength={1}>` com avanço
  automático de foco e colagem do código inteiro. A troca é um `translate-x` de `-16px`
  com fade, `280ms ease-calm`, e o contêiner mantém a mesma altura (fixar `min-height`).

**Mobile (<1024px):** `grid-cols-1`. O painel esquerdo vira `fixed inset-0` com
`<Atmosphere intensidade="cheia" />` (CSS, nunca WebGL no mobile). A logo fica no topo,
com `padding-top: 56px`. O formulário vira uma folha: `fixed bottom-0 inset-x-0 h-[62dvh]
bg-mist rounded-t-[24px] px-6 pt-8 overflow-y-auto`. Isso é layout próprio, não o desktop
comprimido.

**Pronto quando:** o login renderiza nos dois breakpoints, o foco percorre e-mail → senha →
botão com anel teal visível, o erro dispara o shake, o 2FA troca sem navegar, e o
Lighthouse na rota marca LCP < 2s.

**Commit:** `feat: tela de login com split cinematografico e formulario sem caixa`

---

## Task 12: Shell da aplicação

**Files:**
- Create: `src/app/(app)/layout.tsx` (Server Component)
- Create: `src/components/shell/AppSidebar.tsx` (`"use client"` — precisa de estado de colapso e rota ativa)
- Create: `src/components/shell/AppTopbar.tsx` (`"use client"`)
- Create: `src/components/shell/CommandPalette.tsx` (`"use client"`)

**Layout raiz do grupo `(app)`:** `grid grid-cols-[auto_1fr] h-dvh` — sidebar e a coluna
que contém topbar + `<main>`.

**AppSidebar — `w-[264px] bg-shell relative overflow-hidden shrink-0`:**
- `<Atmosphere intensidade="sutil" />` ao fundo.
- Topo: `<InhausLogo variante="branca" altura={26} />` com `p-7`.
- Navegação: `<nav aria-label="Domínios">`. Para cada domínio de `DOMINIOS`:
  botão do grupo com `<d.icone strokeWidth={1.5} className="h-[18px] w-[18px]" />` e o
  label em `font-sans text-sm`. As telas do domínio em `<ul>` abaixo, com `text-[13px]`.
- **Item ativo:** `relative` com `before:absolute before:left-0 before:top-1/2
  before:-translate-y-1/2 before:h-5 before:w-[2px] before:bg-teal`, mais
  `text-white bg-white/[0.04]`. **Nunca** fundo colorido cheio.
- **Inativo:** `text-white/55 hover:text-white hover:bg-white/[0.03]`, `160ms ease-calm`.
- **Em breve:** `text-white/30 cursor-default` + `<span className="text-label
  rounded-sm border border-white/15 px-1.5 py-0.5">em breve</span>`, e `aria-disabled="true"`.
- **Colapso:** botão que alterna para `w-[72px]` (só ícones, labels com `sr-only`),
  estado em `localStorage` sob `inhaus-sidebar`. Transição de largura `280ms ease-calm`.
- Rodapé: avatar (iniciais do nome num círculo `bg-white/10`), nome, `<ThemeToggle />`,
  e a dica `⌘K` num `<kbd className="rounded border border-white/15 px-1.5 text-label text-white/45">`.

**AppTopbar — `h-16 bg-shell flex items-center gap-6 px-8`:** sem borda entre ela e a
sidebar — o shell é uma peça só. Contém breadcrumb (`text-white/55`, separador `/`),
o gatilho de busca (um `<button>` que abre a palette, com `text-white/45`, ícone de lupa
e o `⌘K` à direita), um seletor de período e o ícone de alertas com contador.

**CommandPalette:** Radix `Dialog`. Scrim `bg-navy/40 backdrop-blur-[2px]`. Painel
`max-w-[560px] bg-card rounded-lg border border-hairline`, entrada
`data-[state=open]:animate-[rise-in_220ms]` combinada com `scale-[0.98] → scale-100`.
- Abre com `⌘K` / `Ctrl+K` (listener global) e pelo botão da topbar.
- Input sem borda, `font-sans text-[15px]`, foco automático.
- Resultados vindos de `buscarTelas(termo)`, **agrupados por `dominioLabel`**.
- Telas `emBreve` aparecem com o mesmo selo e não navegam.
- Navegação por `↑ ↓`, seleção com `Enter`, fecha com `Esc`. Item destacado com
  `bg-muted` e barra teal à esquerda.
- Seção "Ações": alternar tema, ir para a Home.
- Operável de ponta a ponta só com teclado. `role="listbox"` / `role="option"` corretos.

**Canvas de conteúdo:** `<main className="relative overflow-y-auto bg-background">` com
`<Atmosphere intensidade="homeopatica" />` e um `<div className="relative mx-auto
max-w-[1440px] px-10 py-10">` para o conteúdo. Nunca 100% de largura.

**Pronto quando:** a sidebar marca a rota ativa corretamente, colapsa e lembra o estado,
`⌘K` abre e fecha a palette, a busca por "vencimento" encontra a matriz de competências,
e todo o shell é percorrível por teclado com foco visível.

**Commit:** `feat: shell com sidebar por dominio, topbar continua e command palette`

---

## Task 13: Componentes de KPI e mocks

**Files:**
- Create: `src/components/kpi/MetricValue.tsx` (`"use client"`)
- Create: `src/components/kpi/TrendBadge.tsx` (Server Component)
- Create: `src/components/kpi/Sparkline.tsx` (Server Component)
- Create: `src/components/kpi/KpiCard.tsx` (Server Component)
- Create: `src/mocks/home-mock.ts`
- Create: `src/lib/format.ts`
- Test: `src/lib/format.test.ts`

**`src/lib/format.ts` — com teste Vitest antes da implementação:**

```ts
export function formatarNumero(valor: number, casas?: number): string
export function formatarPercentual(valor: number, casas?: number): string
export function formatarVariacao(valor: number): string  // "+3,2%" / "−1,8%" com sinal de menos tipográfico
```

Testes obrigatórios: separador decimal vírgula, separador de milhar ponto,
`formatarVariacao(0)` devolve `"0,0%"` sem sinal, e negativo usa `−` (U+2212), não hífen.

**`MetricValue`:** recebe `valor: number`, `sufixo?: string`, `casas?: number`.
Renderiza em `font-mono text-metric tabular` com `data-metric`. Conta de 0 até o valor em
`900ms` com `easeOutCubic` via `requestAnimationFrame`, **apenas na primeira montagem** —
guardar um `useRef` para não recontar em re-render. Com reduced motion, mostra o valor final direto.

**`TrendBadge`:** recebe `variacao: number` e `sentidoBom: "cima" | "baixo"`. Escolhe
`text-success` ou `text-danger` conforme a variação seja favorável **segundo o indicador**
(turnover subindo é ruim; treinamento subindo é bom). Ícone `ArrowUpRight`/`ArrowDownRight`
de `14px`, `strokeWidth={2}`. Variação zero é neutra: `text-muted-foreground`, sem seta.

**`Sparkline`:** recebe `pontos: number[]` (12 valores). SVG `viewBox="0 0 120 32"`,
`preserveAspectRatio="none"`, path suavizado por curva de Catmull-Rom convertida em
cúbicas. `stroke="hsl(var(--teal))"`, `strokeWidth={1.5}`, `fill="none"`, mais uma área
com gradiente teal de 12% a 0%. Animação de desenho por `stroke-dasharray` em `800ms`,
uma única vez. `aria-hidden="true"` — o número já é acessível.

**`KpiCard`:** `bg-card rounded-lg border border-hairline p-6 relative overflow-hidden
transition-colors duration-[160ms] ease-calm hover:border-teal/30`. **Sem atmosfera,
sem gradiente, sem sombra colorida** — é superfície de dado. Estrutura: domínio em
`text-label uppercase text-muted-foreground`; `<MetricValue>`; `<TrendBadge>` ao lado;
`<Sparkline>` colado na base com `-mx-6 -mb-6`; e um "ver painel →" em `text-teal text-sm`
que entra com `translate-x-2 opacity-0 group-hover:translate-x-0 group-hover:opacity-100`.

**`src/mocks/home-mock.ts`:** tipos exportados e dados fictícios plausíveis para os cinco
domínios (KPI-chave, unidade, variação, sentido bom, 12 pontos de série) mais uma lista de
alertas com `severidade: "critico" | "atencao" | "ok"`. Valores fixos, sem `Math.random()`.
Comentário no topo deixando explícito que são dados fictícios e onde serão trocados.

**Pronto quando:** `npx vitest run src/lib/format.test.ts` passa, os KPIs contam uma vez só,
os sparklines desenham, e o hover do card não desloca nada.

**Commit:** `feat: componentes de KPI e dados mockados da home`

---

## Task 14: Home mission control e estados

**Files:**
- Create: `src/app/(app)/home/page.tsx`
- Create: `src/components/home/CabecalhoVivo.tsx`
- Create: `src/components/home/ListaAlertas.tsx`
- Create: `src/components/states/EmptyState.tsx`
- Create: `src/app/(app)/error.tsx`, `src/app/not-found.tsx`, `src/app/(app)/403/page.tsx`

**Faixa 1 — `CabecalhoVivo`:** `relative -mx-10 -mt-10 px-10 pt-14 pb-16 overflow-hidden`
com `<Atmosphere intensidade="media" />` e uma máscara
`mask-image: linear-gradient(to bottom, black 55%, transparent)` para desvanecer no canvas.
Saudação `font-display text-display-md` com o primeiro nome, e ao lado, em
`text-muted-foreground text-sm`, uma frase de estado da operação. **Sem card.**

**Faixa 2 — O pulso:** `grid gap-5 [grid-template-columns:repeat(auto-fit,minmax(248px,1fr))]`
com um `<KpiCard>` por domínio, dentro de `.stagger` para a entrada escalonada de 60ms.

**Faixa 3 — `ListaAlertas`:** `<ul>` com `divide-y divide-hairline`. Cada `<li>`:
`grid grid-cols-[4px_1fr_auto] items-center gap-4 py-4`, com a barra semântica à esquerda
(`bg-danger` / `bg-warn` / `bg-success`, `h-8 rounded-full`), descrição em
`font-sans text-sm text-foreground`, contexto em `text-muted-foreground text-[13px]`, e a
ação à direita em `text-teal text-sm`. Ordenada por severidade. **Linha, não card.**

**`EmptyState`:** recebe `titulo`, `descricao` e `acao?`. Ilustração em SVG gerado — um
recorte da malha de dados desvanecendo, `120×80`, `stroke-white/10` no escuro e
`stroke-navy/10` no claro. Nada de "nenhum resultado": o texto é um estado de calma
deliberado, por exemplo "Nada exige sua atenção agora." **Sem fotografia, sem ilustração
de banco.**

**Faixa 4 — Acesso rápido:** chips `rounded-md border border-hairline bg-card px-3 py-1.5
text-[13px] hover:border-teal/30`.

**`error.tsx` / `not-found.tsx` / `403`:** todos usam `EmptyState` com o mesmo tom.
O 403 explica a quem pedir acesso. Nunca exibir stack trace.

**Pronto quando:** a Home renderiza as quatro faixas com respiro entre elas, o contraste
entre a faixa 1 (com atmosfera) e a faixa 2 (cards planos) é visível, os alertas ordenam
por severidade, e remover os alertas do mock mostra o empty state desenhado.

**Commit:** `feat: home mission control com estados vazios e de erro desenhados`

---

## Task 15: Verificação final

Esta task é do orquestrador, não de agente.

- [ ] **Contraste AA** — auditar os pares: branco sobre `navy`, `white/55` sobre `navy`,
  `foreground` sobre `mist`, `muted-foreground` sobre `mist`, `muted-foreground` sobre
  `card` no escuro, `teal` sobre `mist`, `teal` sobre `card`. Corrigir o que ficar abaixo
  de 4.5:1 (3:1 para texto ≥ 24px).
- [ ] **Teclado** — percorrer login, shell, palette e Home só com `Tab`/setas. Foco sempre
  visível. Palette operável de ponta a ponta.
- [ ] **Reduced motion** — ativar no SO e confirmar: sem contagem de KPI, sem desenho de
  sparkline, sem traçado da logo, sem deriva da aurora.
- [ ] **Responsivo** — 375px, 768px, 1280px, 1920px. Confirmar que o login mobile usa a
  folha ancorada na base, não o desktop espremido.
- [ ] **Performance** — `npm run build` e Lighthouse em `/login` e `/home`. Meta: LCP < 2s.
- [ ] **Abertura** — roda uma vez por sessão, pula ao clicar, não repete ao navegar.
- [ ] **Checklist $10K** — percorrer os 8 itens do spec e confirmar cada um.
- [ ] Commit final: `chore: verificacao de acessibilidade, performance e responsividade`
