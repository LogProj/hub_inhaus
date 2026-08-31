import { z } from "zod"

const dataOpcional = z
  .string()
  .trim()
  .optional()
  .nullable()
  .transform((v) => (v ? v : null))

export const criarDesvioSchema = z.object({
  // Responsável interno não é enviado pelo formulário: o hub grava sempre "GPS".
  numeroOtbWbs: z.string().trim().optional().nullable(),
  tipo: z.string().trim().optional().nullable(),
  divisao: z.string().trim().optional().nullable(),
  solicitante: z.string().trim().optional().nullable(),
  dataOcorrencia: dataOpcional,
  clienteFinal: z.string().trim().optional().nullable(),
  motivo: z.string().trim().optional().nullable(),
  causaRaiz: z.string().trim().optional().nullable(),
  resumoCaso: z.string().trim().optional().nullable(),
  solucao: z.string().trim().optional().nullable(),
  status: z.enum(["EM_TRATATIVA", "PENDENTE", "CONCLUIDA"]).default("EM_TRATATIVA"),
  dataFaturamento: dataOpcional,
  dataSeparacao: dataOpcional,
  valor: z.number().nonnegative().optional().nullable(),
})

export const atualizarDesvioSchema = criarDesvioSchema.partial().extend({
  status: z.enum(["EM_TRATATIVA", "PENDENTE", "CONCLUIDA"]).optional(),
})

export type CriarDesvioInput = z.infer<typeof criarDesvioSchema>
