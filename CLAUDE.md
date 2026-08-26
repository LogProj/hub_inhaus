# Instruções do projeto — hub_inhaus

Hub de indicadores da In-Haus. Centraliza os indicadores de **Segurança, RH, Qualidade,
Treinamentos e Financeiro** num único ambiente.

Spec de design aprovado: `docs/superpowers/specs/2026-07-27-hub-indicadores-inhaus-design.md`

---

## Direção de design (não negociável)

O hub adota o **mesmo layout e tratamento visual do `hub_amyris`**, recolorido para a
identidade da In-Haus. Decisão do cliente (2026-07-27), depois de ver a primeira versão.

Princípios que não podem ser violados:

1. **Recolorir, não redesenhar.** A estrutura é a do Amyris: hero WebGL, shell com
   sidebar fixa (`w-72`) sobre `bg-inhaus-radial` + topbar com blur, cards de vidro
   (`.glass`), `TiltCard`, gradiente de marca, cantos `rounded-3xl`.
2. **Paleta In-Haus.** `#002443` navy (estrutura, substitui o roxo do Amyris),
   `#027193` teal (acento/ação, da logo), `#F2F3F8` mist (superfície). Gradiente de
   marca `bg-inhaus-grad` (navy→teal). Nada de roxo/lilás em lugar nenhum.
3. **Tipografia igual à do Amyris:** Space Grotesk (display) + Inter (texto).
4. **Marca In-Haus.** A logo In-Haus é a marca principal (`InhausLogo`); use `onDark`
   sobre fundos navy. Não existe mais logo de cliente separada.
5. **Motion do Amyris:** `.reveal` (fade-up escalonado com `.delay-1..5`), `TiltCard`,
   hover com elevação. `prefers-reduced-motion` sempre respeitado (já tratado no
   `globals.css`).
6. **Acessibilidade não é opcional.** Contraste AA, navegação por teclado com foco
   visível, HTML semântico de verdade.

Cores, raios e sombras vêm **sempre** dos tokens do Tailwind (`bg-navy`, `text-teal`,
`bg-inhaus-grad`, `.glass`, `.eyebrow`, `shadow-glow`, etc.), definidos em
`tailwind.config.ts` e `src/app/globals.css`. Valor hexadecimal solto em componente é
erro de revisão — a única exceção é dentro do shader do `HeroCanvas`.

Referência viva: quando em dúvida sobre um componente, olhe o equivalente em
`C:\Users\fernando.c.souza\Projetos\hub_amyris` e replique a estrutura, trocando as
cores/tokens roxos pelos de navy/teal.

---

## Stack

Next.js 14 (App Router) · TypeScript · Tailwind · shadcn/ui · Prisma + Postgres ·
Recharts · `ogl` (WebGL do hero).

Server Components por padrão. `"use client"` restrito a: hero canvas, shell (drawer
mobile / sessão), `TiltCard`, gráficos e formulário de login.

---

## Fonte de verdade dos domínios

`src/lib/domains.ts` registra os cinco domínios e suas telas numa única estrutura, que
alimenta **ao mesmo tempo** a sidebar, a command palette, a Home e o controle de
permissões. Adicionar ou alterar um indicador significa editar esse arquivo — nunca
duplicar a lista em outro lugar.

---

## Botão "info" dos dashboards — regras de negócio (OBRIGATÓRIO)

**TODO dashboard tem, ao lado do título, um botão "info"** (componente padrão
`src/components/dashboard/InfoIndicador.tsx`) que abre um popover explicando ao usuário,
**em regras de negócio**, o que o painel mostra e **como cada número é calculado**. Não é
opcional: nenhum indicador entra sem esse botão preenchido.

**Regra de manutenção:** SEMPRE que houver qualquer alteração em um indicador — nova
métrica, mudança na lógica de cálculo, filtros, fórmula, período considerado, exclusões
ou o filtro padrão — o texto do **info** daquele dashboard DEVE ser atualizado na MESMA
tarefa. O info nunca pode ficar defasado em relação ao cálculo real.

