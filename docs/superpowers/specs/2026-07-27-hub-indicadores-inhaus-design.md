# Hub de Indicadores In-Haus — Spec de Design

- **Data:** 2026-07-27
- **Status:** Aprovado
- **Escopo desta entrega:** Design system + tela de Login + Shell da aplicação + Home "mission control", com dados mockados.
- **Fora de escopo (etapa posterior):** modelagem de dados, integrações, painéis de domínio, admin de usuários.

---

## 1. Objetivo

Construir o hub que centraliza os indicadores da In-Haus nos cinco domínios — **Segurança, RH, Qualidade, Treinamentos, Financeiro** — num único ambiente.

Esta primeira entrega estabelece a **fundação visual e estrutural**. Ela não conecta dados reais: todos os números exibidos vêm de mocks tipados, projetados para serem substituídos por queries sem alteração de layout.

O padrão de qualidade é o de um SaaS de US$ 20.000, avaliado contra o checklist "The $10K Checklist" (Metics Media). Cada seção deste spec referencia o item do checklist que atende.

---

## 2. Decisões tomadas

| Tema | Decisão |
|---|---|
| Direção visual | Dark-luxury corporativo, executado como "observatório" |
| Tema padrão | Claro, com escuro disponível via toggle |
| Paleta | `#002443` navy, `#F2F3F8` mist, `#027193` teal + 3 semânticas |
| Tipografia | Bricolage Grotesque (display) + Geist (texto) + Geist Mono (números) |
| Superfícies | Precisão técnica — raio 10px, borda hairline, sombra mínima |
| Motion | Sofisticado e discreto, com abertura animada da logo |
| Navegação | Sidebar por domínio + command palette (⌘K) |
| Login | Split cinematográfico 58/42 com canvas WebGL |
| Abordagem de build | Projeto novo, portando só as camadas de infraestrutura do `hub_amyris` |
| Contexto de uso primário | Desktop — gestor analisando |

---

## 3. Ponto de vista visual — "observatório"

**✓ Checklist item 01 — point of view, not a template.**

Não é um dashboard de startup nem um portal corporativo genérico. É a sensação de um observatório: calmo, espaçoso, com profundidade, tecnológico — e nunca tenso. Você olha *através* dele para a operação.

Consequências práticas:
- Espaçamento generoso; a escala de espaço fica um degrau acima do usual em dashboards.
- Contraste do texto secundário suave, não gritante.
- Easing lento — `240–320ms`. Movimento tranquilo lê como caro; movimento rápido lê como nervoso.

### Regra estruturante do sistema

> **Profundidade no ambiente. Planura nos dados.**

O fundo tem atmosfera, camadas e vida. As superfícies que carregam número são absolutamente planas e neutras. Isso entrega impacto visual sem nenhum custo de legibilidade — e é exatamente onde a maioria das tentativas de "dashboard premium" fracassa.

---

## 4. Sistema de cor

**✓ Checklist item 03 — a restrained color system.**

### Cores de marca (3)

| Papel | Token | Valor | Uso |
|---|---|---|---|
| Base / estrutura | `navy` | `#002443` | Shell, sidebar, topbar, títulos |
| Superfície | `mist` | `#F2F3F8` | Canvas de conteúdo no tema claro |
| Ação / acento | `teal` | `#027193` | Botões primários, links, anel de foco, série principal dos gráficos |

O teal vem da própria logo In-Haus (`logo_inhaus_branca.svg` / `logo_inhaus_escura.svg`), o que faz a paleta ser derivada da marca e não arbitrária.

### Cores semânticas (3)

| Papel | Uso |
|---|---|
| `success` — teal-derivado esverdeado | Meta atingida, tendência favorável |
| `warn` — âmbar dessaturado | A vencer, próximo do limite |
| `danger` — vermelho dessaturado (nunca puro) | Vencido, meta perdida |

