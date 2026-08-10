import { createHash } from "crypto"

import { prisma } from "@/lib/prisma"
import { hmacCpf, hashIguais } from "@/lib/epi/cpf"
import { gerarToken } from "@/lib/epi/tokens"
import { getLideradosDoTurno } from "@/lib/epi/atribuicao"
import { versaoPublicadaDoCr } from "@/lib/epi/config"
import { hojeSaoPaulo, type DataNegocio } from "@/lib/epi/datas"
import type { ItemChecklist, RespostaItem } from "@/lib/epi/schemas"
import type { EscopoUsuario } from "@/lib/epi/escopo"
import type { UsuarioAtual } from "@/lib/epi/guardas"

/**
 * MOTOR DA SESSÃO de EPI (execução).
 *
 * Regra de negócio:
 *  - 1 sessão por turno/dia, criada de forma IDEMPOTENTE na primeira leitura do
 *    QR (não por cron). O QR carrega o token ESTÁVEL do turno; a data de negócio
 *    (America/Sao_Paulo) resolve a sessão do dia.
 *  - A sessão congela a versão publicada do checklist do CR no momento em que
 *    nasce (se depois publicarem outra versão, a sessão do dia mantém a sua).
 *  - Cada liderado responde 1× (upsert por pessoa/sessão). A resposta congela um
 *    snapshot (nome/cargo/CR). Conforme = todos os itens conformes.
 *  - O líder valida o turno; a validação fecha a sessão e guarda um hash do
 *    conteúdo (base da assinatura futura — a assinatura em si NÃO entra agora).
 *
 * Módulo server-only.
 */

type TurnoPublico = {
  id: number
  cr: string
  nome: string
  clienteNome: string
  diasSemana: number[]
}

export type ResolucaoSessao =
  | { estado: "invalido" }
  | { estado: "fora_do_dia"; turno: TurnoPublico; hoje: DataNegocio }
  | { estado: "sem_checklist"; turno: TurnoPublico; hoje: DataNegocio }
  | {
      estado: "ok"
      turno: TurnoPublico
      hoje: DataNegocio
      itens: ItemChecklist[]
      roster: { id: string; nome: string; cargo: string | null; jaRespondeu: boolean }[]
      validada: boolean
    }

async function carregarTurnoPorToken(token: string): Promise<TurnoPublico | null> {
  const t = await prisma.turno.findUnique({
    where: { tokenPublico: token },
    select: {
      id: true,
      cr: true,
      nome: true,
      diasSemana: true,
      ativo: true,
      cliente: { select: { nome: true } },
    },
  })
  if (!t || !t.ativo) return null
  return { id: t.id, cr: t.cr, nome: t.nome, clienteNome: t.cliente.nome, diasSemana: t.diasSemana }
}

/** Garante a sessão do dia (idempotente) e devolve sessão + itens congelados. */
async function garantirSessaoHoje(turno: TurnoPublico, hoje: DataNegocio) {
  const versao = await versaoPublicadaDoCr(turno.cr)
  if (!versao) return null

  const sessao = await prisma.sessaoTurno.upsert({
    where: { turnoId_data: { turnoId: turno.id, data: hoje.data } },
    update: {},
    create: {
      turnoId: turno.id,
      checklistVersaoId: versao.id,
      data: hoje.data,
      token: gerarToken(),
      status: "ABERTA",
    },
  })

  // Os itens vêm da versão CONGELADA na sessão (não necessariamente a mais nova).
  const versaoSessao = await prisma.checklistVersao.findUnique({
    where: { id: sessao.checklistVersaoId },
    select: { itens: true },
  })
  const itens = (versaoSessao?.itens as unknown as ItemChecklist[]) ?? []
  return { sessao, itens }
}