**Como escrever o info:**
- **Só regras de negócio.** Explique a lógica de cálculo em termos de operação e gestão:
  o que entra na conta, o que é contado uma vez, o que é excluído, qual recorte/período.
- **Bem visual e bem explicado:** frases curtas, bullets, destaque (negrito) no que
  importa, e **um exemplo numérico** sempre que ajudar a entender a conta.
- **Zero termo técnico ou referência de backend.** NUNCA citar tabela, view, coluna, nome
  de campo, SQL, RPA, banco de dados, API ou nome de arquivo. O público é a operação e a
  gestão. Fale de pessoas, quadro, faltas, treinamentos, ocorrências, metas — não de como
  o dado é armazenado ou processado.
- **Mantenha o texto em sincronia com a regra no código** (ex.: o comentário de regra de
  negócio no topo do módulo de dados do indicador).

---

## O que já foi construído (estado atual)

### Rotas e navegação
- `/` → redireciona para `/dashboards`.
- `/login` → tela de login (split cinematográfico). `/home` → landing/hero pública (fora do fluxo).
- `/dashboards` → shell protegido (sidebar fixa + topbar). Visão geral com 5 cards de KPI,
  um por domínio.
- `/dashboards/<dominio>` e `/dashboards/<dominio>/<indicador>` → telas dos 5 domínios.
  Todas existem; as que ainda não têm dados usam o painel `EmConstrucao`.
- `/dashboards/usuarios` → placeholder do admin (conceder acesso/permissões — a construir).
- As rotas dos domínios saem de `src/lib/domains.ts` (fonte de verdade). Cada tela tem
  `icone` (exibido na sidebar antes do nome) e `palavrasChave` (busca da command palette).

### Login
- `src/app/login/page.tsx` — split 50/50. Painel esquerdo com `FluxoCanvas`
  (`src/components/login/FluxoCanvas.tsx`): rede de hubs/rotas com pacotes fluindo, unindo
  logística e tecnologia (canvas 2D, determinístico). `LoginIntro`
  (`src/components/login/LoginIntro.tsx`): abertura cinematográfica da logo, 1× por sessão,
  que migra para a logo do login. Formulário com 2FA, redireciona para `/dashboards`.
- Em modo dev, aparece um botão "Acessar o hub" (ver acesso livre abaixo).

### Shell
- `src/components/dashboard/DashboardShell.tsx` (sidebar branca de vidro + topbar) e
  `DashboardSidebar.tsx` (montada a partir de `DOMINIOS`, um grupo por domínio, ícone por
  tela; item ativo com `bg-inhaus-grad`). Sessão resolvida no layout server
  (`src/app/dashboards/layout.tsx`) e passada por props.

### Autenticação e acesso
- Camada portada do `hub_amyris`: `src/lib/{global-auth,auth-session,db-inhaus,prisma}.ts`,
  `middleware.ts`, `prisma/schema.prisma` (modelo `AuthUser`). Cookies com prefixo `inhaus`.
- **Acesso livre de desenvolvimento** (`src/lib/dev-auth.ts`): com `HUB_ACESSO_LIVRE=1` no
  `.env.local` **e** fora de produção, entra sem `global_auth` como "Visitante" (admin).
  Trava dupla; nunca vale em produção. É como revisar o hub sem credenciais.

### Isolamento de dados por CR / Cliente (multi-tenant)
Recorte de QUAIS dados cada usuário vê, por CR/cliente. Tudo é autorização **local** —
**nada é escrito no `global_auth`** (ligado pelo UUID `authUserId`).
- **Classificação** `INTERNO | CLIENTE` em `auth_users` (`classificacao`). É **ortogonal às
  permissões**: não restringe telas/papéis que o admin concede; serve para rotular externos
  e reforçar o isolamento. `CLIENTE` **nunca** recebe escopo `todos` (nem se marcado admin).
