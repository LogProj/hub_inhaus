import { describe, it, expect, vi } from "vitest"

vi.mock("@/lib/prisma", () => ({
  prisma: {
    authUserContratante: { findMany: vi.fn() },
  },
}))

import {
  predicadoContratante,
  assertDesviosNoEscopo,
  type EscopoContratante,
} from "./escopo-contratante"

describe("predicadoContratante", () => {
  it("escopo todos → sem filtro", () => {
    const r = predicadoContratante({ tipo: "todos" }, "contratante_id", 1)
    expect(r.sql).toBe("")
    expect(r.params).toEqual([])
  })
  it("lista vazia → 1=0 (fail-closed)", () => {
    const r = predicadoContratante({ tipo: "lista", ids: [] }, "contratante_id", 1)
    expect(r.sql).toBe(" and 1=0")
  })
  it("lista → filtra por id com placeholder", () => {
    const r = predicadoContratante({ tipo: "lista", ids: [7] }, "contratante_id", 3)
    expect(r.sql).toBe(" and contratante_id = any($3::int[])")
    expect(r.params).toEqual([[7]])
  })
})

describe("assertDesviosNoEscopo", () => {
  const escopo: EscopoContratante = { tipo: "lista", ids: [7] }
  it("passa quando todas as linhas estão no escopo", () => {
    expect(() =>
      assertDesviosNoEscopo([{ contratanteId: 7 }], (l) => l.contratanteId, escopo),
    ).not.toThrow()
  })
  it("lança quando uma linha vaza contratante fora do escopo", () => {
    expect(() =>
      assertDesviosNoEscopo([{ contratanteId: 9 }], (l) => l.contratanteId, escopo),
    ).toThrow(/fora do escopo/)
  })
  it("escopo todos nunca lança", () => {
    expect(() =>
      assertDesviosNoEscopo([{ contratanteId: 9 }], (l) => l.contratanteId, { tipo: "todos" }),
    ).not.toThrow()
  })
})
