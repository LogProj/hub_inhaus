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
        href: "/seguranca",
        emBreve: true,
      },
      {
        key: "taxa-frequencia",
        label: "Taxa de frequência",
        href: "/seguranca/taxa-frequencia",
        palavrasChave: ["acidente", "trir", "tf", "afastamento", "sst"],
        emBreve: true,
      },
      {
        key: "quase-acidentes",
        label: "Quase acidentes",
        href: "/seguranca/quase-acidentes",
        palavrasChave: ["incidente", "relato", "condicao insegura"],
        emBreve: true,
      },
    ],
  },
  {
    key: "rh",
    label: "RH",
    icone: Users,
    telas: [
      { key: "rh-visao-geral", label: "Visão geral", href: "/rh", emBreve: true },
      {
        key: "absenteismo",
        label: "Absenteísmo",
        href: "/rh/absenteismo",
        palavrasChave: ["falta", "presenca", "ponto", "atestado"],
        emBreve: true,
      },
      {
        key: "turnover",
        label: "Turnover",
        href: "/rh/turnover",
        palavrasChave: ["desligamento", "rotatividade", "admissao"],
        emBreve: true,
      },
      {
        key: "headcount",
        label: "Headcount",
        href: "/rh/headcount",
        palavrasChave: ["quadro", "efetivo", "pessoas"],
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
        href: "/qualidade",
        emBreve: true,
      },
      {
        key: "nao-conformidades",
        label: "Não conformidades",
        href: "/qualidade/nao-conformidades",
        palavrasChave: ["nc", "auditoria", "retrabalho", "refugo"],
        emBreve: true,
      },
      {
        key: "auditorias",
        label: "Auditorias",
        href: "/qualidade/auditorias",
        palavrasChave: ["iso", "5s", "checklist"],
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
        href: "/treinamentos",
        emBreve: true,
      },
      {
        key: "matriz-competencias",
        label: "Matriz de competências",
        href: "/treinamentos/matriz",
        palavrasChave: ["vencimento", "validade", "apto", "nr", "certificacao"],
        emBreve: true,
      },
      {
        key: "horas-treinamento",
        label: "Horas de treinamento",
        href: "/treinamentos/horas",
        palavrasChave: ["hht", "carga horaria", "per capita"],
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
        href: "/financeiro",
        emBreve: true,
      },
      {
        key: "custo-pessoal",
        label: "Custo de pessoal",
        href: "/financeiro/custo-pessoal",
        palavrasChave: ["folha", "despesa", "orcamento"],
        emBreve: true,
      },
    ],
  },
]

export type TelaComDominio = Tela & { dominioKey: string; dominioLabel: string }

/** A Home não pertence a domínio nenhum: é o painel de entrada. */
export const TELA_HOME: TelaComDominio = {
  key: "home",
  label: "Visão geral",
  href: "/home",
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
