import {
  Activity,
  AlertTriangle,
  BadgeCheck,
  Building2,
  CalendarX,
  ClipboardCheck,
  Clock,
  FileWarning,
  GraduationCap,
  Grid3x3,
  LayoutDashboard,
  ListPlus,
  Repeat,
  ShieldCheck,
  Users,
  UsersRound,
  Wallet,
  type LucideIcon,
} from "lucide-react"

/**
 * FONTE DE VERDADE ÚNICA dos domínios e telas do hub.
 *
 * Alimenta AO MESMO TEMPO: a sidebar, a command palette, a Home e o controle de
 * permissões. Adicionar ou alterar um indicador significa editar ESTE arquivo —
 * nunca duplicar a lista em outro lugar.
 */

export type Tela = {
  /** Chave estável, salva em AuthUser.visibleScreens. Nunca renomear. */
  key: string
  label: string
  href: string
  /** Termos extras para a busca da command palette. */
  palavrasChave?: string[]
  /** Tela ainda não construída: aparece desabilitada na sidebar. */
  emBreve?: boolean
  /** Ícone exibido na sidebar antes do nome da tela. */
  icone?: LucideIcon
}

export type Dominio = {
  key: string
  label: string
  icone: LucideIcon
  telas: Tela[]
}

export const DOMINIOS: Dominio[] = [
  {
    key: "seguranca",
    label: "Segurança",
    icone: ShieldCheck,
    telas: [
      {
        key: "seguranca-visao-geral",
        label: "Visão geral",
        href: "/dashboards/seguranca",
        icone: LayoutDashboard,
        emBreve: true,
      },
      {
        key: "taxa-frequencia",
        label: "Taxa de frequência",
        href: "/dashboards/seguranca/taxa-frequencia",
        palavrasChave: ["acidente", "trir", "tf", "afastamento", "sst"],
        icone: Activity,
        emBreve: true,
      },
      {
        key: "quase-acidentes",
        label: "Quase acidentes",
        href: "/dashboards/seguranca/quase-acidentes",
        palavrasChave: ["incidente", "relato", "condicao insegura"],
        icone: AlertTriangle,
        emBreve: true,
      },
    ],
  },
  {
    key: "rh",
    label: "RH",
    icone: Users,
    telas: [
      {
        key: "rh-visao-geral",
        label: "Visão geral",
        href: "/dashboards/rh",
        icone: LayoutDashboard,
        emBreve: true,
      },
      {
        key: "controle-quadro",
        label: "Controle de Quadro",
        href: "/dashboards/rh/controle-quadro",
        palavrasChave: ["quadro", "colaboradores", "efetivo", "gerente regional", "headcount"],
        icone: UsersRound,
      },
      {
        key: "absenteismo",
        label: "Absenteísmo",
        href: "/dashboards/rh/absenteismo",
        palavrasChave: ["falta", "presenca", "ponto", "atestado"],
        icone: CalendarX,
        emBreve: true,
      },
      {
        key: "turnover",
        label: "Turnover",
        href: "/dashboards/rh/turnover",
        palavrasChave: ["desligamento", "rotatividade", "admissao"],
        icone: Repeat,
        emBreve: true,
      },
      {
        key: "headcount",
        label: "Headcount",
        href: "/dashboards/rh/headcount",
        palavrasChave: ["quadro", "efetivo", "pessoas"],
        icone: Users,
        emBreve: true,
      },
    ],
  },
  {
    key: "qualidade",
    label: "Qualidade",
    icone: BadgeCheck,
    telas: [
      {
        key: "qualidade-visao-geral",
        label: "Visão geral",
        href: "/dashboards/qualidade",
        icone: LayoutDashboard,
        emBreve: true,
      },
      {
        key: "nao-conformidades",
        label: "Não conformidades",
        href: "/dashboards/qualidade/nao-conformidades",
        palavrasChave: ["nc", "auditoria", "retrabalho", "refugo"],
        icone: FileWarning,
        emBreve: true,
      },
      {
        key: "auditorias",
        label: "Auditorias",
        href: "/dashboards/qualidade/auditorias",
        palavrasChave: ["iso", "5s", "checklist"],
        icone: ClipboardCheck,
        emBreve: true,
      },
    ],
  },
  {
    key: "treinamentos",
    label: "Treinamentos",
    icone: GraduationCap,
    telas: [
      {
        key: "treinamentos-visao-geral",
        label: "Visão geral",
        href: "/dashboards/treinamentos",
        icone: LayoutDashboard,
        emBreve: true,
      },
      {
        key: "matriz-competencias",
        label: "Matriz de competências",
        href: "/dashboards/treinamentos/matriz",
        palavrasChave: ["vencimento", "validade", "apto", "nr", "certificacao"],
        icone: Grid3x3,
        emBreve: true,
      },
      {
        key: "horas-treinamento",
        label: "Horas de treinamento",
        href: "/dashboards/treinamentos/horas",
        palavrasChave: ["hht", "carga horaria", "per capita"],
        icone: Clock,
        emBreve: true,
      },
    ],
  },
  {
    key: "financeiro",
    label: "Financeiro",
    icone: Wallet,
    telas: [
      {
        key: "financeiro-visao-geral",
        label: "Visão geral",
        href: "/dashboards/financeiro",
        icone: LayoutDashboard,
        emBreve: true,
      },
      {
        key: "custo-pessoal",
        label: "Custo de pessoal",
        href: "/dashboards/financeiro/custo-pessoal",
        palavrasChave: ["folha", "despesa", "orcamento"],
        icone: Wallet,
        emBreve: true,
      },
    ],
  },
  {
    key: "clientes",
    label: "Clientes",
    icone: Building2,
    telas: [
      {
        key: "desvios-acompanhamento",
        label: "Acompanhamento de Desvios",
        href: "/dashboards/clientes/atlas/desvios",
        palavrasChave: ["atlas", "ocorrencia", "desvio", "tratativa", "gps"],
        icone: FileWarning,
      },
      {
        key: "desvios-formulario",
        label: "Formulário de Desvios",
        href: "/dashboards/clientes/atlas/desvios/novo",
        palavrasChave: ["atlas", "novo desvio", "lancar ocorrencia"],
        icone: ListPlus,
      },
    ],
  },
]

