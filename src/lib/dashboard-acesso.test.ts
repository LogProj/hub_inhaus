import { describe, it, expect } from "vitest"
import { destinoRefresh } from "./dashboard-acesso"
import { HEADER_PATHNAME } from "./http-headers"

// Regressão: ao renovar a sessão, o usuário caía SEMPRE na Visão Geral (/dashboards)
// porque o caminho pedido se perdia — o consumidor lia um header ("x-invoke-path") que
// o middleware nunca publicava (ele publica "x-pathname"). Estes testes travam o
// contrato: o destino do refresh PRESERVA a página pedida, e produtor/consumidor usam
// a MESMA constante de header (não podem mais divergir).

describe("destinoRefresh", () => {
  it("preserva a página pedida (não joga para /dashboards)", () => {
    const alvo = "/dashboards/clientes/atlas/desvios/painel"
    const url = destinoRefresh(alvo)
    expect(url).toContain("/api/auth/refresh")
    expect(new URL(url, "http://x").searchParams.get("next")).toBe(alvo)
  })

  it("cai no fallback quando o caminho é nulo", () => {
    expect(new URL(destinoRefresh(null), "http://x").searchParams.get("next")).toBe("/dashboards")
  })

  it("ignora valor que não é caminho interno (anti open-redirect)", () => {
    expect(new URL(destinoRefresh("https://evil.tld"), "http://x").searchParams.get("next")).toBe("/dashboards")
  })

  it("respeita o fallback informado", () => {
    expect(new URL(destinoRefresh(null, "/home"), "http://x").searchParams.get("next")).toBe("/home")
  })
})

describe("HEADER_PATHNAME (fonte única)", () => {
  it("é o header que o middleware publica", () => {
    // Se alguém mudar o nome só de um lado, este valor de contrato quebra o teste.
    expect(HEADER_PATHNAME).toBe("x-pathname")
  })
})
