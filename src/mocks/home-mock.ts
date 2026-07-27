/**
 * DADOS FICTÍCIOS — mock da Home "mission control".
 *
 * Cobrem os cinco domínios registrados em `src/lib/domains.ts` (segurança,
 * RH, qualidade, treinamentos, financeiro) mais os alertas operacionais.
 * Nenhum valor aqui vem de banco: são números fixos e plausíveis, sem
 * `Math.random()`, só para a fundação visual ter algo para desenhar.
 *
 * Serão substituídos quando as telas de cada domínio (Task 15 em diante do
 * roadmap do produto) passarem a consultar `db_inhaus` de verdade — a forma
 * dos tipos abaixo (`KpiHome`, `AlertaHome`) é o contrato que essa troca
 * precisa respeitar.
 */

export type SentidoBom = "cima" | "baixo"

export type KpiHome = {
  /** Chave do domínio em `DOMINIOS`, para casar ícone e cor. */
  dominioKey: string
  dominioLabel: string
  /** Nome do indicador em si — ex.: "Taxa de frequência". */
  titulo: string
  valor: number
  sufixo?: string
  /** Casas decimais na exibição do valor. */
  casas?: number
  /** Variação percentual do período (mês corrente vs. anterior). */
  variacao: number
  sentidoBom: SentidoBom
  /** Série de 12 meses para o sparkline, do mais antigo para o mais recente. */
  pontos: number[]
  href: string
}

export type SeveridadeAlerta = "critico" | "atencao" | "ok"

export type AlertaHome = {
  id: string
  severidade: SeveridadeAlerta
  /** Frase curta do que aconteceu. */
  descricao: string
  /** Contexto: onde, quando, quem. */
  contexto: string
  /** Texto do link de ação — ex.: "ver ocorrência". */
  acao: string
  href: string
}

export const KPIS_HOME: KpiHome[] = [
  {
    dominioKey: "seguranca",
    dominioLabel: "Segurança",
    titulo: "Taxa de frequência",
    valor: 2.4,
    casas: 1,
    variacao: -8.3,
    sentidoBom: "baixo",
    pontos: [3.6, 3.4, 3.5, 3.2, 3.0, 2.9, 2.8, 2.7, 2.6, 2.5, 2.4, 2.4],
    href: "/seguranca",
  },
  {
    dominioKey: "rh",
    dominioLabel: "RH",
    titulo: "Turnover",
    valor: 4.8,
    sufixo: "%",
    casas: 1,
    variacao: 0.6,
    sentidoBom: "baixo",
    pontos: [3.9, 4.0, 4.1, 4.0, 4.2, 4.3, 4.4, 4.3, 4.5, 4.6, 4.7, 4.8],
    href: "/rh",
  },
  {
    dominioKey: "qualidade",
    dominioLabel: "Qualidade",
    titulo: "Não conformidades abertas",
    valor: 12,
    casas: 0,
    variacao: -15.4,
    sentidoBom: "baixo",
    pontos: [22, 21, 20, 19, 18, 17, 16, 15, 14, 13, 12, 12],
    href: "/qualidade",
  },
  {
    dominioKey: "treinamentos",
    dominioLabel: "Treinamentos",
    titulo: "Horas de treinamento per capita",
    valor: 18.6,
    sufixo: "h",
    casas: 1,
    variacao: 5.2,
    sentidoBom: "cima",
    pontos: [15.2, 15.6, 16.0, 16.3, 16.7, 17.0, 17.3, 17.6, 17.9, 18.1, 18.4, 18.6],
    href: "/treinamentos",
  },
  {
    dominioKey: "financeiro",
    dominioLabel: "Financeiro",
    titulo: "Custo de pessoal sobre receita",
    valor: 32.4,
    sufixo: "%",
    casas: 1,
    variacao: 1.1,
    sentidoBom: "baixo",
    pontos: [29.8, 30.1, 30.4, 30.6, 30.9, 31.2, 31.4, 31.6, 31.8, 32.0, 32.2, 32.4],
    href: "/financeiro",
  },
]

export const ALERTAS_HOME: AlertaHome[] = [
  {
    id: "alerta-1",
    severidade: "critico",
    descricao: "Quase acidente registrado na Unidade Sul",
    contexto: "Turno da manhã · há 2 horas",
    acao: "ver ocorrência",
    href: "/seguranca/quase-acidentes",
  },
  {
    id: "alerta-2",
    severidade: "atencao",
    descricao: "12 certificações NR vencem nos próximos 15 dias",
    contexto: "Matriz de competências · Unidade Norte",
    acao: "ver matriz",
    href: "/treinamentos/matriz",
  },
  {
    id: "alerta-3",
    severidade: "atencao",
    descricao: "Turnover acima da meta pelo segundo mês seguido",
    contexto: "RH · meta mensal de 4,0%",
    acao: "ver indicador",
    href: "/rh/turnover",
  },
  {
    id: "alerta-4",
    severidade: "ok",
    descricao: "Auditoria de qualidade concluída sem apontamentos",
    contexto: "Unidade Sul · encerrada ontem",
    acao: "ver auditoria",
    href: "/qualidade/auditorias",
  },
]