export type TelaComDominio = Tela & { dominioKey: string; dominioLabel: string }

/** A Home não pertence a domínio nenhum: é o painel de entrada. */
export const TELA_HOME: TelaComDominio = {
  key: "home",
  label: "Visão geral",
  href: "/dashboards",
  palavrasChave: ["inicio", "home", "pulso", "mission control"],
  dominioKey: "geral",
  dominioLabel: "Geral",
  icone: LayoutDashboard,
}

export const TODAS_AS_TELAS: TelaComDominio[] = [
  TELA_HOME,
  ...DOMINIOS.flatMap((dominio) =>
    dominio.telas.map((tela) => ({
      ...tela,
      dominioKey: dominio.key,
      dominioLabel: dominio.label,
    })),
  ),
]

/** Remove acento e caixa: a busca não pode exigir digitação perfeita. */
function normalizar(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
}

/**
 * Busca sobre INDICADORES, não só sobre páginas — digitar "vencimento" precisa
 * levar à matriz de competências. Telas "em breve" também aparecem, para o
 * usuário enxergar o mapa do produto.
 */
export function buscarTelas(termo: string): TelaComDominio[] {
  const alvo = normalizar(termo)
  if (!alvo) return []
  return TODAS_AS_TELAS.filter((tela) => {
    const campos = [tela.label, tela.dominioLabel, ...(tela.palavrasChave ?? [])]
    return campos.some((campo) => normalizar(campo).includes(alvo))
  })
}

export type PermissaoUsuario = { isAdmin: boolean; visibleScreens: string[] }

/** Admin enxerga tudo; os demais, apenas o que foi concedido e ainda existe. */
export function telasVisiveis(usuario: PermissaoUsuario): TelaComDominio[] {
  const habilitadas = TODAS_AS_TELAS.filter((tela) => !tela.emBreve)
  if (usuario.isAdmin) return habilitadas
  const concedidas = new Set(usuario.visibleScreens)
  return habilitadas.filter((tela) => concedidas.has(tela.key))
}

/** Chaves válidas — usado para limpar o que vem do banco. */
export const CHAVES_DE_TELA = TODAS_AS_TELAS.map((tela) => tela.key)

export function sanitizarTelas(entrada: unknown): string[] {
  if (!Array.isArray(entrada)) return []
  const validas = new Set(CHAVES_DE_TELA)
  return Array.from(
    new Set(
      entrada.filter((v): v is string => typeof v === "string" && validas.has(v)),
    ),
  )
}
