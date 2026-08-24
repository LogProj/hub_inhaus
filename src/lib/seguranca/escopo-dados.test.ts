import { describe, it, expect } from "vitest"
import { codigoCr } from "./escopo-dados"
import { predicadoSraCr, EXPR_CODIGO_CR_SRA, type EscopoDados } from "./escopo-dados"

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

describe("predicadoSraCr", () => {
  const TODOS: EscopoDados = { tipo: "todos" }
  it("escopo 'todos' não filtra nada", () => {
    const p = predicadoSraCr(TODOS, "cr", 5)
    expect(p.sql).toBe("")
    expect(p.params).toEqual([])
  })
  it("escopo lista injeta o código derivado contra o array de CRs no placeholder certo", () => {
    const p = predicadoSraCr({ tipo: "lista", crs: ["12345", "01489"] }, "cr", 5)
    expect(p.sql).toBe(` and ${EXPR_CODIGO_CR_SRA("cr")} = any($5::text[])`)
    expect(p.params).toEqual([["12345", "01489"]])
  })
  it("escopo lista VAZIA bloqueia tudo (1=0), sem params", () => {
    const p = predicadoSraCr({ tipo: "lista", crs: [] }, "cr", 5)
    expect(p.sql).toBe(" and 1=0")
    expect(p.params).toEqual([])
  })
})
