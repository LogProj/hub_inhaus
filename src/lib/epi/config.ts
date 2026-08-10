import { prisma } from "@/lib/prisma"
import type { ItemChecklist } from "@/lib/epi/schemas"
import { gerarToken } from "@/lib/epi/tokens"
import { clienteDoCr, nomeClientePreferido } from "@/lib/epi/dmcr"

/**
 * Camada de CONFIGURAÇÃO do módulo de EPI (escrita e leitura das entidades de
 * cadastro: cliente, CR, turno, responsável, checklist e membro).
 *
 * Regras de negócio embutidas aqui:
 *  - Um CR pertence a um único cliente (unique em epi_cliente_cr.cr).
 *  - Checklist é versionado: editar um publicado cria uma versão nova; a antiga
 *    fica para o histórico.
 *  - Vínculos de responsável usam vigência (fimEm), nunca delete.
 *
 * Módulo server-only (Prisma).
 */

// ---- Clientes + CRs -------------------------------------------------------

export async function listarClientesComCrs() {
  return prisma.cliente.findMany({
    orderBy: { nome: "asc" },
    include: { crs: { orderBy: { cr: "asc" } } },
  })
}

export async function criarCliente(nome: string) {
  return prisma.cliente.create({ data: { nome } })
}

export async function atualizarCliente(id: number, dados: { nome?: string; ativo?: boolean }) {
  return prisma.cliente.update({ where: { id }, data: dados })
}

/** Vincula um CR (da SRA) a um cliente. Falha se o CR já pertence a outro cliente. */
export async function criarClienteCr(clienteId: number, cr: string) {
  return prisma.clienteCr.create({ data: { clienteId, cr } })
}

export async function removerClienteCr(id: number) {
  return prisma.clienteCr.delete({ where: { id } })
}

/**
 * Vincula um setor a partir do CR (fluxo do assistente). O nome do cliente é
 * DERIVADO da `dm_cr` (grupo do cliente) — o usuário não digita cliente. Cria ou
 * reusa o Cliente por nome e cria o vínculo do CR (epi_cliente_cr.cr é @unique).
 * Se o CR já estava vinculado, mantém o cliente que já existe (não força troca).
 * Sem match na `dm_cr`, cai no próprio CR como nome (raro; a base casa ~100%).
 */
export async function vincularSetorPorCr(
  cr: string,
): Promise<{ clienteId: number; clienteNome: string; cr: string }> {
  const jaVinculado = await prisma.clienteCr.findUnique({
    where: { cr },
    include: { cliente: { select: { id: true, nome: true } } },
  })
  if (jaVinculado) {
    return { clienteId: jaVinculado.cliente.id, clienteNome: jaVinculado.cliente.nome, cr }
  }
  const nome = nomeClientePreferido(await clienteDoCr(cr)) ?? cr
  const cliente =
    (await prisma.cliente.findFirst({ where: { nome } })) ??
    (await prisma.cliente.create({ data: { nome } }))
  await prisma.clienteCr.create({ data: { clienteId: cliente.id, cr } })
  return { clienteId: cliente.id, clienteNome: cliente.nome, cr }
}

/** CRs mapeados a clientes, com o nome do cliente — para a tela de alocação. */
export async function listarCrsMapeados() {
  const linhas = await prisma.clienteCr.findMany({
    where: { ativo: true },
    orderBy: { cr: "asc" },
    include: { cliente: { select: { id: true, nome: true } } },
  })
  return linhas.map((l) => ({ cr: l.cr, clienteId: l.cliente.id, clienteNome: l.cliente.nome }))
}

/** Líderes vigentes de um CR (setor) — para exibir no assistente ao montar o CR. */
export async function listarLideresDoCr(cr: string): Promise<{ authUserId: string; nome: string }[]> {
  const linhas = await prisma.liderCr.findMany({
    where: { cr, fimEm: null },
    orderBy: { nome: "asc" },
    select: { authUserId: true, nome: true },
  })
  const vistos = new Set<string>()
  const out: { authUserId: string; nome: string }[] = []
  for (const l of linhas) {
    if (vistos.has(l.authUserId)) continue
    vistos.add(l.authUserId)
    out.push({ authUserId: l.authUserId, nome: l.nome })
  }
  return out
}

