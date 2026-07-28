import {
  BadgeCheck,
  GraduationCap,
  ShieldCheck,
  Users,
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
      },
      {
        key: "taxa-frequencia",
        label: "Taxa de frequência",
        href: "/dashboards/seguranca/taxa-frequencia",
        palavrasChave: ["acidente", "trir", "tf", "afastamento", "sst"],
      },
      {
        key: "quase-acidentes",
        label: "Quase acidentes",
        href: "/dashboards/seguranca/quase-acidentes",
        palavrasChave: ["incidente", "relato", "condicao insegura"],
      },
    ],
  },
  {
    key: "rh",
    label: "RH",
    icone: Users,
    telas: [
      { key: "rh-visao-geral", label: "Visão geral", href: "/dashboards/rh" },
      {
        key: "controle-quadro",
        label: "Controle de Quadro",
        href: "/dashboards/rh/controle-quadro",
        palavrasChave: ["quadro", "colaboradores", "efetivo", "gerente regional", "headcount"],
      },
      {
        key: "absenteismo",
        label: "Absenteísmo",
        href: "/dashboards/rh/absenteismo",
        palavrasChave: ["falta", "presenca", "ponto", "atestado"],
      },
      {
        key: "turnover",
        label: "Turnover",
        href: "/dashboards/rh/turnover",
        palavrasChave: ["desligamento", "rotatividade", "admissao"],
      },
      {
        key: "headcount",
        label: "Headcount",
        href: "/dashboards/rh/headcount",
        palavrasChave: ["quadro", "efetivo", "pessoas"],
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
      },
      {
        key: "nao-conformidades",
        label: "Não conformidades",
        href: "/dashboards/qualidade/nao-conformidades",
        palavrasChave: ["nc", "auditoria", "retrabalho", "refugo"],
      },
      {
        key: "auditorias",
        label: "Auditorias",
        href: "/dashboards/qualidade/auditorias",
        palavrasChave: ["iso", "5s", "checklist"],
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
      },
      {
        key: "matriz-competencias",
        label: "Matriz de competências",
        href: "/dashboards/treinamentos/matriz",
        palavrasChave: ["vencimento", "validade", "apto", "nr", "certificacao"],
      },
      {
        key: "horas-treinamento",
        label: "Horas de treinamento",
        href: "/dashboards/treinamentos/horas",
        palavrasChave: ["hht", "carga horaria", "per capita"],
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
      },
      {
        key: "custo-pessoal",
        label: "Custo de pessoal",
        href: "/dashboards/financeiro/custo-pessoal",
        palavrasChave: ["folha", "despesa", "orcamento"],
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