- **Escopo** = vínculos `auth_user_cliente` (grupo `dm_cr.nome_grp_cliente`, herda todos os
  CRs do grupo, inclusive futuros) e/ou `auth_user_cr` (CR avulso, código 5-char = `dm_cr.cr`).
  Sem vínculo e sem admin interno ⇒ **não vê dado** (fail-closed).
- **Gateway obrigatório** `src/lib/seguranca/escopo-dados.ts`: `resolverEscopoDados()` monta o
  `EscopoDados` (`todos` | lista de CRs); **Trava 1** `predicadoSraCr()` injeta o filtro de CR
  em TODA query de dado; **Trava 2** `assertLinhasNoEscopo()` confere a saída e **lança** se
  vazar CR fora do escopo. Todo indicador novo por CR DEVE passar pelas duas.
- **Chave de isolamento** = **código de 5 chars** do CR (`codigoCr`, casa com `dm_cr.cr`).
  Tabelas de dados de EPI têm coluna `cr_cod` (gravada nas escritas; backfill pronto).
- **RLS está DORMENTE** em `prisma/sql/008_isolamento_cr.sql`: a conexão do hub é `postgres`
  (superusuário **ignora RLS**), então a trava efetiva é a aplicação. As policies estão prontas
  para ativar se um dia o hub usar um role não-superusuário (decisão do cliente: não trocar as
  connection strings).
- Concessão na tela **Usuários** (classificação + clientes/CRs); endpoint
  `GET /api/admin/clientes-crs` alimenta os seletores.

### Indicador REAL: Controle de Quadro (`/dashboards/rh/controle-quadro`)
Único indicador ligado a dados reais. Lê a view `vw_sra_geral` (banco `db_inhaus`,
`DATABASE_URL_INHAUS`). Módulo de dados: `src/lib/quadro.ts` (regras de negócio no topo).
- **Gerente regional fixo** = Lucas Rodrigues da Silva (não é filtro).
- **Filtros de múltipla escolha**: Gerente, Centro de Resultado (CR) e Mês
  (`MultiCombobox` pesquisável), e Cargos (`SeletorCargos`, exclusão). Estado na URL
  (params repetidos `ger`, `cr`, `mes`, `excluir`). Selecionar TODAS as opções de um
  dropdown = nenhum filtro (todos). Botão "Limpar filtros". Painel de filtros **suspenso**
  (`FiltrosQuadro`), acionado por um botão; badge conta filtros isolados ativos.
- **Cards** (lado a lado): total de colaboradores (matrícula distinta), desligamentos no
  mês (por data de demissão), e situações (em atividade / férias / afastados).
- **Total por CR** e **Total por cargo**: barras horizontais (`BarrasQuadro`), no último
  dia disponível, top 15 com scroll. O nome do CR aparece inteiro, em uma linha.
- **Quadro ativo por dia**: `LinhaQuadro` — total em cada data de referência (fotografia
  real; não inventa dias sem coleta). **Quadro médio por mês**: média das fotografias do mês.
- Botão **info** (`InfoIndicador`) com todas as regras em linguagem de negócio.

### Módulo de EPI — Controle de utilização de EPI (Fases 0–2 prontas)
Primeiro módulo **transacional** do hub (escreve dados de negócio). Camada em `src/lib/epi/`
(regras no topo de `index.ts`); models `epi_*` no `schema.prisma`, criados por `prisma/sql/001_epi.sql`.
- **Agregado central = SessaoTurno** (cliente + CR + turno + data): N respostas + 1 validação.
  1 sessão por turno/dia (`@@unique`), 1 resposta por pessoa/sessão, 1 validação por sessão.
- **Identidade = HMAC do CPF** (`cpf.ts`, `EPI_CPF_SECRET`). NUNCA CPF em claro nem na URL.
  Matrícula é só informativa (colide entre CRs). A `matricula` da SRA **não identifica pessoa**.