/** Turnos ativos de um CR (para escolher o turno alvo na alocação). */
export async function listarTurnosPorCr(cr: string) {
  return prisma.turno.findMany({
    where: { cr, ativo: true },
    orderBy: { nome: "asc" },
    select: { id: true, nome: true },
  })
}

/** CRs já mapeados (para não oferecer de novo na tela). */
export async function crsJaMapeados(): Promise<Set<string>> {
  const linhas = await prisma.clienteCr.findMany({ select: { cr: true } })
  return new Set(linhas.map((l) => l.cr))
}

// ---- Líderes por CR -------------------------------------------------------

/** Líderes vigentes de um cliente, agregados por usuário com a lista de CRs. */
export async function listarLideresDoCliente(clienteId: number) {
  const linhas = await prisma.liderCr.findMany({
    where: { clienteId, fimEm: null },
    orderBy: { nome: "asc" },
    select: { authUserId: true, nome: true, cr: true },
  })
  const porUsuario = new Map<string, { authUserId: string; nome: string; crs: string[] }>()
  for (const l of linhas) {
    const atual = porUsuario.get(l.authUserId) ?? { authUserId: l.authUserId, nome: l.nome, crs: [] }
    atual.crs.push(l.cr)
    porUsuario.set(l.authUserId, atual)
  }
  return Array.from(porUsuario.values())
}

/**
 * Define os CRs que um líder responde num cliente.
 *  - modo "substituir": a lista `crs` passa a ser exatamente o conjunto vigente
 *    (encerra os que saíram, cria os que entraram).
 *  - modo "adicionar": só acrescenta os CRs de `crs` que ainda não são vigentes
 *    (não remove nada). Usado pelo assistente ao definir o líder de um setor.
 * Encerrar usa vigência (fimEm), nunca delete.
 */
export async function definirLiderCrs(
  clienteId: number,
  authUserId: string,
  nome: string,
  crs: string[],
  modo: "substituir" | "adicionar" = "substituir",
): Promise<void> {
  const vigentes = await prisma.liderCr.findMany({
    where: { clienteId, authUserId, fimEm: null },
    select: { id: true, cr: true },
  })
  const crsVigentes = new Set(vigentes.map((v) => v.cr))
  const alvo = new Set(crs)

  const criar = crs.filter((cr) => !crsVigentes.has(cr))
  const encerrar =
    modo === "substituir" ? vigentes.filter((v) => !alvo.has(v.cr)).map((v) => v.id) : []

  await prisma.$transaction([
    ...(encerrar.length > 0
      ? [prisma.liderCr.updateMany({ where: { id: { in: encerrar } }, data: { fimEm: new Date() } })]
      : []),
    ...(criar.length > 0
      ? [prisma.liderCr.createMany({ data: criar.map((cr) => ({ clienteId, authUserId, nome, cr })) })]
      : []),
  ])
}

/** Encerra todas as responsabilidades de um líder num cliente. */
export async function removerLiderDoCliente(clienteId: number, authUserId: string): Promise<void> {
  await prisma.liderCr.updateMany({
    where: { clienteId, authUserId, fimEm: null },
    data: { fimEm: new Date() },
  })
}

/**
 * Nomeia um líder para um CR vindo DA BASE (o CR não é cadastrado à mão). O
 * cliente do CR já está definido na base (dm_cr): garantimos o vínculo do CR ao
 * cliente (idempotente) e gravamos o líder. Assim dá para nomear líderes de
 * qualquer CR, antes mesmo de configurar os turnos.
 */
export async function nomearLiderNoCr(cr: string, authUserId: string, nome: string): Promise<void> {
  const { clienteId } = await vincularSetorPorCr(cr)
  await definirLiderCrs(clienteId, authUserId, nome, [cr], "adicionar")
}