**Regra de disciplina:** as semânticas só aparecem quando o dado exige. Um painel onde está tudo bem é um painel navy, teal e cinza — sem verde comemorativo.

### Comportamento nos dois temas

O **shell é sempre navy**, em ambos os temas. Só o canvas de conteúdo troca:

| | Tema claro (padrão) | Tema escuro |
|---|---|---|
| Sidebar / topbar | `#002443` | `#002443` |
| Canvas | `#F2F3F8` | `#00121F` |
| Cards | `#FFFFFF` | `#062B45` |
| Borda hairline | `navy` a 8% | `white` a 8% |

Resultado: o produto tem a mesma silhueta e a mesma autoridade nos dois temas. Trocar de tema não parece trocar de produto.

Tokens implementados como CSS custom properties em `src/styles/tokens.css`, consumidos pelo Tailwind via `hsl(var(--token))`, com o tema escuro sob a classe `.dark` no `<html>`.

---

## 5. Tipografia

**✓ Checklist item 02 — typography that does work.** Nenhuma das famílias é Inter ou Roboto.

| Papel | Família | Pesos | Aplicação |
|---|---|---|---|
| Display | Bricolage Grotesque | 600, 700 | H1/H2, valores de KPI, login. Tracking `-0.02em` a `-0.04em` em tamanhos grandes |
| Texto | Geist | 400, 500, 600 | Corpo, labels, tabelas, navegação |
| Números | Geist Mono | 400, 500 | Toda métrica, eixo e célula numérica, com `font-variant-numeric: tabular-nums` |

Ambas estão no Google Fonts e são carregadas via `next/font/google` — self-hosted, sem request externo e sem layout shift.

`tabular-nums` em todo número é obrigatório: números que não dançam ao atualizar é um detalhe que ninguém aponta e todo mundo sente.

### Escala

Escala tipográfica de razão 1.25, de `12px` (label) a `56px` (display), com `clamp()` fluido. Grade base de **4px**. Espaçamento entre seções nunca inferior a `32px`.

**✓ Checklist item 04 — hierarchy that breathes.** A hierarquia é carregada por peso, tamanho e cor — nunca por caixa colorida.

---

## 6. Superfícies

Personalidade: **precisão técnica**.

- Raio: `10px`
- Borda: `1px` hairline — `navy/8%` no claro, `white/8%` no escuro
- Sombra: praticamente ausente. A elevação vem de contraste de superfície, não de blur
- Padding interno: `20–24px`
- Proibido em superfícies de dado: glass/backdrop-blur, gradiente, sombra colorida

---

## 7. Sistema de atmosfera

Três camadas empilhadas, sem nenhuma imagem raster.

1. **Gradiente de profundidade radial** — de `#002443` a `#00121F` nos cantos, com centro deslocado. Cria a sensação de espaço côncavo em vez de tela chapada.
2. **Malha de dados** — grid de linhas finíssimas (`white/4%`) com pontos nas interseções, em perspectiva sutil. Pontos individuais pulsam devagar e de forma aleatória, em ciclo de 6–10s. Lê como constelação ou rede, não como papel milimetrado.
3. **Aurora navy-teal** — dois blobs de luz muito difusa (teal `#027193` a ~8%, azul-claro a ~6%) derivando em ciclo de ~40s. Deriva tão devagar que não se percebe o movimento — só que a tela respira.

### Onde cada intensidade se aplica

| Local | Camadas | Intensidade | Implementação |
|---|---|---|---|
| Login (painel esquerdo) | 1, 2, 3 | Cheia, reativa ao mouse | **Canvas WebGL** (`ogl`) |
| Home — faixa de cabeçalho | 1, 2, 3 | Média, sem reatividade | CSS + SVG animado |
| Sidebar | 1, 2 | ~30% | CSS + SVG animado |
| Canvas de conteúdo (tema claro) | 3 apenas | Homeopática — teal a 3% | CSS |
| Dentro de painéis de dados | nenhuma | — | — |

