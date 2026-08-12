import { createHash } from "crypto"

import { prisma } from "@/lib/prisma"
import { gerarToken } from "@/lib/epi/tokens"
import { getLideradosDoTurno } from "@/lib/epi/atribuicao"
import { versaoPublicadaDoCr } from "@/lib/epi/config"
import { diaDaSemana, type DataNegocio } from "@/lib/epi/datas"
import type { ItemChecklist } from "@/lib/epi/schemas"
import type { EscopoUsuario } from "@/lib/epi/escopo"
import type { UsuarioAtual } from "@/lib/epi/guardas"

/**
 * UTILIZAÇÃO DE EPIs (v2) — o LÍDER preenche o checklist por colaborador.
 *
 * Regra de negócio:
 *  - 1 registro por turno/dia (SessaoTurno, idempotente). Congela a versão publicada
 *    do checklist (a lista de EPIs) do CR no momento em que nasce.
 *  - Para cada colaborador do CR+turno, no dia, o líder marca AUSENTE (não preenche
 *    EPI) OU, por EPI, Conforme/Não Conforme.
 *  - `RespostaEpi` guarda a resposta do líder por colaborador: `ausente` + `respostas`
 *    = [{ epiId, epi, conforme }] (vazio quando ausente). `conforme` = todos conformes.
 *  - `ValidacaoSessao` é o REGISTRO do líder (quem preencheu, quando + hash do conteúdo).
 *
 * Módulo server-only.
 */

export type TurnoUtil = { id: number; nome: string; cr: string; clienteNome: string; diasSemana: number[] }

function noEscopo(escopo: EscopoUsuario, turnoId: number): boolean {
  return escopo.verTudo || escopo.turnoIdsComoLider.includes(turnoId)
}

/** Turnos que o usuário pode preencher (líder: os seus; admin/Segurança: todos). */
export async function getTurnosParaUtilizacao(escopo: EscopoUsuario): Promise<TurnoUtil[]> {
  if (!escopo.verTudo && escopo.turnoIdsComoLider.length === 0) return []
  const turnos = await prisma.turno.findMany({
    where: escopo.verTudo ? { ativo: true } : { ativo: true, id: { in: escopo.turnoIdsComoLider } },
    select: { id: true, nome: true, cr: true, diasSemana: true, cliente: { select: { nome: true } } },
    orderBy: [{ cr: "asc" }, { nome: "asc" }],
  })
  return turnos.map((t) => ({ id: t.id, nome: t.nome, cr: t.cr, clienteNome: t.cliente.nome, diasSemana: t.diasSemana }))
}

export type LinhaGrade = {
  cpfHash: string
  nome: string
  cargo: string | null
  ausente: boolean
  /** epiId -> conforme (true/false). Ausência de chave = ainda não respondido. */
  respostas: Record<string, boolean>
}

export type GradeUtilizacao = {
  turnoId: number
  turnoNome: string
  cr: string
  clienteNome: string
  dataIso: string
  epis: { id: string; nome: string; obrigatorio: boolean }[]
  linhas: LinhaGrade[]
  registrada: boolean
  semChecklist: boolean
}

function dataNegDeIso(iso: string): DataNegocio {
  return { iso, data: new Date(`${iso}T12:00:00.000Z`), diaSemana: diaDaSemana(iso) }
}

/** Garante a sessão do dia (idempotente) e devolve id + itens (EPIs) congelados. */
async function garantirSessao(turnoId: number, cr: string, dataNeg: DataNegocio) {
  const versao = await versaoPublicadaDoCr(cr)
  if (!versao) return null
  const sessao = await prisma.sessaoTurno.upsert({
    where: { turnoId_data: { turnoId, data: dataNeg.data } },
    update: {},
    create: { turnoId, checklistVersaoId: versao.id, data: dataNeg.data, token: gerarToken(), status: "ABERTA" },
  })
  const vs = await prisma.checklistVersao.findUnique({ where: { id: sessao.checklistVersaoId }, select: { itens: true } })
  return { sessaoId: sessao.id, itens: (vs?.itens as unknown as ItemChecklist[]) ?? [] }
}

