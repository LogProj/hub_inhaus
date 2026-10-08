import ExcelJS from "exceljs"
import JSZip from "jszip"
import { beforeEach, describe, expect, it, vi } from "vitest"

const dbMock = vi.hoisted(() => ({ connect: vi.fn(), query: vi.fn(), release: vi.fn() }))
vi.mock("@/lib/db-inhaus", () => ({ inhausPool: { connect: dbMock.connect } }))
vi.mock("server-only", () => ({}))

import { analisarPlanilhaConformidade, importarConformidadeLegal } from "./conformidade-legal-importacao"

const cabecalhos = [
  "MÊS/ANO", "GERENTE REGIONAL", "GERENTE", "CR", "SUPERVISOR", "FUNÇÃO", "COLABORADOR",
  "INTERJORNADA", "LIMITE HR DIA", "LIMITE HR DIA EXCEÇÃO", "FOLGA SEMANAL",
  "12X36 LIMITE FT MÊS", "FÉRIAS COM PONTO", "TOTAL OCORRÊNCIAS", "TOTAL PROCESSOS",
  "PROCESSOS ENCERRADOS", "TICKET MÉDIO ENCERRADO",
]
const detalhe = (cpf = "12345678901", nome = "Pessoa A") => [
  "AGO 2026", "REGIONAL", "GERENTE", "123 - CR Central", "SUPERVISOR", "AUXILIAR",
  `${cpf} - ${nome}`, 1, 0, 0, 0, 0, 0, 1, 4, 2, 12.5,
]

async function gerar(rows: unknown[][], options: { merged?: boolean; formulas?: boolean } = {}) {
  const workbook = new ExcelJS.Workbook()
  const sheet = workbook.addWorksheet("Drill")
  sheet.addRow(cabecalhos)
  rows.forEach((values) => sheet.addRow(values))
  if (options.merged) sheet.mergeCells("B2:B3")
  if (options.formulas) sheet.getCell("H2").value = { formula: "1", result: 1 }
  return Buffer.from(await workbook.xlsx.writeBuffer())
}

function totalGeral(total: number) {
  return ["TOTAL", null, null, null, null, null, null, total, 0, 0, 0, 0, 0, total, null, null, null]
}