Racional da divisão WebGL/CSS: impacto máximo no login, onde a máquina está ociosa e o usuário não tem tarefa; custo próximo de zero no shell, onde o gestor passa o dia.

---

## 8. Abertura animada da logo

Sequência de **~2,2s**, executada **uma vez por sessão** (flag em `sessionStorage`).

| Tempo | O que acontece |
|---|---|
| `0–400ms` | Tela em navy profundo. A malha de dados se materializa de dentro para fora, pontos acendendo em cascata a partir do centro |
| `400–1200ms` | A logo In-Haus se **desenha** via `stroke-dashoffset` — símbolo primeiro, depois o wordmark. O teal `#027193` entra por último, preenchendo o símbolo |
| `1200–1700ms` | Pulso de luz teal suave irradia da logo e ativa a aurora ao fundo. A logo assenta na posição final |
| `1700–2200ms` | A logo faz *scale down* e desliza para a posição que ocupará no layout real (canto do card de login, ou topo da sidebar) — **transição compartilhada**. A interface aparece por trás em fade escalonado |

O passo 4 é o que separa splash amador de premium: a logo não some para a tela trocar — ela **vira** o elemento do layout. O usuário sente continuidade, não interrupção.

### Salvaguardas (obrigatórias)

- **Não-bloqueante.** Roda como overlay sobre a página já hidratada. O LCP não é penalizado e o formulário de login já está pronto quando o overlay sai.
- **Clique ou qualquer tecla pula** para o estado final imediatamente.
- `prefers-reduced-motion: reduce` → a logo aparece com fade de `300ms`, sem traçado.
- Uma vez por sessão. Navegações e logins subsequentes na mesma sessão não repetem.

Componente: `src/components/brand/BootSequence.tsx`.

---

## 9. Motion

**✓ Checklist item 06 — motion that whispers.**

Vocabulário único, aplicado com parcimônia:

| Elemento | Comportamento |
|---|---|
| Easing padrão | `cubic-bezier(0.22, 1, 0.36, 1)` |
| Duração padrão | `240–320ms` |
| Entrada de página | Fade + `8px` de subida |
| Escalonamento entre irmãos | `60ms` |
| Hover de card | Mudança de borda e superfície, `160ms`. Sem translate, sem scale |
| KPIs | Contam até o valor em `900ms` com desaceleração longa, **apenas na primeira renderização** — nunca em re-render de filtro |
| Gráficos | Desenham linha/barra na entrada, uma única vez |
| Command palette / sheets | `scale 0.98 → 1` + fade, `220ms` |
| Loading | Skeletons com shimmer. Nunca spinner |
| Erro de credencial | Shake horizontal de `6px` em `200ms` — o único movimento "duro" do sistema |
| Spring physics | Somente em elementos que o usuário arrasta ou abre |

`prefers-reduced-motion: reduce` desliga tudo isso e mantém apenas transições de opacidade.

---

## 10. Tela de Login

> **Revisão de 2026-07-27, depois da primeira entrega.** O cliente viu a versão
> implementada e pediu o formato da tela de login do `hub_amyris`. O que vale hoje é
> a seção **10-A**; a **10-B** fica registrada como o desenho original, para não se
> perder o raciocínio caso a decisão seja revista.

### 10-A. Formato vigente — split 50/50 com cartão

Divisão **50 / 50** (`lg:grid-cols-2`), como no `hub_amyris`.

**Painel esquerdo, navy, só no desktop:** canvas WebGL com a atmosfera completa e um
overlay `bg-gradient-to-tr from-navy-deep/70`. Conteúdo em três blocos verticais:
logo In-Haus branca centralizada no topo, bloco central com pílula "Hub In-Haus" +
headline em Bricolage Grotesque + parágrafo, e a data por extenso no rodapé.

