# Design — Padronização da visibilidade de telas e portal do cliente

Data: 2026-08-25
Branch: feat/isolamento-cr-cliente (mesma base do módulo de Desvios)

## Problema

Dois pontos, ambos de **administração de acesso** (não de estética):

1. Na tela de **Usuários**, as telas para conceder aparecem numa lista única e plana
   (`Dominio · Tela`). Para telas de cliente não dá para saber **de qual cliente** é
   cada tela (hoje o rótulo é "Clientes · Acompanhamento de Desvios", sem o nome do
   cliente). Com vários clientes isso fica ambíguo.
2. Depois do login, um usuário **CLIENTE** ainda enxerga a moldura do hub (In-Haus,
   Clientes, domínios). O esperado: o cliente só vê **as telas dele**, como se o resto
   do hub não existisse.

Usuários **internos** continuam com a navegação atual (In-Haus + Clientes). O escopo
aqui é só (a) clareza ao conceder e (b) o portal enxuto do cliente.

## Frente 1 — Seletor de telas agrupado (tela de Usuários)

Substituir o `MultiCombobox` plano de telas (nos dois formulários: criar e editar) por
um **seletor agrupado** `SeletorTelas`:

- Seção **"Áreas internas"** com uma subseção por domínio (Segurança, RH, Qualidade,
  Treinamentos, Financeiro), cada uma com as telas em checkboxes.
- Uma seção por **cliente contratante** (vem de `DOMINIOS` → domínio `clientes` →
  `clientes[]`), rotulada **"Cliente: Atlas Copco"**, com as telas daquele cliente.
- Cada seção tem um **"selecionar todas"** (atalho para liberar tudo de um cliente).
- Fonte de dados: `DOMINIOS` (telas internas por domínio) + `DOMINIOS[clientes].clientes[]`
  (telas por cliente), excluindo `emBreve`. Reaproveita `clienteKey/clienteLabel` já
  existentes em `TelaComDominio`.
- Contrato: `value: string[]` (chaves), `onChange(next: string[])`. Só troca a UI de
  seleção; o que é gravado (`visibleScreens`) não muda.

Resultado: ao liberar para um usuário da Atlas, o admin vê a seção "Cliente: Atlas
Copco" e marca as telas certas, sabendo de quem são.

## Frente 2 — Portal enxuto do cliente (pós-login)

Quando `classificacao === "CLIENTE"`:

- **Sidebar em modo portal**: no topo, a **logo do cliente**; abaixo, apenas a lista
  **plana** das telas concedidas (as do cliente), cada uma com seu ícone; embaixo, o
  perfil + sair. **Sem** In-Haus, Clientes, domínios internos, Administração ou Visão
  Geral do hub.
- **Marca do cliente**: derivada do cliente a que as telas concedidas pertencem
  (`clienteKey` das telas visíveis). Mapa `slug → logo` (`atlas → /logo_atlas_copco.svg`);
  fallback: nome do cliente sem logo.
- **Landing**: a Home genérica do hub (`/dashboards`, com KPIs dos 5 domínios) não faz
  sentido para o cliente. Se `CLIENTE`, `/dashboards` **redireciona para a 1ª tela
  concedida** do cliente.
- Usuário **INTERNO**: nada muda (mantém In-Haus + Clientes + Admin).

### Dados/plumbing
- `resolverPapeisDashboard()` passa a expor `classificacao` (já vem em
  `sessao.authorization.classificacao`). No acesso livre de dev = "INTERNO".
- Layout → `DashboardShell` → `DashboardSidebar` recebem `classificacao` (e a marca do
  cliente resolvida). A sidebar ramifica: modo portal (CLIENTE) × modo completo (INTERNO).
- `/dashboards/page.tsx`: se CLIENTE, `redirect` para a 1ª tela visível.

## Arquivos (visão)
```
src/lib/dashboard-acesso.ts            # + classificacao no PapeisDashboard
src/app/dashboards/layout.tsx          # repassa classificacao
src/components/dashboard/DashboardShell.tsx
src/components/dashboard/DashboardSidebar.tsx   # modo portal do cliente
src/app/dashboards/page.tsx            # redirect do cliente p/ 1a tela
src/components/admin/SeletorTelas.tsx  # novo seletor agrupado
src/components/admin/UsuariosAdmin.tsx # usa SeletorTelas nos 2 formularios
src/lib/desvios/branding.ts (ou similar) # mapa slug->logo/nome do cliente
```

## Fora de escopo
- Mudar a navegação dos usuários **internos** (In-Haus/Clientes seguem como estão).
- Vínculo automático de telas ao contratante (o admin continua escolhendo as telas;
  ganha só o agrupamento + "selecionar todas").
- Multi-cliente por usuário no portal (assumimos que um CLIENTE vê um cliente; se tiver
  telas de mais de um, o portal lista todas, agrupadas por cliente).

## Riscos
- **Regressão de menu para internos**: garantir que o modo portal só vale para CLIENTE.
- Um CLIENTE sem nenhuma tela concedida cai num portal vazio — mostrar estado "sem
  telas liberadas, fale com o administrador".
