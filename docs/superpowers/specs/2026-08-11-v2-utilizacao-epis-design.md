# v2 — Utilização de EPIs (o líder preenche por colaborador)

**Data:** 2026-08-11 · Base: tag `v1-epi-liderado`.

Muda o **quem preenche**: sai o liderado (QR + CPF), entra o **líder**, que responde o
checklist **por colaborador** do seu CR+turno, marcando por EPI **Conforme / Não
Conforme** ou o colaborador como **Ausente**.

## Conceito
- **Checklist = lista de EPIs** (capacete, luva, botina…), parametrizada pela Segurança
  na aba **Checklists** e vinculada ao CR (como hoje).
- **Preenchimento diário pelo líder**: para cada colaborador do CR+turno, no dia:
  - **Ausente** (linha inteira; não preenche EPI), **ou**
  - por EPI, **Conforme / Não Conforme**.
  - Uma submissão por **turno/dia** (idempotente).

## Telas
1. **Checklists** (Segurança): parametriza **EPIs**. O campo "pergunta/item" vira "EPI";
   remove o campo "EPI (opcional)". Mantém versionamento (editar publicado = nova versão).
2. **Utilização de EPIs** (líder) — substitui "Validações" (`/dashboards/epi/utilizacao`):
   escolhe **turno** (dos que lidera) + **dia** (hoje por padrão) → grade
   **colaboradores × EPIs** com Conforme/Não Conforme por célula e **Ausente** por linha;
   botão **Registrar**. Idempotente (reabrir mostra o já preenchido).
3. **Configurar**: remove o passo de **QR** no final. Demais passos inalterados.
4. **Sidebar**: "Validações" → **"Utilização de EPIs"** (item do líder; Segurança/admin
   também veem).
5. **Acompanhamento** (Fase B): aderência = colaboradores respondidos ÷ esperados; não
   conformidade = EPI não conforme; **ausência** vira métrica informativa; "pendência do
   líder" = turno/dia esperado **sem registro**.

## Modelo de dados (aditivo; SQL manual `prisma/sql/007_epi_utilizacao.sql`)
- `epi_resposta`: **+ `ausente BOOLEAN NOT NULL DEFAULT false`**.
  - Presente → `respostas` = `[{ epiId, epi, conforme }]`; `conforme` = todos conformes.
  - Ausente → `ausente=true`, `respostas=[]`, `conforme=false`.
  - Quem preenche a linha agora é o **líder** (não o próprio colaborador).
- `epi_checklist_versao.itens`: itens representam **EPIs** (`{ id, rotulo, obrigatorio }`,
  onde `rotulo` = nome do EPI). Sem mudança estrutural.
- `SessaoTurno`: container do dia (turno+data, único). Criada quando o líder abre o dia.
  `token` continua existindo (interno), mas não há link público.
- `ValidacaoSessao`: vira o **registro do líder** (authUserId + nome + hashConteudo +
  quando). É o fechamento da submissão diária.

## Removido / aposentado (preservado na tag v1)
- Rotas `src/app/p/[token]/` (page + responder).
- Componentes `PreenchimentoPublico.tsx`, `QrLinkPublico.tsx`; passo de QR no assistente.
- `PresencaSessao` deixa de ser escrita (presença = `!ausente` na resposta). A tabela
  permanece (histórico v1), sem uso novo.
- `middleware.ts`: remove a liberação pública de `/p`.

## Backend (novas funções em `src/lib/epi/`)
- Resolver/criar a **sessão do dia** de um turno (idempotente) para o líder — reaproveita
  a lógica de `sessao.ts` (congela a versão publicada do checklist).
- `getGradeUtilizacao(turnoId, data)`: roster ativo do CR ∩ atribuição do turno, unido às
  respostas já registradas (por colaborador: ausente ou EPIs).
- `registrarUtilizacao(turnoId, data, respostasPorColaborador, lider)`: grava as respostas
  (upsert por `(sessaoId, cpfHash)`), marca `ausente`, e grava/atualiza `ValidacaoSessao`.
- Guarda: `guardaValidador` (líder do turno ou admin/Segurança) — renomeada no conceito
  para "quem registra a utilização".

## Faseamento
- **Fase A:** EPIs em Checklists + coluna `ausente` + tela **Utilização de EPIs** +
  remoção do fluxo público.
- **Fase B:** adaptar o painel de **Acompanhamento** ao novo modelo.

## Verificação
`npx tsc --noEmit`, `npm run build`, e Playwright na tela de Utilização (grade,
Conforme/Não Conforme/Ausente, Registrar) com dados de teste.