/** Resolve o que a página pública deve mostrar para um token de turno. */
export async function resolverSessaoPublica(token: string): Promise<ResolucaoSessao> {
  const turno = await carregarTurnoPorToken(token)
  if (!turno) return { estado: "invalido" }

  const hoje = hojeSaoPaulo()
  if (!turno.diasSemana.includes(hoje.diaSemana)) return { estado: "fora_do_dia", turno, hoje }

  const garantida = await garantirSessaoHoje(turno, hoje)
  if (!garantida) return { estado: "sem_checklist", turno, hoje }

  const [roster, respondidos] = await Promise.all([
    getLideradosDoTurno(turno.id, turno.cr),
    prisma.respostaEpi.findMany({ where: { sessaoId: garantida.sessao.id }, select: { cpfHash: true } }),
  ])
  const jaResp = new Set(respondidos.map((r) => r.cpfHash))

  return {
    estado: "ok",
    turno,
    hoje,
    itens: garantida.itens,
    validada: garantida.sessao.status === "VALIDADA",
    roster: roster.map((c) => ({
      id: c.cpfHash,
      nome: c.nome,
      cargo: c.cargo,
      jaRespondeu: jaResp.has(c.cpfHash),
    })),
  }
}

export type ResultadoResposta =
  | { ok: true; conforme: boolean }
  | { ok: false; erro: string }

/** Registra a resposta de um liderado (rota pública). */
export async function registrarRespostaPublica(entrada: {
  token: string
  pessoa: string
  cpf: string
  respostas: RespostaItem[]
}): Promise<ResultadoResposta> {
  const turno = await carregarTurnoPorToken(entrada.token)
  if (!turno) return { ok: false, erro: "Link inválido." }

  const hoje = hojeSaoPaulo()
  if (!turno.diasSemana.includes(hoje.diaSemana)) {
    return { ok: false, erro: "Este turno não abre hoje." }
  }

  const garantida = await garantirSessaoHoje(turno, hoje)
  if (!garantida) return { ok: false, erro: "O checklist deste CR ainda não foi publicado." }
  const { sessao, itens } = garantida

  if (sessao.status === "VALIDADA") {
    return { ok: false, erro: "Este turno já foi validado e está fechado." }
  }

  const roster = await getLideradosDoTurno(turno.id, turno.cr)
  const pessoa = roster.find((c) => c.cpfHash === entrada.pessoa)
  if (!pessoa) return { ok: false, erro: "Você não está na lista deste turno." }

  if (!hashIguais(hmacCpf(entrada.cpf), entrada.pessoa)) {
    return { ok: false, erro: "O CPF não confere com o nome selecionado." }
  }

  // Valida as respostas contra os itens congelados; exige os obrigatórios.
  const respMap = new Map(entrada.respostas.map((r) => [r.itemId, r.conforme]))
  for (const item of itens) {
    if (item.obrigatorio && !respMap.has(item.id)) {
      return { ok: false, erro: "Responda todos os itens obrigatórios." }
    }
  }
  const respostasArmazenar = itens
    .filter((i) => respMap.has(i.id))
    .map((i) => ({ itemId: i.id, rotulo: i.rotulo, conforme: respMap.get(i.id) as boolean }))
  const conforme = respostasArmazenar.every((r) => r.conforme)

  await prisma.respostaEpi.upsert({
    where: { sessaoId_cpfHash: { sessaoId: sessao.id, cpfHash: entrada.pessoa } },
    update: {
      respostas: respostasArmazenar,
      conforme,
      nome: pessoa.nome,
      cargo: pessoa.cargo,
      cr: turno.cr,
    },
    create: {
      sessaoId: sessao.id,
      cpfHash: entrada.pessoa,
      nome: pessoa.nome,
      cargo: pessoa.cargo,
      cr: turno.cr,
      respostas: respostasArmazenar,
      conforme,
    },
  })

  if (sessao.status === "ABERTA") {
    await prisma.sessaoTurno.update({
      where: { id: sessao.id },
      data: { status: "AGUARDANDO_VALIDACAO" },
    })
  }

  return { ok: true, conforme }
}

// ---- Validação (líder) ----------------------------------------------------

export type SessaoParaValidar = {
  id: number
  turnoNome: string
  cr: string
  clienteNome: string
  status: string
  dataIso: string
  ehHoje: boolean
  totalRespostas: number
  naoConformes: number
  validada: boolean
}

