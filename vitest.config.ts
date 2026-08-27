import { defineConfig } from "vitest/config"
import { fileURLToPath } from "node:url"

// Resolve o alias "@/..." (igual ao tsconfig paths) para o vitest, já que
// alguns módulos testados importam por "@/lib/...".
export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
})
