import { prisma } from "@/lib/prisma"
import { getQuadroAtivoPorCr, type ColaboradorAtivo } from "@/lib/epi/colaboradores"
import { codigoCr } from "@/lib/seguranca/escopo-dados"

/**
 * ATRIBUIÇÃO de colaboradores a turnos.
 *
 * Regra de negócio central:
 *  - A PRESENÇA do liderado no checklist é derivada AO VIVO do quadro ativo do CR
 *    (ft_colaboradores_sra, dt_demissao null). Esta camada só resolve EM QUAL
 *    turno cada ativo está.
 *  - Um colaborador ativo pode estar atribuído a NO MÁXIMO um turno vigente por
 *    vez (ele preenche 1× por dia). Reatribuir encerra a atribuição anterior.
 *  - Ativo do CR SEM atribuição vigente = "não alocado" → sinalizado para o
 *    PARAMETRIZADOR.
 *  - Encerrar usa vigência (fimEm), nunca delete, para preservar o histórico.
 *
 * Módulo server-only.
 */

export type LinhaAlocacao = {
  colaborador: ColaboradorAtivo
  turnoId: number | null
}

/** Mapa cpfHash -> turnoId das atribuições VIGENTES de um CR. */
async function atribuicoesVigentesPorCr(cr: string): Promise<Map<string, number>> {
  const linhas = await prisma.atribuicaoTurno.findMany({
    where: { cr, fimEm: null },
    select: { cpfHash: true, turnoId: true },
  })
  const mapa = new Map<string, number>()
  for (const l of linhas) mapa.set(l.cpfHash, l.turnoId)
  return mapa
}

/**
 * Painel de alocação de um CR: cada colaborador ativo com o turno em que está
 * (ou null = não alocado). Alimenta a tela do parametrizador.
 */
export async function getPainelAlocacao(cr: string): Promise<LinhaAlocacao[]> {
  const [quadro, vigentes] = await Promise.all([
    getQuadroAtivoPorCr(cr),
    atribuicoesVigentesPorCr(cr),
  ])
  return quadro.map((colaborador) => ({
    colaborador,
    turnoId: vigentes.get(colaborador.cpfHash) ?? null,
  }))
}

/** Colaboradores ativos do CR sem turno vigente (lista "não alocados"). */
export async function getNaoAlocadosDoCr(cr: string): Promise<ColaboradorAtivo[]> {
  const painel = await getPainelAlocacao(cr)
  return painel.filter((l) => l.turnoId == null).map((l) => l.colaborador)
}

/** Liderados de um turno = ativos do CR atribuídos àquele turno (ao vivo). */
export async function getLideradosDoTurno(turnoId: number, cr: string): Promise<ColaboradorAtivo[]> {
  const painel = await getPainelAlocacao(cr)
  return painel.filter((l) => l.turnoId === turnoId).map((l) => l.colaborador)
}

/**
 * Atribui (em lote) colaboradores a um turno. Para cada um, encerra a atribuição
 * vigente que porventura exista (em qualquer turno do CR) e cria a nova. Se já
 * estiver no turno alvo, não faz nada. Roda numa transação.
 */
export async function atribuirColaboradores(
  turnoId: number,
  cr: string,
  colaboradores: { cpfHash: string; matricula: string | null }[],
): Promise<{ atribuidos: number }> {
  if (colaboradores.length === 0) return { atribuidos: 0 }
  const vigentes = await atribuicoesVigentesPorCr(cr)

  const paraCriar = colaboradores.filter((c) => vigentes.get(c.cpfHash) !== turnoId)
  const hashesParaEncerrar = paraCriar
    .filter((c) => vigentes.has(c.cpfHash))
    .map((c) => c.cpfHash)

  await prisma.$transaction([
    ...(hashesParaEncerrar.length > 0
      ? [
          prisma.atribuicaoTurno.updateMany({
            where: { cr, fimEm: null, cpfHash: { in: hashesParaEncerrar } },
            data: { fimEm: new Date() },
          }),
        ]
      : []),
    ...(paraCriar.length > 0
      ? [
          prisma.atribuicaoTurno.createMany({
            data: paraCriar.map((c) => ({
              turnoId,
              cr,
              crCod: codigoCr(cr),
              cpfHash: c.cpfHash,
              matricula: c.matricula,
            })),
          }),
        ]
      : []),
  ])

  return { atribuidos: paraCriar.length }
}

/** Encerra a atribuição vigente de um colaborador no CR (volta a "não alocado"). */
export async function desalocarColaborador(cpfHash: string, cr: string): Promise<void> {
  await prisma.atribuicaoTurno.updateMany({
    where: { cr, cpfHash, fimEm: null },
    data: { fimEm: new Date() },
  })
}
