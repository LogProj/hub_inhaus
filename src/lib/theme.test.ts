import { describe, expect, it } from "vitest"
import { proximoTema, TEMA_PADRAO } from "./theme"

describe("tema", () => {
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
