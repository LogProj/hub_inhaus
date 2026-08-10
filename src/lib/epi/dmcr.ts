import { prisma } from "@/lib/prisma"

/**
 * Ponte entre o CR "bruto" da SRA e a dimensão `dm_cr` (importada do ERP).
 *
 * O CR da SRA vem como "25430 - SP - LOG - BRIDGESTONE PA (LGH)": o código são os
 * caracteres antes do primeiro " - ". Em `dm_cr` o código tem SEMPRE 5 caracteres
 * (numéricos com menos são zero-padeados na importação; há alfanuméricos), então
 * aplicamos o mesmo padrão aqui para casar as duas bases.
 *
 * Serve para COMPLEMENTAR o contrato: pelo CR chega-se ao nome do cliente
 * (grupo), evitando redigitar o cliente no sistema.
 */
export function codigoCrSra(crSra: string): string {
  const bruto = String(crSra).split(" - ")[0]?.trim() ?? ""
  return bruto.length > 0 && bruto.length < 5 ? bruto.padStart(5, "0") : bruto
}

export type ClienteDoCr = { nomeGrpCliente: string | null; nomeCliente: string | null }

/** Cliente do contrato a partir do CR, via `dm_cr`. Campos nulos se não houver match. */
export async function clienteDoCr(crSra: string): Promise<ClienteDoCr> {
  const cr = codigoCrSra(crSra)
  if (!cr) return { nomeGrpCliente: null, nomeCliente: null }
  const d = await prisma.dmCr.findUnique({
    where: { cr },
    select: { nomeGrpCliente: true, nomeCliente: true },
  })
  return {
    nomeGrpCliente: d?.nomeGrpCliente ?? null,
    nomeCliente: d?.nomeCliente ?? null,
  }
}

/** Nome de cliente para exibir/gravar a partir do CR (o grupo tem prioridade). */
export function nomeClientePreferido(c: ClienteDoCr): string | null {
  const escolhido = c.nomeGrpCliente || c.nomeCliente || null
  return escolhido ? escolhido.trim() || null : null
}

/**
 * Mapa CR (bruto da SRA) → NOME GRP CLIENTE (dm_cr), resolvido em lote. CRs sem
 * match na dm_cr ficam de fora do mapa. Usado para rotular o cliente pelo grupo
 * do contrato (ex.: na tela de Líderes).
 */
export async function grupoClientePorCrs(crsSra: string[]): Promise<Map<string, string>> {
  const porCodigo = new Map<string, string[]>()
  for (const cr of crsSra) {
    const codigo = codigoCrSra(cr)
    if (!codigo) continue
    const arr = porCodigo.get(codigo) ?? []
    arr.push(cr)
    porCodigo.set(codigo, arr)
  }
  const codigos = Array.from(porCodigo.keys())
  if (codigos.length === 0) return new Map()

  const linhas = await prisma.dmCr.findMany({
    where: { cr: { in: codigos } },
    select: { cr: true, nomeGrpCliente: true },
  })
  const mapa = new Map<string, string>()
  for (const l of linhas) {
    const grupo = l.nomeGrpCliente?.trim()
    if (!grupo) continue
    for (const crSra of porCodigo.get(l.cr) ?? []) mapa.set(crSra, grupo)
  }
  return mapa
}
