import { inhausPool } from "@/lib/db-inhaus"
import { hmacCpf } from "@/lib/epi/cpf"
import { codigoCr, type EscopoDados } from "@/lib/seguranca/escopo-dados"

/**
 * QUADRO ATIVO de colaboradores para o módulo de EPI.
 *
 * Regra de negócio (em sincronia com o InfoIndicador):
 *  - A fonte é a tabela `ft_colaboradores_sra` (o quadro atual, atualizado
 *    diariamente por upsert), NÃO a fotografia diária congelada. O checklist
 *    reflete o quadro VIVO: admissão aparece sozinha, desligamento some sozinho.
 *  - Ativo = `dt_demissao IS NULL`. Enquanto a RPA não preencher a data de
 *    demissão, todos contam como ativos (registrar isso no info).
 *  - Considera sempre o mês de referência mais recente disponível.
 *  - Identidade = CPF (único, sem nulos). Expomos só o HMAC (`cpfHash`), nunca o
 *    CPF em claro. A matrícula é informativa (colide entre CRs).
 *
 * Módulo server-only.
 */

export type ColaboradorAtivo = {
  cpfHash: string
  nome: string
  cargo: string | null
  matricula: string | null
  cr: string
}

export type CrDisponivel = {
  cr: string
  ativos: number
  /** Cliente (grupo) do contrato, derivado do código do CR via dm_cr. Null = sem match. */
  cliente: string | null
}

/** Mês de referência mais recente na tabela do quadro atual. */
async function mesReferenciaAtual(): Promise<string | null> {
  const r = await inhausPool.query(
    "select max(mes_referencia)::text m from ft_colaboradores_sra",
  )
  return r.rows[0]?.m ?? null
}

/**
 * Lista os colaboradores ATIVOS de um CR (quadro atual, dt_demissao IS NULL).
 * Calcula o `cpfHash` de cada um no servidor — o CPF em claro não sai daqui.
 */
export async function getQuadroAtivoPorCr(
  cr: string,
  escopo: EscopoDados = { tipo: "todos" },
): Promise<ColaboradorAtivo[]> {
  // Barreira de dados: se o usuário tem escopo restrito e o CR pedido não está
  // nele, não devolve ninguém (defesa em profundidade — a rota já é de Segurança).
  if (escopo.tipo === "lista") {
    const cod = codigoCr(cr)
    if (!cod || !escopo.crs.includes(cod)) return []
  }
  const r = await inhausPool.query(
    `select cpf, nome, descricao_funcao, matricula
       from ft_colaboradores_sra
      where cr = $1
        and dt_demissao is null
        and mes_referencia = (select max(mes_referencia) from ft_colaboradores_sra)
      order by nome`,
    [cr],
  )
  return r.rows
    .filter((row) => typeof row.cpf === "string" && row.cpf.length > 0)
    .map((row) => ({
      cpfHash: hmacCpf(row.cpf),
      nome: row.nome ?? "",
      cargo: row.descricao_funcao ?? null,
      matricula: row.matricula ?? null,
      cr,
    }))
}

/**
 * CRs disponíveis (quadro atual) para o admin mapear a um cliente, com a
 * contagem de ativos. Útil na tela de configuração de Cliente/CR.
 */
export async function listarCrsDisponiveis(): Promise<CrDisponivel[]> {
  // O cliente vem da dm_cr (mesma base Postgres): casa o CÓDIGO do CR — os
  // caracteres antes do primeiro " - " no CR da SRA — com dm_cr.cr (5 chars,
  // numéricos com menos são zero-padeados, igual à importação).
  const r = await inhausPool.query(
    `select s.cr,
            count(*)::int ativos,
            max(d.nome_grp_cliente) as cliente
       from ft_colaboradores_sra s
       left join dm_cr d
         on d.cr = case
                     when length(split_part(btrim(s.cr), ' - ', 1)) < 5
                       then lpad(split_part(btrim(s.cr), ' - ', 1), 5, '0')
                     else split_part(btrim(s.cr), ' - ', 1)
                   end
      where s.dt_demissao is null
        and s.cr is not null
        and s.mes_referencia = (select max(mes_referencia) from ft_colaboradores_sra)
      group by s.cr
      order by s.cr`,
  )
  return r.rows.map((row) => ({ cr: row.cr, ativos: row.ativos, cliente: row.cliente ?? null }))
}

/** Só para conferência/health-check: o mês do quadro atual. */
export { mesReferenciaAtual }
