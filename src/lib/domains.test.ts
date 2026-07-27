import { describe, expect, it } from "vitest"
import {
  buscarTelas,
  DOMINIOS,
  sanitizarTelas,
  telasVisiveis,
  TODAS_AS_TELAS,
} from "./domains"

describe("registro de dominios", () => {
  it("registra os cinco dominios da empresa, na ordem", () => {
    expect(DOMINIOS.map((d) => d.key)).toEqual([
      "seguranca",
      "rh",
      "qualidade",
      "treinamentos",
      "financeiro",
    ])
  })

  it("nao tem chave de tela duplicada", () => {
    const chaves = TODAS_AS_TELAS.map((t) => t.key)
    expect(new Set(chaves).size).toBe(chaves.length)
  })

  it("toda tela tem href comecando com barra", () => {
    for (const tela of TODAS_AS_TELAS) {
      expect(tela.href).toMatch(/^\//)
    }
  })

  it("toda tela carrega o dominio de origem", () => {
    for (const tela of TODAS_AS_TELAS) {
      expect(tela.dominioKey).toBeTruthy()
      expect(tela.dominioLabel).toBeTruthy()
    }
  })
})

describe("buscarTelas", () => {
  it("encontra ignorando acento e caixa", () => {
    expect(buscarTelas("SEGURANCA").length).toBeGreaterThan(0)
    expect(buscarTelas("competencias").length).toBeGreaterThan(0)
  })

  it("encontra por palavra-chave, nao so pelo rotulo", () => {
    const resultado = buscarTelas("vencimento")
    expect(resultado.some((t) => t.key === "matriz-competencias")).toBe(true)
  })

  it("devolve vazio para termo sem correspondencia", () => {
    expect(buscarTelas("xyzabc")).toEqual([])
  })

  it("devolve vazio para termo em branco", () => {
    expect(buscarTelas("   ")).toEqual([])
  })
})

describe("telasVisiveis", () => {
  const habilitadas = TODAS_AS_TELAS.filter((t) => !t.emBreve).map((t) => t.key)

  it("admin enxerga todas as telas habilitadas", () => {
    const resultado = telasVisiveis({ isAdmin: true, visibleScreens: [] })
    expect(resultado.map((t) => t.key)).toEqual(habilitadas)
  })

  it("usuario comum enxerga apenas o que foi concedido", () => {
    const resultado = telasVisiveis({ isAdmin: false, visibleScreens: ["home"] })
    expect(resultado.map((t) => t.key)).toEqual(["home"])
  })

  it("ignora chave concedida que nao existe mais", () => {
    const resultado = telasVisiveis({
      isAdmin: false,
      visibleScreens: ["tela-fantasma"],
    })
    expect(resultado).toEqual([])
  })
})

describe("sanitizarTelas", () => {
  it("descarta o que nao e chave valida", () => {
    expect(sanitizarTelas(["home", "fantasma", 42, null])).toEqual(["home"])
  })

  it("remove duplicatas", () => {
    expect(sanitizarTelas(["home", "home"])).toEqual(["home"])
  })

  it("devolve vazio para entrada que nao e lista", () => {
    expect(sanitizarTelas("home")).toEqual([])
  })
})
