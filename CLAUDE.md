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

## Idioma

Toda a interface, os comentários de código e a documentação em **português do Brasil**.