**Painel direito, sobre o canvas claro:** coluna de `max-width: 28rem` centrada, com
logo escura visível só no mobile, título "Bem-vindo de volta", subtítulo, e o
formulário **dentro de um cartão** (`rounded-lg border border-hairline bg-card
shadow-lift`). Abaixo do cartão, a linha "Autenticação segura" com ícone em teal.

**Formulário:** campos **em caixa**, com `<label>` fixa acima e ícone à esquerda
(`Mail`, `Lock`). Erro num bloco `role="alert"` acima do formulário. Botão primário
teal com spinner. O segundo fator é um campo único de código, no mesmo cartão.

**Mobile:** o painel esquerdo desaparece e resta a coluna do cartão, centrada. O
WebGL não é instanciado abaixo de 1024px.

Consequência assumida: esta versão é mais convencional que a original e usa a
elevação de cartão que o resto do sistema evita. É uma exceção deliberada, restrita
à tela de login — nenhum painel de dados ganha cartão elevado por causa disso.

### 10-B. Desenho original (substituído)

Divisão **58 / 42**. A assimetria é deliberada — sinaliza que alguém decidiu isso.

### Painel esquerdo (58%) — navy, full-bleed

Canvas WebGL com as três camadas de atmosfera em intensidade cheia. A malha reage ao mouse com um atrator suave: pontos próximos ao cursor acendem e se deslocam alguns pixels, com retorno amortecido. É o único lugar do sistema com interação de mouse decorativa, e funciona porque aqui o usuário não tem tarefa.

Sobre o canvas, ancorado no terço inferior esquerdo:
- Logo In-Haus branca (onde a abertura animada a deposita)
- Headline em Bricolage Grotesque `40px`: *"Todos os indicadores da In-Haus. Um só lugar."*
- Subtítulo em Geist `15px`, em `#F2F3F8` a 60%
- Rodapé: data por extenso e um marcador teal pulsante de "sistema operacional"

O vazio na porção superior é intencional.

### Painel direito (42%) — `#F2F3F8`

Formulário **sem card** — flutua direto sobre a superfície, alinhado à esquerda com margem generosa, `max-width: 380px`, centrado verticalmente.

- Título em Bricolage `28px`
- Campos com **label flutuante** e underline de `1.5px` que ganha o teal e cresce da esquerda para a direita no foco. Sem caixa, sem borda completa
- Botão primário teal, largura total, altura `48px`. Estado de loading substitui o texto por três pontos em respiração
- Erro de credencial acima do botão, em vermelho dessaturado, com o shake de `6px`

### Segundo fator (2FA)

Se houver 2FA, o segundo passo **não troca de tela**: o formulário faz slide lateral para os 6 campos de código, mantendo a mesma altura.

### Mobile

**✓ Checklist item 07 — mobile that's designed, not shrunk.**

O painel esquerdo não vira uma faixa espremida — ele **vira o fundo da tela inteira**, com atmosfera em intensidade reduzida (CSS, não WebGL). O formulário sobe como uma folha `#F2F3F8` ancorada na base, ocupando ~62% da altura, com raio superior de `24px`. Logo posicionada acima da folha. É uma decisão de layout distinta, não o desktop comprimido.

---

## 11. Shell da aplicação

### Sidebar — `264px`, navy sólido

Camadas 1 e 2 da atmosfera a ~30%. Logo branca no topo com `28px` de respiro.

Os cinco domínios como grupos — **Segurança, RH, Qualidade, Treinamentos, Financeiro** — cada um com ícone Lucide de traço `1.5px` e as telas do domínio expandindo abaixo em Geist `13px`. Domínios ainda sem tela entram desabilitados com etiqueta *em breve*: mostrar o mapa completo do produto no dia um comunica ambição.

Estado ativo: **barra teal de 2px à esquerda**, texto branco pleno e leve realce de superfície — nunca fundo colorido. Inativos em `white/55%`.

