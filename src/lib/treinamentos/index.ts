import { prisma } from "@/lib/prisma"
import { gerarToken } from "@/lib/epi/tokens"
import { resolverColaboradorPorCpf } from "@/lib/treinamentos/colaborador"
import { hmacCpf, normalizarCpf } from "@/lib/epi/cpf"

/**
 * Regras de negócio do módulo de TREINAMENTOS.
 *
 *  - Um treinamento tem nome, data (dia), duração (horas) e um RESPONSÁVEL escolhido
 *    de uma lista própria do módulo (`treinamento_responsavel`).
 *  - Cada treinamento carrega um TOKEN público estável (o QR aponta para /t/<token>).
 *  - PRESENÇA: 1 por pessoa por treinamento (unique treinamento_id + cpf_hash). Confirmar
 *    o mesmo CPF de novo é idempotente (não duplica).
 *  - Enquanto o treinamento está ABERTO aceita presença; ENCERRADO recusa.
 *  - Sem amarra por CR: qualquer CPF válido confirma; o CR entra no snapshot só para
 *    distinguir. CPF fora do quadro ativo é gravado com localizadoNaSra=false.
 *
 * Módulo server-only.
 */

export async function listarResponsaveis() {
  return prisma.treinamentoResponsavel.findMany({
    where: { ativo: true },
    orderBy: { nome: "asc" },
  })
}

export async function adicionarResponsavel(nome: string) {
  return prisma.treinamentoResponsavel.create({ data: { nome } })
}

/** Soft-delete: some do dropdown, mas os treinamentos antigos continuam apontando. */
export async function removerResponsavel(id: string) {
  return prisma.treinamentoResponsavel.update({ where: { id }, data: { ativo: false } })
}

export async function listarTreinamentos() {
  const linhas = await prisma.treinamento.findMany({
    orderBy: { data: "desc" },
    include: { responsavel: true, _count: { select: { presencas: true } } },
  })
  return linhas.map((t) => ({
    id: t.id,
    nome: t.nome,
    data: t.data,
    duracaoHoras: Number(t.duracaoHoras),
    responsavel: t.responsavel.nome,
    responsavelId: t.responsavelId,
    status: t.status,
    tokenPublico: t.tokenPublico,
    presencas: t._count.presencas,
  }))
}

export async function criarTreinamento(entrada: {
  nome: string
  data: string
  duracaoHoras: number
  responsavelId: string
  criadoPorId: string | null
}) {
  return prisma.treinamento.create({
    data: {
      nome: entrada.nome,
      data: new Date(entrada.data),
      duracaoHoras: entrada.duracaoHoras,
      responsavelId: entrada.responsavelId,
      criadoPorId: entrada.criadoPorId,
      tokenPublico: gerarToken(),
    },
  })
}

export async function editarTreinamento(
  id: string,
  entrada: { nome: string; data: string; duracaoHoras: number; responsavelId: string },
) {
  return prisma.treinamento.update({
    where: { id },
    data: {
      nome: entrada.nome,
      data: new Date(entrada.data),
      duracaoHoras: entrada.duracaoHoras,
      responsavelId: entrada.responsavelId,
    },
  })
}

export async function encerrarTreinamento(id: string) {
  return prisma.treinamento.update({ where: { id }, data: { status: "ENCERRADO" } })
}

export async function getTreinamentoComPresencas(id: string) {
  const t = await prisma.treinamento.findUnique({
    where: { id },
    include: {
      responsavel: true,
      presencas: { orderBy: { confirmadoEm: "asc" } },
    },
  })
  if (!t) return null
  return {
    id: t.id,
    nome: t.nome,
    data: t.data,
    duracaoHoras: Number(t.duracaoHoras),
    responsavel: t.responsavel.nome,
    responsavelId: t.responsavelId,
    status: t.status,
    tokenPublico: t.tokenPublico,
    presencas: t.presencas,
  }
}

