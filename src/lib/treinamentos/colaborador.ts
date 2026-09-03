import { inhausPool } from "@/lib/db-inhaus"
import { hmacCpf, normalizarCpf } from "@/lib/epi/cpf"

/**
 * Resolução de colaborador para o módulo de TREINAMENTOS.
 *
 * Regra de negócio (em sincronia com o InfoIndicador):
 *  - A fonte é o HISTÓRICO DIÁRIO da SRA (`ft_colaboradores_sra_diario`), que guarda
 *    uma fotografia por dia de TODAS as regionais — não só o quadro do mês corrente.
 *  - Casa o CPF em QUALQUER dia do histórico (não só no quadro ativo). Assim quem já
 *    foi desligado também é reconhecido — o que importa é ter feito o treinamento. De
 *    cada pessoa usamos o registro MAIS RECENTE (data_referencia máxima) para o snapshot.
 *  - NÃO há amarra por CR: qualquer CPF válido é aceito. O CR real do colaborador
 *    entra no snapshot da presença só para DISTINGUIR de onde a pessoa é.
 *  - Identidade = HMAC do CPF; o CPF em claro nunca sai daqui.
 *  - CPF não encontrado em nenhum dia → devolve null (a presença é gravada mesmo assim,
 *    marcada como "não localizado na SRA").
 *
 * Módulo server-only.
 */

export type ColaboradorSra = {
  cpfHash: string
  nome: string
  cargo: string | null
  matricula: string | null
  crCod: string | null
  crNome: string
}

/** Código de 5 chars do CR a partir do texto da SRA ("01234 - NOME"). Null se vazio. */
export function codigoDoCrSra(crBruto: string | null): string | null {
  if (!crBruto) return null
  const parte = crBruto.trim().split(" - ")[0]?.trim() ?? ""
  if (!parte) return null
  return parte.length < 5 ? parte.padStart(5, "0") : parte
}

/**
 * Resolve um colaborador pelo CPF (em claro), buscando em TODO o histórico diário da
 * SRA — inclusive dias antigos e pessoas já desligadas. De cada pessoa usa o registro
 * mais recente (data_referencia máxima). Devolve null se o CPF nunca apareceu em nenhum
 * dia. O `cpfHash` é sempre calculado no servidor — quem chama grava o hash mesmo quando
 * o colaborador é null.
 */
export async function resolverColaboradorPorCpf(cpf: string): Promise<ColaboradorSra | null> {
  const digitos = normalizarCpf(cpf)
  const r = await inhausPool.query(
    `select cpf, nome, descricao_funcao, matricula, cr
       from ft_colaboradores_sra_diario
      where regexp_replace(cpf, '\\D', '', 'g') = $1
      order by data_referencia desc
      limit 1`,
    [digitos],
  )
  const row = r.rows[0]
  if (!row) return null
  return {
    cpfHash: hmacCpf(digitos),
    nome: row.nome ?? "",
    cargo: row.descricao_funcao ?? null,
    matricula: row.matricula ?? null,
    crCod: codigoDoCrSra(row.cr ?? null),
    crNome: (row.cr ?? "").trim(),
  }
}