function turnosDoEscopo(escopo: EscopoUsuario): { verTudo: boolean; turnoIds: number[] } {
  return { verTudo: escopo.verTudo, turnoIds: escopo.turnoIdsComoLider }
}

/**
 * Sessões do DIA ATUAL que o usuário pode validar (líder: só os turnos dos seus
 * CRs; admin: todos). Só o dia de hoje — cada dia é uma sessão própria; o turno
 * validado hoje fica marcado como concluído e permanece na lista até virar o dia,
 * quando um novo aparece conforme a escala (diasSemana). Pendências de dias
 * anteriores NÃO aparecem aqui — isso é acompanhado no indicador (fase 3).
 */
export async function getSessoesParaValidar(escopo: EscopoUsuario): Promise<SessaoParaValidar[]> {
  const hoje = hojeSaoPaulo()
  const { verTudo, turnoIds } = turnosDoEscopo(escopo)
  if (!verTudo && turnoIds.length === 0) return []

  const sessoes = await prisma.sessaoTurno.findMany({
    where: {
      data: hoje.data,
      ...(verTudo ? {} : { turnoId: { in: turnoIds } }),
    },
    include: {
      turno: { select: { nome: true, cr: true, cliente: { select: { nome: true } } } },
      respostas: { select: { conforme: true } },
      validacao: { select: { id: true } },
    },
    orderBy: { id: "desc" },
  })

  return sessoes.map((s) => ({
    id: s.id,
    turnoNome: s.turno.nome,
    cr: s.turno.cr,
    clienteNome: s.turno.cliente.nome,
    status: s.status,
    dataIso: hoje.iso,
    ehHoje: true,
    totalRespostas: s.respostas.length,
    naoConformes: s.respostas.filter((r) => !r.conforme).length,
    validada: s.validacao != null,
  }))
}

export type PessoaSessao = {
  cpfHash: string
  nome: string
  cargo: string | null
  preencheu: boolean
  conforme: boolean | null
  itens: { rotulo: string; conforme: boolean }[]
  presente: boolean
}

export type DetalheSessao = {
  id: number
  turnoNome: string
  cr: string
  clienteNome: string
  dataIso: string
  status: string
  validada: boolean
  pessoas: PessoaSessao[]
}

async function carregarSessaoNoEscopo(sessaoId: number, escopo: EscopoUsuario) {
  const sessao = await prisma.sessaoTurno.findUnique({
    where: { id: sessaoId },
    include: {
      turno: { select: { id: true, nome: true, cr: true, cliente: { select: { nome: true } } } },
      respostas: { orderBy: { nome: "asc" } },
      presencas: true,
      validacao: { select: { id: true } },
    },
  })
  if (!sessao) return null
  const { verTudo, turnoIds } = turnosDoEscopo(escopo)
  if (!verTudo && !turnoIds.includes(sessao.turno.id)) return null
  return sessao
}

/**
 * Detalhe de uma sessão para revisão do líder. Lista TODOS os liderados alocados
 * do turno (quadro ativo ∩ atribuição), unido a quem preencheu, com o status de
 * preenchimento e a presença (marcada pelo líder). Assim escalas de revezamento
 * (ex.: 12x36) funcionam: o líder marca quem estava presente.
 */