/** Encerra a responsabilidade de um líder num CR específico (vigência, não delete). */
export async function removerLiderDoCr(cr: string, authUserId: string): Promise<void> {
  await prisma.liderCr.updateMany({
    where: { cr, authUserId, fimEm: null },
    data: { fimEm: new Date() },
  })
}

/** Usuários do hub elegíveis para serem líderes (têm acesso e já entraram). */
export async function listarUsuariosHub() {
  const linhas = await prisma.authUser.findMany({
    where: { hasAccess: true, authUserId: { not: null } },
    select: { authUserId: true, name: true, email: true },
    orderBy: { name: "asc" },
  })
  return linhas
    .filter((l): l is { authUserId: string; name: string | null; email: string } => l.authUserId != null)
    .map((l) => ({ authUserId: l.authUserId, nome: l.name?.trim() || l.email, email: l.email }))
}

// ---- Turnos + responsáveis ------------------------------------------------

export async function listarTurnosPorCliente(clienteId: number) {
  return prisma.turno.findMany({
    where: { clienteId },
    orderBy: [{ cr: "asc" }, { nome: "asc" }],
    include: {
      responsaveis: { where: { fimEm: null }, orderBy: { nome: "asc" } },
    },
  })
}

export async function criarTurno(dados: {
  clienteId: number
  cr: string
  nome: string
  diasSemana: number[]
}) {
  // Gera o token público estável já na criação (é o que vai no QR/link).
  return prisma.turno.create({ data: { ...dados, tokenPublico: gerarToken() } })
}

export async function atualizarTurno(
  id: number,
  dados: { nome?: string; diasSemana?: number[]; ativo?: boolean },
) {
  return prisma.turno.update({ where: { id }, data: dados })
}

export async function adicionarResponsavel(dados: {
  turnoId: number
  authUserId: string
  nome: string
}) {
  return prisma.responsavelTurno.create({ data: dados })
}

/** Encerra a vigência de um responsável (mantém o histórico). */
export async function encerrarResponsavel(id: number) {
  return prisma.responsavelTurno.update({ where: { id }, data: { fimEm: new Date() } })
}

// ---- Checklists versionados (BIBLIOTECA GLOBAL) ---------------------------

/** Biblioteca global de checklists, com suas versões (mais recente primeiro) e o
 * número de setores que o usam (para exibir/validar exclusão). */
export async function listarChecklists() {
  return prisma.checklistTemplate.findMany({
    where: { ativo: true },
    orderBy: { nome: "asc" },
    include: {
      versoes: { orderBy: { versao: "desc" } },
      _count: { select: { crs: true } },
    },
  })
}

/** Checklists que têm ao menos UMA versão publicada (os que podem ser vinculados). */
export async function listarChecklistsPublicaveis() {
  const lista = await prisma.checklistTemplate.findMany({
    where: { ativo: true, versoes: { some: { publicadoEm: { not: null } } } },
    orderBy: { nome: "asc" },
    select: { id: true, nome: true },
  })
  return lista
}

export async function criarTemplate(nome: string) {
  return prisma.checklistTemplate.create({ data: { nome } })
}

/** Renomeia um checklist da biblioteca. */
export async function renomearTemplate(id: number, nome: string) {
  return prisma.checklistTemplate.update({ where: { id }, data: { nome } })
}

/**
 * Exclui (arquiva) um checklist. Bloqueia se ele estiver vinculado a algum setor —
 * o vínculo precisa ser trocado antes. Usa soft-delete (ativo=false) para preservar
 * as versões que sessões antigas possam referenciar.
 */
export async function excluirTemplate(id: number): Promise<{ ok: true } | { ok: false; erro: string }> {
  const emUso = await prisma.clienteCr.count({ where: { checklistTemplateId: id } })
  if (emUso > 0) {
    return {
      ok: false,
      erro: `Este checklist está vinculado a ${emUso} setor(es). Troque o checklist desses setores antes de excluir.`,
    }
  }
  await prisma.checklistTemplate.update({ where: { id }, data: { ativo: false } })
  return { ok: true }
}