describe("importação de conformidade legal", () => {
  it("aceita XML com prefixo e referências omitidas do exportador do dashboard", async () => {
    const zip = await JSZip.loadAsync(await gerar([detalhe(), totalGeral(1).map((v) => v ?? 0), ["Filtros aplicados: Ativos"]]))
    for (const arquivo of ["xl/workbook.xml", "xl/worksheets/sheet1.xml", "xl/styles.xml"]) {
      let xml = await zip.file(arquivo)!.async("string")
      xml = xml.replace('xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"', 'xmlns:x="http://schemas.openxmlformats.org/spreadsheetml/2006/main"').replace(/<(\/?)([A-Za-z][\w]*)/g, "<$1x:$2")
      if (arquivo.includes("worksheets")) xml = xml.replace(/ r="(?:[A-Z]+)?\d+"/g, "").replace("</x:sheetData>", "<x:row /></x:sheetData>")
      zip.file(arquivo, xml)
    }
    const dados = await analisarPlanilhaConformidade(await zip.generateAsync({ type: "nodebuffer" }), "segredo")
    expect(dados.rows).toHaveLength(1)
    expect(dados.somas[6]).toBe(1)
  })
  beforeEach(() => {
    dbMock.connect.mockReset().mockResolvedValue({ query: dbMock.query, release: dbMock.release })
    dbMock.query.mockReset()
    dbMock.release.mockReset()
  })

  it("lê detalhes, remove totais, reconhece competências/filtros e mantém somente HMAC do CPF", async () => {
    const arquivo = await gerar([detalhe(), totalGeral(1), ["Filtros aplicados: Ativos"]])
    const dados = await analisarPlanilhaConformidade(arquivo, "segredo-teste")
    expect(dados).toMatchObject({ totaisRemovidos: 1, filtros: "Filtros aplicados: Ativos", somas: [1, 0, 0, 0, 0, 0, 1], competencias: ["2026-08-01"] })
    expect(dados.rows).toHaveLength(1)
    expect(dados.rows[0]?.[7]).toMatch(/^[a-f0-9]{64}$/)
    expect(JSON.stringify(dados)).not.toContain("12345678901")
  })

  it("lê hierarquia mesclada como o importador Python anterior", async () => {
    const segundo = detalhe("12345678902", "Pessoa B")
    const dados = await analisarPlanilhaConformidade(await gerar([detalhe(), segundo, totalGeral(2), ["Filtros aplicados: Ativos"]], { merged: true }), "segredo")
    expect(dados.rows).toHaveLength(2)
    expect(dados.rows[1]?.[1]).toBe("REGIONAL")
  })

  it("rejeita cabeçalho incompatível, fórmulas e detalhes duplicados", async () => {
    const arquivoCabecalho = new ExcelJS.Workbook()
    arquivoCabecalho.addWorksheet("x").addRow(["coluna errada"])
    await expect(analisarPlanilhaConformidade(Buffer.from(await arquivoCabecalho.xlsx.writeBuffer()), "segredo")).rejects.toThrow("Cabeçalho incompatível")
    await expect(analisarPlanilhaConformidade(await gerar([detalhe(), totalGeral(1), ["Filtros aplicados: x"]], { formulas: true }), "segredo")).rejects.toThrow("Fórmulas")
    await expect(analisarPlanilhaConformidade(await gerar([detalhe(), detalhe(), totalGeral(2), ["Filtros aplicados: x"]]), "segredo")).rejects.toThrow("duplicado")
  })

  it("rejeita inconsistência das métricas e total geral ausente ou divergente", async () => {
    const divergente = detalhe()
    divergente[13] = 9
    await expect(analisarPlanilhaConformidade(await gerar([divergente, totalGeral(9), ["Filtros aplicados: x"]]), "segredo")).rejects.toThrow("Ocorrências inconsistentes")
    await expect(analisarPlanilhaConformidade(await gerar([detalhe(), totalGeral(2), ["Filtros aplicados: x"]]), "segredo")).rejects.toThrow("total geral")
  })

  it("não duplica arquivo e escopo já importados", async () => {
    dbMock.query.mockImplementation(async (sql: string) => String(sql).includes("SELECT id FROM public.ft_conformidade_legal_carga")
      ? { rowCount: 1, rows: [{ id: "1" }] } : { rowCount: 0, rows: [] })
    const result = await importarConformidadeLegal(await gerar([detalhe(), totalGeral(1), ["Filtros aplicados: Ativos"]]), "modelo.xlsx", "segredo")
    expect(result.duplicado).toBe(true)
    expect(dbMock.query.mock.calls.some(([sql]) => String(sql).startsWith("INSERT"))).toBe(false)
    expect(dbMock.query).toHaveBeenCalledWith("ROLLBACK")
    expect(dbMock.release).toHaveBeenCalledOnce()
  })

  it("grava em transação, confere registros e ocorrências e publica a carga", async () => {
    dbMock.query.mockImplementation(async (sql: string) => {
      const texto = String(sql)
      if (texto.includes("SELECT id FROM public.ft_conformidade_legal_carga")) return { rowCount: 0, rows: [] }
      if (texto.includes("RETURNING id")) return { rowCount: 1, rows: [{ id: "88" }] }
      if (texto.includes("SELECT count(*)")) return { rowCount: 1, rows: [{ registros: 1, ocorrencias: 1 }] }
      return { rowCount: 1, rows: [] }
    })
    const result = await importarConformidadeLegal(await gerar([detalhe(), totalGeral(1), ["Filtros aplicados: Ativos"]]), "modelo.xlsx", "segredo")
    expect(result).toMatchObject({ duplicado: false, registros: 1, ocorrencias: 1 })
    expect(dbMock.query.mock.calls[0]?.[0]).toBe("BEGIN")
    expect(dbMock.query.mock.calls.some(([sql]) => String(sql).startsWith("INSERT INTO public.ft_conformidade_legal ("))).toBe(true)
    expect(dbMock.query).toHaveBeenCalledWith("COMMIT")
    expect(dbMock.release).toHaveBeenCalledOnce()
  })

  it("reverte e libera a conexão quando a gravação falha", async () => {
    dbMock.query.mockImplementation(async (sql: string) => {
      const texto = String(sql)
      if (texto.includes("SELECT id FROM public.ft_conformidade_legal_carga")) return { rowCount: 0, rows: [] }
      if (texto.includes("RETURNING id")) return { rowCount: 1, rows: [{ id: "88" }] }
      if (texto.startsWith("INSERT INTO public.ft_conformidade_legal (")) throw new Error("falha controlada")
      return { rowCount: 1, rows: [] }
    })
    await expect(importarConformidadeLegal(await gerar([detalhe(), totalGeral(1), ["Filtros aplicados: Ativos"]]), "modelo.xlsx", "segredo")).rejects.toThrow("falha controlada")
    expect(dbMock.query).toHaveBeenCalledWith("ROLLBACK")
    expect(dbMock.release).toHaveBeenCalledOnce()
  })
})