export type ResolucaoPublica =
  | { estado: "encerrado" }
  | { estado: "ok"; treinamento: { id: string; nome: string; data: Date } }

/** O que a página pública deve mostrar para um token. Null = token inexistente (404). */
export async function resolverTreinamentoPublico(token: string): Promise<ResolucaoPublica | null> {
  const t = await prisma.treinamento.findUnique({ where: { tokenPublico: token } })
  if (!t) return null
  if (t.status === "ENCERRADO") return { estado: "encerrado" }
  return { estado: "ok", treinamento: { id: t.id, nome: t.nome, data: t.data } }
}

export type ResultadoConfirmacao =
  | { estado: "encerrado" }
  | { estado: "confirmado"; nome: string; jaEstava: boolean; localizado: boolean }

/**
 * Só o PRIMEIRO nome, capitalizado. A confirmação é uma rota pública (só precisa do
 * link do QR): devolver o nome completo permitiria varrer CPFs e colher o nome inteiro
 * de qualquer pessoa do quadro. O primeiro nome basta para a saudação e vaza bem menos.
 */
function primeiroNome(nome: string | null): string {
  const limpo = (nome ?? "").trim()
  if (!limpo) return "colaborador"
  const p = limpo.split(/\s+/)[0]
  return p.charAt(0).toUpperCase() + p.slice(1).toLowerCase()
}

/**
 * Confirma a presença pelo token público + CPF. Idempotente: se a pessoa já confirmou,
 * devolve jaEstava=true sem duplicar. CPF fora do quadro grava localizadoNaSra=false.
 */
export async function confirmarPresenca(
  token: string,
  cpf: string,
): Promise<ResultadoConfirmacao | null> {
  const t = await prisma.treinamento.findUnique({ where: { tokenPublico: token } })
  if (!t) return null
  if (t.status === "ENCERRADO") return { estado: "encerrado" }

  const colaborador = await resolverColaboradorPorCpf(cpf)
  const cpfHash = colaborador?.cpfHash ?? hmacCpf(cpf)

  const existente = await prisma.treinamentoPresenca.findUnique({
    where: { treinamentoId_cpfHash: { treinamentoId: t.id, cpfHash } },
  })
  if (existente) {
    return {
      estado: "confirmado",
      nome: primeiroNome(existente.nomeColab),
      jaEstava: true,
      localizado: existente.localizadoNaSra,
    }
  }

  try {
    const criada = await prisma.treinamentoPresenca.create({
      data: {
        treinamentoId: t.id,
        cpfHash,
        nomeColab: colaborador?.nome ?? null,
        crCod: colaborador?.crCod ?? null,
        crNome: colaborador?.crNome ?? null,
        cargo: colaborador?.cargo ?? null,
        matricula: colaborador?.matricula ?? null,
        localizadoNaSra: colaborador !== null,
        // Guarda o CPF em claro SÓ de quem não foi localizado — é o único jeito de o
        // RH identificar depois quem é. Para localizados fica null.
        cpfTexto: colaborador === null ? normalizarCpf(cpf) : null,
      },
    })
    return {
      estado: "confirmado",
      nome: primeiroNome(criada.nomeColab),
      jaEstava: false,
      localizado: criada.localizadoNaSra,
    }
  } catch (e) {
    // Corrida: dois POSTs do mesmo CPF passaram juntos pelo findUnique acima e o
    // segundo bateu no unique (treinamentoId + cpfHash). Tratamos como "já estava"
    // em vez de erro — o dado continua com 1 presença só.
    if ((e as { code?: string })?.code === "P2002") {
      const jaCriada = await prisma.treinamentoPresenca.findUnique({
        where: { treinamentoId_cpfHash: { treinamentoId: t.id, cpfHash } },
      })
      if (jaCriada) {
        return {
          estado: "confirmado",
          nome: primeiroNome(jaCriada.nomeColab),
          jaEstava: true,
          localizado: jaCriada.localizadoNaSra,
        }
      }
    }
    throw e
  }
}
