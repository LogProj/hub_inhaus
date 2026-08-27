import { describe, it, expect } from "vitest"
import { criarTreinamentoSchema, confirmarPresencaSchema, responsavelSchema } from "./schemas"

describe("criarTreinamentoSchema", () => {
  it("aceita um treinamento válido", () => {
    const r = criarTreinamentoSchema.safeParse({
      nome: "NR-35", data: "2026-08-26", duracaoHoras: 2.5, responsavelId: "abc",
    })
    expect(r.success).toBe(true)
  })
  it("rejeita duração <= 0", () => {
    const r = criarTreinamentoSchema.safeParse({
      nome: "X", data: "2026-08-26", duracaoHoras: 0, responsavelId: "abc",
    })
    expect(r.success).toBe(false)
  })
  it("rejeita nome vazio", () => {
    const r = criarTreinamentoSchema.safeParse({
      nome: "", data: "2026-08-26", duracaoHoras: 1, responsavelId: "abc",
    })
    expect(r.success).toBe(false)
  })
})

describe("confirmarPresencaSchema", () => {
  it("aceita 11 dígitos com máscara", () => {
    expect(confirmarPresencaSchema.safeParse({ cpf: "123.456.789-09" }).success).toBe(true)
  })
  it("rejeita menos de 11 dígitos", () => {
    expect(confirmarPresencaSchema.safeParse({ cpf: "123" }).success).toBe(false)
  })
})

describe("responsavelSchema", () => {
  it("exige nome", () => {
    expect(responsavelSchema.safeParse({ nome: "  " }).success).toBe(false)
    expect(responsavelSchema.safeParse({ nome: "João" }).success).toBe(true)
  })
})
