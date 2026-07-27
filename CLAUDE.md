# Instruções do projeto — hub_inhaus

Hub de indicadores da In-Haus. Centraliza os indicadores de **Segurança, RH, Qualidade,
Treinamentos e Financeiro** num único ambiente.

Spec de design aprovado: `docs/superpowers/specs/2026-07-27-hub-indicadores-inhaus-design.md`

---

## Modelo de execução (OBRIGATÓRIO)

**Opus 5 em esforço Alto atua como orquestrador. As tarefas de implementação são
executadas por agentes Sonnet lançados pelo orquestrador.**

- O orquestrador (Opus 5 — Alto) é responsável por: entender o pedido, planejar,
  decompor em tarefas, definir contratos entre as partes, revisar o que volta dos
  agentes e integrar. Ele **não** escreve o grosso do código.
- A implementação é delegada a agentes **Sonnet** (`Agent` com `model: "sonnet"`,
  ou `agent(..., { model: 'sonnet' })` dentro de um `Workflow`).
- Cada agente recebe uma tarefa **autocontida**: arquivos que pode tocar, tokens e
  componentes que deve usar, e o critério de pronto. Nada de "veja o resto do projeto".
- Tarefas independentes são lançadas **em paralelo**, num único bloco de chamadas.
- O orquestrador **sempre revisa** o retorno de cada agente antes de considerar a
  tarefa concluída — nenhum código entra sem revisão.
- Exceções em que o orquestrador escreve direto: edições triviais de uma linha,
  correções durante revisão, e os arquivos de fundação do design system
  (`src/styles/tokens.css`, `tailwind.config.ts`, `src/lib/domains.ts`), porque são
  o contrato que todos os agentes consomem.

---

## Direção de design (não negociável)

O padrão é o de um SaaS de US$ 20.000, avaliado contra o checklist "The $10K Checklist".
Antes de finalizar qualquer tela, verifique-a contra os 8 itens do checklist — eles estão
mapeados seção a seção no spec.

Princípios que não podem ser violados:

1. **Profundidade no ambiente. Planura nos dados.** Fundos têm atmosfera; superfícies
   que carregam número são planas e neutras. Sem glass, gradiente ou sombra colorida
   dentro de painel de dados.
2. **Paleta de 3 cores de marca + 3 semânticas.** `#002443` navy (estrutura),
   `#F2F3F8` mist (superfície), `#027193` teal (ação). As semânticas só aparecem
   quando o dado exige.
3. **Tipografia:** Bricolage Grotesque (display) + Geist (texto) + Geist Mono (números,
   sempre com `tabular-nums`). **Nunca** Inter ou Roboto.
4. **Shell é sempre navy**, nos dois temas. Só o canvas de conteúdo troca.
   Tema **claro é o padrão**.
5. **Motion sussurra.** Easing `cubic-bezier(0.22, 1, 0.36, 1)`, `240–320ms`. Sem
   fade-up genérico em tudo. `prefers-reduced-motion` sempre respeitado.
6. **Sem fotografia.** Nenhuma imagem de banco. Toda expressão visual é gerada em
   SVG/canvas.
7. **Acessibilidade não é opcional.** Contraste AA nos dois temas, navegação completa
   por teclado com anel de foco teal visível, HTML semântico de verdade.

Cores, espaçamentos e raios vêm **sempre** dos tokens em `src/styles/tokens.css` via
Tailwind. Valor hexadecimal solto em componente é erro de revisão.

---

## Stack

Next.js 14 (App Router) · TypeScript · Tailwind · shadcn/ui · Prisma + Postgres ·
Recharts · `ogl` (WebGL apenas no login).

Server Components por padrão. `"use client"` restrito a: atmosfera, command palette,
toggle de tema, gráficos e formulário de login.

---

## Fonte de verdade dos domínios

`src/lib/domains.ts` registra os cinco domínios e suas telas numa única estrutura, que
alimenta **ao mesmo tempo** a sidebar, a command palette, a Home e o controle de
permissões. Adicionar ou alterar um indicador significa editar esse arquivo — nunca
duplicar a lista em outro lugar.

---

## Tooltip "info" dos dashboards (OBRIGATÓRIO manter atualizado)

Cada dashboard tem, ao lado do título, um campo **info** (ícone/tooltip) que explica ao
usuário o que aquele painel mostra e como os números são calculados.

**Regra:** SEMPRE que houver qualquer alteração em um indicador — nova métrica, mudança
na lógica de cálculo, fonte de dados, filtros, fórmula, período considerado ou exclusões
— o texto do **info** daquele dashboard DEVE ser atualizado na mesma tarefa.

**Como escrever o info:**
- Linguagem **clara e simples** — traduzir análise complexa para o dia a dia da operação.
- **Visual e escaneável**: frases curtas, bullets, destaque do que importa.
- **Com exemplo numérico** sempre que ajudar.
- Explicar o recorte em termos de negócio.
- **Foco 100% no INDICADOR e no NEGÓCIO.** O público é a operação e a gestão, NÃO
  desenvolvedores — nunca citar tabelas, views, colunas, nomes de campos, SQL, RPA ou
  banco de dados. Fale de pessoas, treinamentos, ocorrências, metas — não de como o
  dado é armazenado.

---

## Idioma

Toda a interface, os comentários de código e a documentação em **português do Brasil**.
