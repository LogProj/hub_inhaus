import { describe, expect, it } from "vitest"
import { formatarNumero, formatarPercentual, formatarVariacao } from "./format"

describe("formatarNumero", () => {
  it("usa virgula como separador decimal", () => {
    expect(formatarNumero(4.5, 1)).toBe("4,5")
  })

  it("usa ponto como separador de milhar", () => {
    expect(formatarNumero(1234567, 0)).toBe("1.234.567")
  })

  it("combina separador de milhar e decimal juntos", () => {
    expect(formatarNumero(1234.5, 1)).toBe("1.234,5")
  })

  it("sem casas informadas, nao mostra decimais", () => {
    expect(formatarNumero(1234)).toBe("1.234")
  })

  it("arredonda para o numero de casas pedido", () => {
    expect(formatarNumero(2.456, 2)).toBe("2,46")
  })
})

describe("formatarPercentual", () => {
  it("formata com uma casa decimal por padrao e o simbolo de porcentagem", () => {
    expect(formatarPercentual(45.678)).toBe("45,7%")
  })

  it("aceita numero de casas customizado", () => {
    expect(formatarPercentual(45.678, 2)).toBe("45,68%")
  })

  it("usa virgula como separador decimal", () => {
    expect(formatarPercentual(4.5)).toBe("4,5%")
  })
})

describe("formatarVariacao", () => {
  it("zero devolve 0,0% sem sinal", () => {
    expect(formatarVariacao(0)).toBe("0,0%")
  })

  it("variacao negativa muito pequena arredonda para zero sem sinal", () => {
    expect(formatarVariacao(-0.02)).toBe("0,0%")
  })

  it("positivo recebe o sinal de mais", () => {
    expect(formatarVariacao(3.2)).toBe("+3,2%")
  })

  it("negativo usa o sinal de menos tipografico U+2212, nao o hifen", () => {
    const resultado = formatarVariacao(-1.8)
    expect(resultado).toBe("−1,8%")
    expect(resultado).not.toContain("-")
  })

  it("arredonda antes de decidir o sinal", () => {
    expect(formatarVariacao(0.04)).toBe("0,0%")
  })
})
