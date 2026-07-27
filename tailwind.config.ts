import type { Config } from "tailwindcss"

/**
 * Mapeia os tokens de `src/styles/tokens.css` para utilitários.
 * Componente nenhum pode usar hexadecimal solto — sempre estas classes.
 */
const config: Config = {
  darkMode: ["class"],
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        navy: {
          DEFAULT: "hsl(var(--navy) / <alpha-value>)",
          deep: "hsl(var(--navy-deep) / <alpha-value>)",
        },
        mist: "hsl(var(--mist) / <alpha-value>)",
        teal: {
          DEFAULT: "hsl(var(--teal) / <alpha-value>)",
          bright: "hsl(var(--teal-bright) / <alpha-value>)",
        },
        success: "hsl(var(--success) / <alpha-value>)",
        warn: "hsl(var(--warn) / <alpha-value>)",
        danger: "hsl(var(--danger) / <alpha-value>)",
        background: "hsl(var(--background) / <alpha-value>)",
        foreground: "hsl(var(--foreground) / <alpha-value>)",
        card: {
          DEFAULT: "hsl(var(--card) / <alpha-value>)",
          foreground: "hsl(var(--card-foreground) / <alpha-value>)",
        },
        muted: {
          DEFAULT: "hsl(var(--muted) / <alpha-value>)",
          foreground: "hsl(var(--muted-foreground) / <alpha-value>)",
        },
        shell: {
          DEFAULT: "hsl(var(--shell) / <alpha-value>)",
          foreground: "hsl(var(--shell-foreground) / <alpha-value>)",
        },
        ring: "hsl(var(--ring) / <alpha-value>)",
        hairline: "hsl(var(--hairline) / var(--hairline-opacity))",
      },
      fontFamily: {
        display: ["var(--font-display)", "ui-sans-serif", "sans-serif"],
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      fontSize: {
        // Escala de razão 1.25, fluida.
        label: ["0.75rem", { lineHeight: "1rem", letterSpacing: "0.04em" }],
        metric: [
          "clamp(1.75rem, 2.4vw, 2.25rem)",
          { lineHeight: "1.05", letterSpacing: "-0.02em" },
        ],
        "display-sm": [
          "clamp(1.5rem, 2vw, 1.75rem)",
          { lineHeight: "1.15", letterSpacing: "-0.02em" },
        ],
        "display-md": [
          "clamp(2rem, 3.2vw, 2.5rem)",
          { lineHeight: "1.1", letterSpacing: "-0.03em" },
        ],
        "display-lg": [
          "clamp(2.5rem, 4.5vw, 3.5rem)",
          { lineHeight: "1.05", letterSpacing: "-0.04em" },
        ],
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      boxShadow: {
        // A elevação vem de contraste de superfície, não de blur.
        hairline: "0 1px 2px hsl(var(--navy) / 0.04)",
        lift: "0 2px 8px hsl(var(--navy) / 0.06)",
      },
      transitionTimingFunction: {
        calm: "cubic-bezier(0.22, 1, 0.36, 1)",
      },
      keyframes: {
        "rise-in": {
          from: { opacity: "0", transform: "translateY(8px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        drift: {
          "0%, 100%": { transform: "translate3d(0, 0, 0) scale(1)" },
          "50%": { transform: "translate3d(6%, -4%, 0) scale(1.12)" },
        },
        "mesh-pulse": {
          "0%, 100%": { opacity: "0.15" },
          "50%": { opacity: "0.75" },
        },
        breathe: {
          "0%, 100%": { opacity: "0.35" },
          "50%": { opacity: "1" },
        },
        shimmer: {
          "100%": { transform: "translateX(100%)" },
        },
        shake: {
          "0%, 100%": { transform: "translateX(0)" },
          "25%": { transform: "translateX(-6px)" },
          "75%": { transform: "translateX(6px)" },
        },
      },
      animation: {
        "rise-in": "rise-in 320ms cubic-bezier(0.22, 1, 0.36, 1) both",
        drift: "drift 40s ease-in-out infinite",
        breathe: "breathe 2.4s ease-in-out infinite",
        shake: "shake 200ms ease-in-out 1",
      },
    },
  },
  plugins: [],
}

export default config
