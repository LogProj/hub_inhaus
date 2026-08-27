import { describe, it, expect } from "vitest"
import { classificar, getMaxAllowedDate } from "./absenteismo"

describe("classificar", () => {
  it("hora de entrada = presente", () => {
    expect(classificar("08:04", null, null)).toBe("presente")
  })
  it("FALTA = falta", () => {
    expect(classificar("FALTA", null, null)).toBe("falta")
  })
  it("h_contratual FOLGA = folga", () => {
    expect(classificar(null, "FOLGA", null)).toBe("folga")
  })
  it("motivo FÉRIAS = ferias", () => {
    expect(classificar(null, null, "FÉRIAS")).toBe("ferias")
  })
})

describe("getMaxAllowedDate", () => {
  it("retorna YYYY-MM-DD", () => {
    expect(getMaxAllowedDate()).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })
})