- **Quadro de liderados é DERIVADO AO VIVO** do quadro ativo do CR (`colaboradores.ts`, lê
  `ft_colaboradores_sra` com `dt_demissao IS NULL` — não a `vw_sra_geral`). Admissão aparece,
  desligamento some. `atribuicao.ts` só guarda **em qual turno** a pessoa está; ativo sem turno
  vigente = "não alocado" (sinalizado). Vínculos usam vigência (`fimEm`), nunca delete.
- **Checklist é BIBLIOTECA GLOBAL versionada** (`config.ts`): `ChecklistTemplate` não pertence a
  cliente/CR — é criado uma vez (seção **Checklists**, `/dashboards/epi/checklists`) e **vinculado**
  a qualquer CR (`ClienteCr.checklistTemplateId`), reaproveitável entre clientes. Na tela dá para
  **criar, renomear (PATCH), editar itens** (pré-carrega a versão atual e publica uma nova) e
  **excluir** (soft-delete `ativo=false`; **bloqueado com 409 se vinculado** a algum setor). Editar
  publicado cria versão nova; a antiga fica no histórico. `versaoPublicadaDoCr(cr)` resolve pelo
  vínculo do CR. `POST /api/epi/crs/checklist` vincula; `PATCH/DELETE /api/epi/templates/[id]`.
- **Papéis** (`papeis.ts`/`escopo.ts`): ADMIN (isAdmin global) configura tudo; PARAMETRIZADOR
  aloca. **Líder é por SETOR (CR): `LiderCr`** (cliente+cr+usuário, vigência) — 1 líder responde por
  vários CRs e um CR pode ter vários líderes; ser líder de um CR habilita validar **todos os turnos**
  dele. `getTurnoIdsDoLider` deriva de `LiderCr` (+ `ResponsavelTurno` legado). `podeVerValidacoes(escopo)`
  = admin ou tem turno como líder. Gestão em **`/dashboards/epi/lideres`** (escolhe usuário + multi-CR).
  `escopoDoUsuario()` centraliza QUEM vê os dados de QUEM. Guardas em `guardas.ts` **honram o acesso
  livre** de dev (senão os route handlers dariam 401 em dev).
- **UI para usuário comum (não-dev):** a configuração é um **ASSISTENTE guiado**
  (`/dashboards/epi/configurar`, `AssistenteConfiguracao.tsx`): cliente → setor (CR) → turno +
  líder → checklist → pessoas, um passo por vez, com instrução em cada etapa. **Em lote:** o passo
  de turnos cria VÁRIOS de uma vez; o de checklist VINCULA um da biblioteca (ou cria novo); o de
  pessoas aloca cobrindo os vários turnos (chips de turno por pessoa + "todos para"). O líder é
  **escolhido de uma lista de usuários do hub** (`listarUsuariosHub`), nunca UUID digitado. A
  sidebar do EPI tem **Configurar**, **Checklists**, **Líderes** e **Validações**. As telas granulares antigas
  (clientes/turnos/checklists/alocacoes/membros) continuam existindo, mas fora da navegação.
- **QR Code** (`QrLinkPublico.tsx`, lib `qrcode.react`): ao concluir um setor no assistente (e no
  card de turno) mostra o **QR do link público** `/p/<token>` com copiar / abrir / **imprimir**
  (janela de impressão dedicada). **Dropdowns** (`Combobox`/`MultiCombobox`) renderizam o menu num
  **portal** (`position: fixed`, z-index alto) — não são mais cortados por `overflow` nem ficam
  atrás de cards `.glass` (que criam stacking context via blur).
- Escrita por route handlers `/api/epi/*` (validação **zod** em `schemas.ts`, guardas + padrão de
  erro `{ error }`); `GET /api/epi/colaboradores?cr=` serve o quadro ativo ao assistente.
  Componentes client em `src/components/epi/`.