export async function getDetalheSessao(
  sessaoId: number,
  escopo: EscopoUsuario,
): Promise<DetalheSessao | null> {
  const sessao = await carregarSessaoNoEscopo(sessaoId, escopo)
  if (!sessao) return null

  const roster = await getLideradosDoTurno(sessao.turno.id, sessao.turno.cr)
  const respostaPorHash = new Map(sessao.respostas.map((r) => [r.cpfHash, r]))
  const presencaPorHash = new Map(sessao.presencas.map((p) => [p.cpfHash, p.presente]))
  const jaValidada = sessao.validacao != null

  // União: alocados no quadro ativo + quem preencheu (mesmo que tenha saído do quadro).
  const hashes = new Set<string>([...roster.map((c) => c.cpfHash), ...respostaPorHash.keys()])

  const pessoas: PessoaSessao[] = Array.from(hashes).map((cpfHash) => {
    const resp = respostaPorHash.get(cpfHash)
    const doQuadro = roster.find((c) => c.cpfHash === cpfHash)
    return {
      cpfHash,
      nome: resp?.nome ?? doQuadro?.nome ?? "—",
      cargo: resp?.cargo ?? doQuadro?.cargo ?? null,
      preencheu: resp != null,
      conforme: resp ? resp.conforme : null,
      itens:
        resp && Array.isArray(resp.respostas)
          ? (resp.respostas as unknown as { rotulo: string; conforme: boolean }[])
          : [],
      // Antes de validar, todos entram como presentes por padrão; depois de
      // validado, vale o que o líder marcou.
      presente: presencaPorHash.get(cpfHash) ?? true,
    }
  })
  pessoas.sort((a, b) => a.nome.localeCompare(b.nome))

  return {
    id: sessao.id,
    turnoNome: sessao.turno.nome,
    cr: sessao.turno.cr,
    clienteNome: sessao.turno.cliente.nome,
    dataIso: sessao.data.toISOString().slice(0, 10),
    status: sessao.status,
    validada: jaValidada,
    pessoas,
  }
}

export type ResultadoValidacao = { ok: true } | { ok: false; erro: string }

/**
 * Valida a sessão do turno (líder). Grava a PRESENÇA de cada liderado (marcada
 * pelo líder) e a validação, com um hash do conteúdo (base da assinatura futura).
 * SEM captura de assinatura por enquanto.
 */
export async function validarSessao(
  sessaoId: number,
  usuario: UsuarioAtual,
  escopo: EscopoUsuario,
  presencas: { cpfHash: string; presente: boolean }[] = [],
): Promise<ResultadoValidacao> {
  const sessao = await carregarSessaoNoEscopo(sessaoId, escopo)
  if (!sessao) return { ok: false, erro: "Sessão não encontrada ou fora do seu acesso." }
  if (sessao.validacao) return { ok: false, erro: "Este turno já foi validado." }

  // Resolve o nome (snapshot) de cada pessoa para gravar a presença.
  const roster = await getLideradosDoTurno(sessao.turno.id, sessao.turno.cr)
  const nomePorHash = new Map<string, string>()
  for (const c of roster) nomePorHash.set(c.cpfHash, c.nome)
  for (const r of sessao.respostas) nomePorHash.set(r.cpfHash, r.nome)

  const presencaValida = presencas.filter((p) => nomePorHash.has(p.cpfHash))
  const ausentesSet = new Set(presencaValida.filter((p) => !p.presente).map((p) => p.cpfHash))

  // Regra: exige que ao menos uma pessoa PRESENTE tenha preenchido, senão não há o
  // que validar (evita "validar" um turno totalmente vazio por engano).
  const algumPresentePreencheu = sessao.respostas.some((r) => !ausentesSet.has(r.cpfHash))
  if (!algumPresentePreencheu) {
    return { ok: false, erro: "Nenhum colaborador presente preencheu o checklist ainda." }
  }

  const conteudo = [
    ...sessao.respostas.map((r) => `R:${r.cpfHash}:${r.conforme ? 1 : 0}`),
    ...presencaValida.map((p) => `P:${p.cpfHash}:${p.presente ? 1 : 0}`),
  ]
    .sort()
    .join("|")
  const hashConteudo = createHash("sha256").update(conteudo).digest("hex")

  await prisma.$transaction([
    // regrava a presença desta sessão do zero (idempotente)
    prisma.presencaSessao.deleteMany({ where: { sessaoId: sessao.id } }),
    prisma.presencaSessao.createMany({
      data: presencaValida.map((p) => ({
        sessaoId: sessao.id,
        cpfHash: p.cpfHash,
        nome: nomePorHash.get(p.cpfHash) ?? "—",
        presente: p.presente,
      })),
    }),
    prisma.validacaoSessao.create({
      data: {
        sessaoId: sessao.id,
        authUserId: usuario.authUserId ?? "acesso-livre",
        nomeLider: usuario.nome ?? "—",
        hashConteudo,
      },
    }),
    prisma.sessaoTurno.update({ where: { id: sessao.id }, data: { status: "VALIDADA" } }),
  ])

  return { ok: true }
}