/** Vincula (ou desvincula, com null) um checklist a um CR. */
export async function vincularChecklistAoCr(cr: string, checklistTemplateId: number | null) {
  return prisma.clienteCr.update({ where: { cr }, data: { checklistTemplateId } })
}

/**
 * Cria uma nova versão (rascunho) de um template com os itens dados. A numeração
 * é sequencial por template. Editar um checklist publicado = chamar isto de novo.
 */
export async function criarVersaoChecklist(templateId: number, itens: ItemChecklist[]) {
  const ultima = await prisma.checklistVersao.findFirst({
    where: { templateId },
    orderBy: { versao: "desc" },
    select: { versao: true },
  })
  const proxima = (ultima?.versao ?? 0) + 1
  return prisma.checklistVersao.create({
    data: { templateId, versao: proxima, itens: itens as unknown as object },
  })
}

/** Publica (congela) uma versão de checklist. Depois disso ela é imutável. */
export async function publicarVersao(id: number) {
  return prisma.checklistVersao.update({ where: { id }, data: { publicadoEm: new Date() } })
}

/** Versão publicada mais recente de um template (a que vale para as sessões). */
export async function versaoPublicadaAtual(templateId: number) {
  return prisma.checklistVersao.findFirst({
    where: { templateId, publicadoEm: { not: null } },
    orderBy: { versao: "desc" },
  })
}

/**
 * Versão publicada mais recente do checklist VINCULADO a um CR — é a que vale para
 * a sessão do dia. Null se o CR não tem checklist vinculado (ou sem versão publicada).
 */
export async function versaoPublicadaDoCr(cr: string) {
  const vinculo = await prisma.clienteCr.findUnique({
    where: { cr },
    select: { checklistTemplateId: true },
  })
  if (!vinculo?.checklistTemplateId) return null
  return prisma.checklistVersao.findFirst({
    where: { templateId: vinculo.checklistTemplateId, publicadoEm: { not: null } },
    orderBy: { publicadoEm: "desc" },
  })
}

// ---- Membros (papéis) -----------------------------------------------------

export async function listarMembros() {
  return prisma.epiMembro.findMany({ where: { ativo: true }, orderBy: { createdAt: "desc" } })
}

export async function criarMembro(dados: {
  authUserId: string
  papel: "PARAMETRIZADOR" | "LIDER"
  clienteId?: number | null
  cr?: string | null
}) {
  return prisma.epiMembro.create({
    data: {
      authUserId: dados.authUserId,
      papel: dados.papel,
      clienteId: dados.clienteId ?? null,
      cr: dados.cr ?? null,
    },
  })
}

export async function desativarMembro(id: number) {
  return prisma.epiMembro.update({ where: { id }, data: { ativo: false } })
}

// ---- Papel Segurança (central) --------------------------------------------

/**
 * Concede/revoga o papel SEGURANCA central de um usuário (pelo UUID do global_auth).
 * Central = sem escopo (cliente/CR nulos). Segue o padrão do módulo: revogar é
 * `ativo=false` (nunca delete), preservando histórico.
 */
export async function definirSegurancaCentral(authUserId: string, ativo: boolean): Promise<void> {
  const vigentes = await prisma.epiMembro.findMany({
    where: { authUserId, papel: "SEGURANCA", ativo: true },
    select: { id: true },
  })
  if (ativo) {
    if (vigentes.length === 0) {
      await prisma.epiMembro.create({
        data: { authUserId, papel: "SEGURANCA", clienteId: null, cr: null, ativo: true },
      })
    }
  } else if (vigentes.length > 0) {
    await prisma.epiMembro.updateMany({
      where: { id: { in: vigentes.map((v) => v.id) } },
      data: { ativo: false },
    })
  }
}

/** UUIDs (global_auth) que têm SEGURANCA central ativo — para a tela de Usuários. */
export async function listarAuthUserIdsSeguranca(): Promise<Set<string>> {
  const linhas = await prisma.epiMembro.findMany({
    where: { papel: "SEGURANCA", ativo: true },
    select: { authUserId: true },
  })
  return new Set(linhas.map((l) => l.authUserId))
}