- **Execução (Fase 2, pronta):** cada turno tem um **token público estável** (`token_publico`),
  usado no QR/link. `sessao.ts` resolve/cria a sessão do dia de forma **idempotente** na 1ª leitura
  (data de negócio America/Sao_Paulo em `datas.ts`; congela a versão publicada do checklist).
  - **Rota pública** `/p/[token]` (fora de `/dashboards`, liberada no `middleware.ts`): liderado
    escolhe o nome do turno + digita CPF (conferido por HMAC) e marca cada item conforme/não conforme.
    POST em `/p/[token]/responder`. A resposta congela snapshot (nome/cargo/CR).
  - **Validação do líder**: `/dashboards/epi/validacoes` (lista do dia no escopo) + `/[id]` (revisão
    visual). A tela lista **TODOS os liderados alocados** (quadro ativo ∩ atribuição) unidos a quem
    preencheu, com status (Conforme / Não conforme / Não preencheu) e um toggle **Presente/Ausente**.
    O líder marca a **presença** de cada um — resolve escalas de revezamento (ex.: **12x36**): só se
    cobra preenchimento de quem estava presente. `validarSessao` grava `PresencaSessao` (por pessoa) +
    `ValidacaoSessao` com `hashConteudo` (base da assinatura futura) e fecha a sessão. Exige ao menos
    **um presente que preencheu**. **Assinatura NÃO capturada por ora.**
  - **Turno tem `diasSemana`** (dias em que espera preenchimento). O assistente tem atalhos "Seg a Sex",
    "Seg a Sáb" e "Todos os dias" — 12x36 usa **Todos os dias** (a presença é resolvida na validação).
- **Falta (Fase 3+):** **indicador** de aderência (validadas ÷ esperadas) e não conformidade por
  tipo de EPI (entra em `domains.ts` no domínio Segurança, com botão info); captura de **assinatura**.

### Módulo Clientes / Desvios (Atlas Copco) + modelo de visibilidade
Primeiro módulo de **cliente** do hub. Handoff completo:
`docs/superpowers/2026-08-25-modulo-clientes-desvios-handoff.md` (LER ao continuar esta frente).
- **Governança em dois eixos:** Eixo 1 = QUAIS telas (`AuthUser.visibleScreens[]` + `isAdmin`);
  Eixo 2 = QUAIS dados. Para os **desvios**, o escopo é **derivado das telas concedidas**
  (`src/lib/desvios/escopo-usuario.ts`) — quem tem as telas de um cliente vê os dados dele.
- **Cliente (classificacao=CLIENTE):** **portal enxuto** — sidebar mostra só as telas dele
  (com a logo do cliente), sem In-Haus/Clientes/domínios/Admin; `/dashboards` redireciona à 1ª
  tela. **Trava central** no `layout.tsx` (via header `x-pathname` do `middleware.ts`) bloqueia
  o CLIENTE de abrir qualquer rota fora das telas dele, mesmo por URL. Só dá para testar em
  **produção** (dev = admin).
- **Sidebar interna:** raiz = Visão Geral · **In-Haus** (áreas internas + EPI) · **Clientes**
  (drill-down cliente→telas) · Administração. Domínios em `domains.ts`: 5 internos + `epi`
  (só no seletor/palette; sidebar do EPI é por papel) + `clientes` (com `clientes[]`).
- **Desvios:** tabela `desvio` (SQL `009`), status `EM_TRATATIVA|PENDENTE|CONCLUIDA`, isolamento
  por contratante com 2 travas (`escopo-contratante.ts`). Telas em
  `/dashboards/clientes/atlas/desvios/{painel,,novo}`. Listas configuráveis por cliente
  (`desvio_opcao`, SQL `010`, `opcoes-cliente.ts`, diálogo admin `ConfiguradorListas`).
- **Tela de Usuários:** seletor de telas **agrupado** (`SeletorTelas`: áreas internas + por
  cliente) + toggle **"É cliente?"**. Removidos os seletores de Clientes/CR/Contratante (o
  back-end de escopo por CR/contratante continua, sem UI).
