import { describe, it, expect } from "vitest"
import { codigoCr } from "./escopo-dados"

describe("codigoCr", () => {
  it("extrai o código antes do ' - ' e mantém 5 chars", () => {
    expect(codigoCr("12345 - Fábrica Sul")).toBe("12345")
  })
  it("zero-padeia códigos numéricos com menos de 5 dígitos", () => {
    expect(codigoCr("1489 - Loja")).toBe("01489")
  })
  it("aceita CR alfanumérico", () => {
    expect(codigoCr("C95DR - Centro X")).toBe("C95DR")
  })
  it("funciona quando não há ' - ' (só o código)", () => {
    expect(codigoCr("01489")).toBe("01489")
  })
  it("faz trim de espaços ao redor", () => {
    expect(codigoCr("  777 - Y ")).toBe("00777")
  })
  it("retorna null para vazio/nulo", () => {
    expect(codigoCr("")).toBeNull()
    expect(codigoCr(null)).toBeNull()
  })
})
