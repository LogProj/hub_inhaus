/**
 * MÓDULO DE EPI — Controle de utilização de EPI.
 *
 * REGRAS DE NEGÓCIO (fonte de verdade; manter em sincronia com os textos de
 * InfoIndicador das telas):
 *
 *  Papéis:
 *    - ADMIN configura clientes, CRs, turnos, líderes e checklists.
 *    - PARAMETRIZADOR aloca os colaboradores ativos nos turnos e parametriza.
 *    - LIDER valida o turno pelo qual é responsável (1 validação por turno/dia).
 *
 *  Quadro de colaboradores:
 *    - A lista de liderados é DERIVADA AO VIVO do quadro ativo do CR (tabela
 *      ft_colaboradores_sra, dt_demissao IS NULL). Admissão aparece sozinha,
 *      desligamento some sozinho. Nunca é congelada.
 *    - Identidade = HMAC do CPF (cpf_hash). CPF nunca em claro, nunca na URL.
 *      Matrícula é informativa (colide entre CRs).
 *    - Ativo do CR sem turno vigente = "não alocado" (sinalizado ao parametrizador).
 *
 *  Fluxo de campo:
 *    - Cada colaborador preenche 1× por dia, no turno em que está alocado.
 *    - O liderado acessa por QR/link público por sessão; identifica-se escolhendo
 *      o nome do turno e digitando o CPF (conferido por hash).
 *    - Respostas são CONFORME / NÃO CONFORME. Não conformidade apenas registra e
 *      sinaliza (não bloqueia, não exige tratativa).
 *    - A resposta congela um snapshot (nome/cargo/CR) no momento em que é gravada
 *      (documento de conformidade não muda quando a SRA muda).
 *    - O líder valida o turno; a validação fecha a sessão e guarda um hash do
 *      conteúdo (base da assinatura futura).
 *
 *  Sessão diária:
 *    - 1 sessão por turno/dia, criada de forma idempotente na primeira leitura do
 *      QR (não por cron). `data` é a data de negócio do turno (turno noturno
 *      pertence ao dia em que começa).
 */

export * from "@/lib/epi/cpf"
export * from "@/lib/epi/colaboradores"
export * from "@/lib/epi/papeis"
export * from "@/lib/epi/escopo"
export * from "@/lib/epi/atribuicao"
export * from "@/lib/epi/schemas"