/** Grade de preenchimento do líder: colaboradores × EPIs, com o já respondido. */
export async function getGradeUtilizacao(
  turnoId: number,
  dataIso: string,
  escopo: EscopoUsuario,
): Promise<GradeUtilizacao | null> {
  if (!noEscopo(escopo, turnoId)) return null
  const turno = await prisma.turno.findUnique({
    where: { id: turnoId },
    select: { id: true, nome: true, cr: true, cliente: { select: { nome: true } } },
  })
  if (!turno) return null

  const dataNeg = dataNegDeIso(dataIso)
  const garantida = await garantirSessao(turno.id, turno.cr, dataNeg)
  const base = { turnoId: turno.id, turnoNome: turno.nome, cr: turno.cr, clienteNome: turno.cliente.nome, dataIso }
  if (!garantida) return { ...base, epis: [], linhas: [], registrada: false, semChecklist: true }

  const [roster, respostas, validacao] = await Promise.all([
    getLideradosDoTurno(turno.id, turno.cr),
    prisma.respostaEpi.findMany({ where: { sessaoId: garantida.sessaoId } }),
    prisma.validacaoSessao.findUnique({ where: { sessaoId: garantida.sessaoId }, select: { id: true } }),
  ])

  const respPorHash = new Map(respostas.map((r) => [r.cpfHash, r]))
  const hashes = new Set<string>([...roster.map((c) => c.cpfHash), ...respPorHash.keys()])
  const linhas: LinhaGrade[] = Array.from(hashes)
    .map((h) => {
      const r = respPorHash.get(h)
      const q = roster.find((c) => c.cpfHash === h)
      const respMap: Record<string, boolean> = {}
      if (r && Array.isArray(r.respostas)) {
        for (const it of r.respostas as { epiId?: string; itemId?: string; conforme?: boolean }[]) {
          const id = it.epiId ?? it.itemId
          if (id) respMap[id] = it.conforme ?? false
        }
      }
      return {
        cpfHash: h,
        nome: r?.nome ?? q?.nome ?? "—",
        cargo: r?.cargo ?? q?.cargo ?? null,
        ausente: r?.ausente ?? false,
        respostas: respMap,
      }
    })
    .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"))

  const epis = garantida.itens.map((i) => ({ id: i.id, nome: i.rotulo, obrigatorio: i.obrigatorio }))
  return { ...base, epis, linhas, registrada: validacao != null, semChecklist: false }
}

export type EntradaUtil = { cpfHash: string; ausente: boolean; respostas?: { epiId: string; conforme: boolean }[] }

/** Registra a utilização do dia (upsert por colaborador) + o registro do líder. */
export async function registrarUtilizacao(
  turnoId: number,
  dataIso: string,
  entradas: EntradaUtil[],
  usuario: UsuarioAtual,
  escopo: EscopoUsuario,
): Promise<{ ok: true } | { ok: false; erro: string }> {
  if (!noEscopo(escopo, turnoId)) return { ok: false, erro: "Fora do seu acesso." }
  const turno = await prisma.turno.findUnique({ where: { id: turnoId }, select: { id: true, cr: true } })
  if (!turno) return { ok: false, erro: "Turno não encontrado." }

  const dataNeg = dataNegDeIso(dataIso)
  const garantida = await garantirSessao(turno.id, turno.cr, dataNeg)
  if (!garantida) return { ok: false, erro: "O checklist deste CR ainda não foi publicado." }

  // Uma vez registrado o turno no dia, NÃO pode preencher de novo (trava o dia).
  const jaRegistrado = await prisma.validacaoSessao.findUnique({
    where: { sessaoId: garantida.sessaoId },
    select: { id: true },
  })
  if (jaRegistrado) {
    return { ok: false, erro: "Este turno já foi registrado hoje — não é possível preencher de novo." }
  }

  const roster = await getLideradosDoTurno(turno.id, turno.cr)
  const pessoaPorHash = new Map(roster.map((c) => [c.cpfHash, c]))
  const nomeEpi = new Map(garantida.itens.map((i) => [i.id, i.rotulo]))

  const ops = []
  for (const e of entradas) {
    const pessoa = pessoaPorHash.get(e.cpfHash)
    if (!pessoa) continue // ignora quem não é do turno
    const respostasArmazenar = e.ausente
      ? []
      : (e.respostas ?? [])
          .filter((r) => nomeEpi.has(r.epiId))
          .map((r) => ({ epiId: r.epiId, epi: nomeEpi.get(r.epiId), conforme: r.conforme }))
    const conforme = e.ausente ? false : respostasArmazenar.length > 0 && respostasArmazenar.every((r) => r.conforme)
    ops.push(
      prisma.respostaEpi.upsert({
        where: { sessaoId_cpfHash: { sessaoId: garantida.sessaoId, cpfHash: e.cpfHash } },
        update: { ausente: e.ausente, respostas: respostasArmazenar, conforme, nome: pessoa.nome, cargo: pessoa.cargo, cr: turno.cr },
        create: {
          sessaoId: garantida.sessaoId,
          cpfHash: e.cpfHash,
          nome: pessoa.nome,
          cargo: pessoa.cargo,
          cr: turno.cr,
          ausente: e.ausente,
          respostas: respostasArmazenar,
          conforme,
        },
      }),
    )
  }

  const conteudo = entradas
    .map((e) => `${e.cpfHash}:${e.ausente ? "A" : (e.respostas ?? []).map((r) => `${r.epiId}=${r.conforme ? 1 : 0}`).sort().join(",")}`)
    .sort()
    .join("|")
  const hashConteudo = createHash("sha256").update(conteudo).digest("hex")

  await prisma.$transaction([
    ...ops,
    prisma.validacaoSessao.upsert({
      where: { sessaoId: garantida.sessaoId },
      update: { authUserId: usuario.authUserId ?? "acesso-livre", nomeLider: usuario.nome ?? "—", hashConteudo, validadoEm: new Date() },
      create: { sessaoId: garantida.sessaoId, authUserId: usuario.authUserId ?? "acesso-livre", nomeLider: usuario.nome ?? "—", hashConteudo },
    }),
    prisma.sessaoTurno.update({ where: { id: garantida.sessaoId }, data: { status: "VALIDADA" } }),
  ])

  return { ok: true }
}