Colapsa para `72px` (só ícones), com estado persistido em `localStorage`.

Rodapé: avatar + nome, toggle de tema (sol/lua com transição de morph) e o atalho `⌘K` visível como dica.

### Topbar — `64px`, navy

Contínua com a sidebar, sem borda entre as duas — o shell é uma peça só. Contém breadcrumb, campo de busca que abre a command palette, filtro de período global e ícone de alertas.

### Command palette (`⌘K`)

Overlay com scrim navy a 40% e blur leve. Busca fuzzy sobre **indicadores**, não apenas páginas — digitar "vencimento" leva direto ao painel correto. Agrupada por domínio, navegável por setas, com ações rápidas (trocar tema, exportar, ir para admin). Entrada em `scale 0.98 → 1` + fade, `220ms`.

### Canvas de conteúdo

`#F2F3F8` no claro, com a aurora homeopática a 3%. `max-width: 1440px` centrada, `40px` de padding. Nunca 100% de largura — texto e gráfico esticados até o infinito é assinatura de produto barato.

---

## 12. Home — mission control

Quatro faixas verticais, com respiro forte entre elas.

**Faixa 1 — Cabeçalho vivo.** Fundo com atmosfera em intensidade média, desvanecendo para o canvas. Saudação em Bricolage `40px` com o primeiro nome do usuário, e ao lado uma frase de estado da operação. Sem card.

**Faixa 2 — O pulso.** Cinco cards, um por domínio, em grade responsiva. Cada card traz:
- Nome do domínio
- KPI-chave em Geist Mono `36px` com tabular-nums
- Variação vs. período anterior, com seta e cor semântica
- Sparkline de 12 pontos em teal, ocupando a base do card
- No hover, um "ver painel →" que desliza da direita

Estes são os cards **planos** — sem atmosfera, sem gradiente. O contraste com a Faixa 1 é justamente o que os faz parecer sólidos e confiáveis.

**Faixa 3 — O que precisa de você.** Lista de alertas ordenada por severidade, em formato de **linha** e não de card: marcador semântico à esquerda, descrição em Geist `14px`, contexto em cinza, ação à direita. Sem alertas, um **empty state desenhado** — não "nenhum resultado", mas um estado de calma deliberado, com um traço da malha de dados e uma frase curta.

**Faixa 4 — Acesso rápido.** Painéis mais visitados pelo usuário, como chips discretos.

---

## 13. Imagery

**✓ Checklist item 05 — imagery with intent.**

O sistema **não usa fotografia**. Nenhuma imagem de banco, nenhum Unsplash. Toda a expressão visual é gerada: a malha de dados, a aurora, os sparklines, os ícones de traço fino e os empty states desenhados em SVG. Isso é uma decisão de direção de arte, não uma economia — um hub de indicadores com foto de gente sorrindo de gravata seria imediatamente lido como barato.

---

## 14. Qualidade não-visível

**✓ Checklist item 08 — the invisible expensive stuff.**

- **Contraste WCAG AA** verificado para todo par texto/fundo, nos dois temas. Texto sobre navy e sobre mist auditado explicitamente.
- **Navegação completa por teclado**, com anel de foco teal de `2px` sempre visível. A command palette é operável só com teclado de ponta a ponta.
- **HTML semântico** — `<nav>`, `<main>`, `<header>`, `<table>` de verdade nas tabelas, hierarquia de headings correta.
- **Server Components por padrão.** `"use client"` restrito a: atmosfera, command palette, toggle de tema, gráficos e formulário de login.
- **Sub-2s de carregamento** — `next/font` self-hosted, ícones tree-shaken, WebGL apenas na rota de login e carregado dinamicamente.
- **Meta tags e Open Graph reais**, favicon derivado da logo.
- `prefers-reduced-motion` respeitado em todo o sistema.

---

## 15. Arquitetura

### Abordagem