- Pendências no handoff (§10): isolamento por URL p/ internos não-admin; readicionar seletor de
  CR quando preciso; decidir se EPI migra p/ telas visíveis; validar 2º cliente.

### Componentes reutilizáveis
`src/components/ui/{Combobox,MultiCombobox,button,card,input,label}.tsx`,
`src/components/dashboard/{InfoIndicador,FiltrosQuadro,BarrasQuadro,LinhaQuadro,EmConstrucao}.tsx`,
`src/components/{TiltCard,HeroCanvas}.tsx`, `src/components/site/SiteHeader.tsx`,
`src/components/brand/InhausLogo.tsx`. Formatadores: `src/lib/{format,nomes}.ts`.

### Limitações de dados (importante)
- `dt_demissao` está **vazia em todas as tabelas** do `db_inhaus` hoje → o card de
  desligamentos mostra 0 até essas datas serem preenchidas. A regra (por data de demissão)
  já está pronta.
- A `vw_sra_geral` tem poucas fotografias (`data_referencia`) — a linha do tempo e o quadro
  médio crescem conforme novas coletas entram. Nomes (gerente, CR) vêm em CAIXA ALTA; a
  exibição capitaliza com `tituloNome` mantendo o valor bruto para filtrar.

### Banco de dados — REGRA CRÍTICA (NUNCA `prisma db push`)
O `DATABASE_URL` (Prisma) e o `DATABASE_URL_INHAUS` (SRA) apontam para o **mesmo Postgres
compartilhado** (`db_inhaus`). Esse banco guarda, no schema `public`, tanto as tabelas do hub
(`auth_users`, `epi_*`) quanto as tabelas da **RPA/SRA** (`ft_colaboradores_sra`,
`ft_colaboradores_sra_diario`, `ft_ponto_smartcontrol`, `cfg_cargos_excluidos`).
- **NUNCA rodar `prisma db push` nem `prisma migrate` neste banco.** O Prisma assume ser dono
  do schema inteiro e tenta **DROPAR** as tabelas da SRA (não estão no `schema.prisma`) —
  perda de dados real (dezenas de milhares de linhas). `db:push`/`db:migrate` estão banidos.
- O schema das tabelas do hub é aplicado por **SQL manual idempotente** (`prisma/sql/*.sql`,
  `CREATE TABLE IF NOT EXISTS` + FKs em `DO $$ ... duplicate_object`). Ex.: `prisma/sql/001_epi.sql`.
- Fluxo ao mudar um model: editar `schema.prisma` → escrever o SQL aditivo correspondente em
  `prisma/sql/` → aplicar no banco → `prisma generate` (só gera o Client, não toca no banco).
- O Prisma Client lê/escreve normalmente em tabelas criadas à mão, desde que batam com os models.

### Notas de desenvolvimento
- Rodar: dev server via `.claude/launch.json` (nome `hub-inhaus-dev`, porta 3000). Nunca
  subir servidor por outros meios.
- Se o CSS/HMR "travar" (ex.: erro fantasma `border-border`, estilos stale), **pare o dev
  server, apague `.next` e suba de novo** — o build de produção (`npm run build`) é a fonte
  de verdade; ele valida com SWC igual ao dev.
- Verificação de cada entrega: `npx tsc --noEmit`, `npm run build` e, quando há dado,
  conferência dos números direto no banco antes de considerar pronto.
- `.env.local` (fora do git) guarda `HUB_ACESSO_LIVRE=1`, `DATABASE_URL_INHAUS`, `DATABASE_URL`
  e `EPI_CPF_SECRET` (segredo do HMAC do CPF no módulo de EPI).

### Documentos
- Spec de design: `docs/superpowers/specs/2026-07-27-hub-indicadores-inhaus-design.md`.
- Plano de implementação: `docs/superpowers/plans/2026-07-27-fundacao-visual-hub-inhaus.md`.

---

## Idioma

Toda a interface, os comentários de código e a documentação em **português do Brasil**.
