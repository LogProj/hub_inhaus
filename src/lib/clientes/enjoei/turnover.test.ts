import { describe, it, expect } from "vitest"
import { faixaTempoCasa, calcTaxaTurnover } from "./turnover"

describe("faixaTempoCasa", () => {
  it("classifica menos de 3 meses", () => {
    expect(faixaTempoCasa("2026-06-15", "2026-08-01")).toBe("< 3 meses")
  })
  it("classifica 2+ anos", () => {
    expect(faixaTempoCasa("2023-01-01", "2026-08-01")).toBe("2+ anos")
  })
})

describe("calcTaxaTurnover", () => {
  it("desligados ÷ quadro médio × 100, 1 casa", () => {
    expect(calcTaxaTurnover(2, 20)).toBe(10)
  })
  it("retorna null sem quadro médio", () => {
    expect(calcTaxaTurnover(2, null)).toBeNull()
    expect(calcTaxaTurnover(2, 0)).toBeNull()
  })
})
