import { z } from "zod"

/**
 * Contratos de entrada do módulo de EPI (validação com zod).
 *
 * Centraliza a validação de tudo que é escrito — telas de configuração (admin/
 * parametrizador) e a rota PÚBLICA do QR (input não confiável). Nenhuma escrita
 * entra sem passar por um destes schemas.
 */

const textoObrigatorio = (rotulo: string) =>
  z.string().trim().min(1, `${rotulo} é obrigatório`)

// ---- Configuração (admin) -------------------------------------------------

export const clienteSchema = z.object({
  nome: textoObrigatorio("Nome do cliente"),
})

export const clienteUpdateSchema = z
  .object({
    nome: z.string().trim().min(1).optional(),
    ativo: z.boolean().optional(),
  })
  .refine((v) => v.nome !== undefined || v.ativo !== undefined, "Nada para atualizar")

export const turnoUpdateSchema = z
  .object({
    nome: z.string().trim().min(1).optional(),
    diasSemana: z.array(z.number().int().min(0).max(6)).min(1).optional(),
    ativo: z.boolean().optional(),
  })
  .refine(
    (v) => v.nome !== undefined || v.diasSemana !== undefined || v.ativo !== undefined,
    "Nada para atualizar",
  )

export const desalocarSchema = z.object({
  cpfHash: textoObrigatorio("Colaborador"),
  cr: textoObrigatorio("CR"),
})

export const clienteCrSchema = z.object({
  clienteId: z.number().int().positive(),
  cr: textoObrigatorio("CR"),
})

// Fluxo do assistente: escolher o CR resolve o cliente (via dm_cr). O usuário não
// digita cliente — só manda o CR e o backend deriva/cria o Cliente.
export const setorPorCrSchema = z.object({
  cr: textoObrigatorio("Setor (CR)"),
})

export const turnoSchema = z.object({
  clienteId: z.number().int().positive(),
  cr: textoObrigatorio("CR"),
  nome: textoObrigatorio("Nome do turno"),
  // 0 = domingo … 6 = sábado. Dias em que o turno espera preenchimento.
  diasSemana: z.array(z.number().int().min(0).max(6)).min(1, "Escolha ao menos um dia"),
})

export const responsavelTurnoSchema = z.object({
  turnoId: z.number().int().positive(),
  authUserId: textoObrigatorio("Usuário do líder"),
  nome: textoObrigatorio("Nome do líder"),
})

export const liderCrsSchema = z.object({
  clienteId: z.number().int().positive(),
  authUserId: textoObrigatorio("Usuário do líder"),
  nome: textoObrigatorio("Nome do líder"),
  crs: z.array(z.string().trim().min(1)).min(1, "Escolha ao menos um setor"),
  modo: z.enum(["substituir", "adicionar"]).default("substituir"),
})

export const removerLiderSchema = z.object({
  clienteId: z.number().int().positive(),
  authUserId: textoObrigatorio("Usuário do líder"),
})

// Nomear/remover líder por CR (o CR vem da base; o cliente é resolvido por ela).
export const nomearLiderCrSchema = z.object({
  cr: textoObrigatorio("CR"),
  authUserId: textoObrigatorio("Usuário do líder"),
  nome: textoObrigatorio("Nome do líder"),
})

export const removerLiderCrSchema = z.object({
  cr: textoObrigatorio("CR"),
  authUserId: textoObrigatorio("Usuário do líder"),
})

export const membroEpiSchema = z.object({
  authUserId: textoObrigatorio("Usuário"),
  papel: z.enum(["PARAMETRIZADOR", "LIDER"]),
  clienteId: z.number().int().positive().nullable().optional(),
  cr: z.string().trim().min(1).nullable().optional(),
})

// ---- Checklist versionado -------------------------------------------------

export const itemChecklistSchema = z.object({
  id: textoObrigatorio("Id do item"),
  rotulo: textoObrigatorio("Pergunta do item"),
  epi: z.string().trim().optional(),
  obrigatorio: z.boolean(),
})

export const checklistTemplateSchema = z.object({
  nome: textoObrigatorio("Nome do checklist"),
})

export const checklistTemplateUpdateSchema = z.object({
  nome: textoObrigatorio("Nome do checklist"),
})

export const vincularChecklistSchema = z.object({
  cr: textoObrigatorio("CR"),
  checklistTemplateId: z.number().int().positive().nullable(),
})

export const checklistVersaoSchema = z.object({
  templateId: z.number().int().positive(),
  itens: z.array(itemChecklistSchema).min(1, "O checklist precisa de ao menos um item"),
})

// ---- Atribuição de turno (parametrizador) ---------------------------------

export const atribuirLoteSchema = z.object({
  turnoId: z.number().int().positive(),
  cr: textoObrigatorio("CR"),
  colaboradores: z
    .array(
      z.object({
        cpfHash: textoObrigatorio("Identificador do colaborador"),
        matricula: z.string().trim().nullable().optional(),
      }),
    )
    .min(1, "Selecione ao menos um colaborador"),
})

// ---- Rota pública (preenchimento do liderado) -----------------------------

export const respostaItemSchema = z.object({
  itemId: textoObrigatorio("Item"),
  conforme: z.boolean(),
})

export const responderSchema = z.object({
  token: textoObrigatorio("Sessão"),
  // Identificador (hash) da pessoa selecionada na lista do turno.
  pessoa: textoObrigatorio("Selecione seu nome"),
  // CPF em claro só trafega no corpo do POST (nunca na URL); é convertido em hash
  // imediatamente e nunca persistido em claro.
  cpf: z.string().trim().regex(/^\D*(\d\D*){11}$/, "Informe os 11 dígitos do CPF"),
  respostas: z.array(respostaItemSchema).min(1, "Responda o checklist"),
})

// ---- Validação do líder ---------------------------------------------------

export const validarSessaoSchema = z.object({
  token: textoObrigatorio("Sessão"),
})

export const validarSessaoIdSchema = z.object({
  sessaoId: z.number().int().positive(),
  presencas: z
    .array(z.object({ cpfHash: z.string().trim().min(1), presente: z.boolean() }))
    .default([]),
})

export type ItemChecklist = z.infer<typeof itemChecklistSchema>
export type RespostaItem = z.infer<typeof respostaItemSchema>
