/**
 * Opções EFETIVAS das listas do formulário de desvio, por contratante.
 * Junta os valores PADRÃO (código, opcoes.ts) com os EXTRAS que o admin cadastra
 * (tabela desvio_opcao). Os padrões nunca somem; os extras entram no fim.
 * Módulo server-only.
 */
import { prisma } from "@/lib/prisma"
import { TIPOS, MOTIVOS, CAUSAS_RAIZ, RESPONSAVEIS_INTERNOS, DIVISOES } from "./opcoes"

/** Campos cujas listas são configuráveis, com rótulo e valores padrão (imutáveis). */
export const CAMPOS_LISTA = {
  responsavelInterno: { label: "Responsável Interno", padrao: RESPONSAVEIS_INTERNOS as readonly string[] },
  tipo: { label: "Tipo", padrao: TIPOS as readonly string[] },
  divisao: { label: "Divisão", padrao: DIVISOES as readonly string[] },
  motivo: { label: "Motivo", padrao: MOTIVOS as readonly string[] },
  causaRaiz: { label: "Causa Raiz", padrao: CAUSAS_RAIZ as readonly string[] },
} as const

export type CampoLista = keyof typeof CAMPOS_LISTA
export const CAMPOS_LISTA_KEYS = Object.keys(CAMPOS_LISTA) as CampoLista[]

export function ehCampoLista(campo: string): campo is CampoLista {
  return (CAMPOS_LISTA_KEYS as string[]).includes(campo)
}

export type OpcoesEfetivas = Record<CampoLista, string[]>

/** Opções efetivas (padrão + extras do contratante) de cada campo configurável. */
export async function opcoesEfetivas(contratanteId: number): Promise<OpcoesEfetivas> {
  const custom = await prisma.desvioOpcao.findMany({
    where: { contratanteId },
    orderBy: { valor: "asc" },
  })
  const result = {} as OpcoesEfetivas
  for (const campo of CAMPOS_LISTA_KEYS) {
    const base = [...CAMPOS_LISTA[campo].padrao]
    const extras = custom
      .filter((c) => c.campo === campo)
      .map((c) => c.valor)
      .filter((v) => !base.includes(v))
    result[campo] = [...base, ...extras]
  }
  return result
}

/** Só os valores EXTRAS (customizados) de cada campo — o que o admin pode remover. */
export async function opcoesCustom(contratanteId: number): Promise<Record<CampoLista, string[]>> {
  const custom = await prisma.desvioOpcao.findMany({
    where: { contratanteId },
    orderBy: { valor: "asc" },
  })
  const result = {} as Record<CampoLista, string[]>
  for (const campo of CAMPOS_LISTA_KEYS) {
    result[campo] = custom.filter((c) => c.campo === campo).map((c) => c.valor)
  }
  return result
}

/** Adiciona um valor extra a uma lista. Ignora se já é padrão ou já existe. */
export async function adicionarOpcao(
  contratanteId: number,
  campo: CampoLista,
  valor: string,
): Promise<void> {
  const v = valor.trim()
  if (!v) throw new Error("Informe um valor.")
  if ((CAMPOS_LISTA[campo].padrao as readonly string[]).includes(v)) return
  await prisma.desvioOpcao.upsert({
    where: { contratanteId_campo_valor: { contratanteId, campo, valor: v } },
    update: {},
    create: { contratanteId, campo, valor: v },
  })
}

/** Remove um valor EXTRA (padrões não são removíveis). */
export async function removerOpcao(
  contratanteId: number,
  campo: CampoLista,
  valor: string,
): Promise<void> {
  await prisma.desvioOpcao.deleteMany({ where: { contratanteId, campo, valor } })
}
