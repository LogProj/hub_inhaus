import { z } from "zod"

/** Nome não vazio (após trim). */
const nomeObrigatorio = z.string().trim().min(1, "Informe o nome")

export const criarTreinamentoSchema = z.object({
  nome: nomeObrigatorio,
  // Aceita "YYYY-MM-DD" (input date). Guardado como dia, sem hora.
  data: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida"),
  duracaoHoras: z.coerce.number().positive("Duração deve ser maior que zero").max(99.99),
  responsavelId: z.string().min(1, "Selecione um responsável"),
})
export type CriarTreinamento = z.infer<typeof criarTreinamentoSchema>

/** Edição de um treinamento: mesmos campos da criação (todos obrigatórios). */
export const editarTreinamentoSchema = criarTreinamentoSchema
export type EditarTreinamento = z.infer<typeof editarTreinamentoSchema>

export const responsavelSchema = z.object({ nome: nomeObrigatorio })

/** CPF do formulário público: valida só o formato (11 dígitos), não o dígito verificador. */
export const confirmarPresencaSchema = z.object({
  cpf: z.string().refine((v) => v.replace(/\D/g, "").length === 11, "CPF deve ter 11 dígitos"),
})

export const encerrarSchema = z.object({ status: z.literal("ENCERRADO") })

/** Corpo do PATCH: encerrar (status) OU editar os dados do treinamento. */
export const atualizarTreinamentoSchema = z.union([encerrarSchema, editarTreinamentoSchema])
