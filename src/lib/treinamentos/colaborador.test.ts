import { describe, it, expect } from "vitest"
import { codigoDoCrSra } from "./colaborador"

describe("codigoDoCrSra", () => {
  it("extrai os 5 chars antes do ' - '", () => {
    expect(codigoDoCrSra("01234 - FILIAL SP")).toBe("01234")
  })
  it("zero-padeia códigos numéricos curtos", () => {
    expect(codigoDoCrSra("123 - X")).toBe("00123")
  })
  it("devolve null quando não há CR", () => {
    expect(codigoDoCrSra("")).toBeNull()
    expect(codigoDoCrSra(null)).toBeNull()
  })
})