Projeto novo (Next.js 14 App Router + TypeScript + Tailwind + shadcn/ui), portando do `hub_amyris` **apenas as camadas sem opinião visual**:

- `src/lib/global-auth.ts` — provedor de identidade
- `src/lib/auth-session.ts` — sessão e cookies
- `src/lib/db-inhaus.ts` — pool Postgres preguiçoso
- `middleware.ts` — proteção de rotas
- `prisma/schema.prisma` — modelo `AuthUser` (acesso local, `isAdmin`, `visibleScreens`)
- O padrão de `src/lib/screens.ts`, generalizado para domínios

Não se copia nenhum componente visual do `hub_amyris`. O design nasce limpo.

### Estrutura de pastas

```
src/
  app/
    (auth)/login/page.tsx
    (app)/layout.tsx
    (app)/home/page.tsx
    api/auth/...
    globals.css
  components/
    brand/        InhausLogo.tsx, BootSequence.tsx
    atmosphere/   AtmosphereBackground.tsx, DataMesh.tsx, LoginCanvas.tsx
    shell/        AppSidebar.tsx, AppTopbar.tsx, CommandPalette.tsx, ThemeToggle.tsx
    kpi/          KpiCard.tsx, Sparkline.tsx, TrendBadge.tsx, MetricValue.tsx
    ui/           shadcn — button, input, card, dialog, tooltip, skeleton, ...
  lib/            global-auth.ts, auth-session.ts, db-inhaus.ts, domains.ts, utils.ts
  mocks/          home-mock.ts  (dados fictícios tipados)
  styles/         tokens.css
```

### Fonte de verdade dos domínios

`src/lib/domains.ts` registra os cinco domínios e suas telas numa única estrutura, que alimenta simultaneamente a sidebar, a command palette, a Home e o controle de permissões. Adicionar um indicador novo é editar um arquivo, não seis.

### Dados

Todos os números desta entrega vêm de `src/mocks/home-mock.ts`, com tipos que espelham o formato final esperado das queries. Substituir mock por query real não deve exigir alteração de layout.

---

## 16. Tratamento de erros

- **Falha de autenticação:** mensagem acima do botão + shake. Nunca revela se o e-mail existe.
- **Sem acesso ao hub** (usuário válido no `global_auth` mas sem linha de acesso local): tela `403` desenhada, com instrução de a quem solicitar acesso.
- **Falha de rede/servidor:** `error.tsx` por rota, com opção de tentar de novo. Nunca stack trace.
- **WebGL indisponível:** o `LoginCanvas` detecta e cai para a versão CSS/SVG da atmosfera, sem quebra visual.
- **Rota inexistente:** `404` desenhada, com o mesmo tom dos empty states.

---

## 17. Verificação

Como esta entrega é visual e sem dados reais, a verificação é:

1. **Contraste** — auditoria AA de todos os pares texto/fundo nos dois temas.
2. **Teclado** — percorrer login, shell, command palette e Home apenas com teclado, confirmando foco sempre visível.
3. **Reduced motion** — com a preferência ativa, confirmar que nenhuma animação de deslocamento ocorre e que a abertura da logo vira fade.
4. **Responsivo** — verificar login e Home em `375px`, `768px`, `1280px` e `1920px`, confirmando que o mobile usa o layout próprio e não o desktop comprimido.
5. **Performance** — Lighthouse na rota de login e na Home, com meta de LCP abaixo de 2s.
6. **Sessão de abertura** — confirmar que a animação roda uma vez e não se repete ao navegar.

---

## 18. Pendências assumidas para a próxima etapa

- Origem dos dados de cada domínio (não existe tabela de treinamentos, qualidade, segurança ou financeiro no `db_inhaus` hoje — só RH/ponto).
- Se o hub é multi-cliente/multi-contrato (o banco tem `cr` e views por cliente).
- Definição dos indicadores de cada domínio.
- Admin de usuários e permissões.
- Painéis de domínio propriamente ditos.
