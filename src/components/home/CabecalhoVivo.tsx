import { Atmosphere } from "@/components/atmosphere/Atmosphere"

type CabecalhoVivoProps = {
  /** Primeiro nome de quem está logado — já resolvido pela página. */
  primeiroNome: string
  /** Frase curta de estado da operação, ex.: "2 pontos de atenção hoje". */
  fraseEstado: string
}

function saudacaoPorHorario(hora: number): string {
  if (hora < 12) return "Bom dia"
  if (hora < 18) return "Boa tarde"
  return "Boa noite"
}

/**
 * Faixa 1 da Home — a única faixa com atmosfera e a única sem card: ela
 * "sangra" para fora do padding do `<main>` e desvanece no canvas por trás
 * dela via máscara. O contraste entre esta faixa (atmosfera navy) e a faixa
 * de KPIs logo abaixo (superfícies planas) é o efeito central da tela.
 */
export function CabecalhoVivo({ primeiroNome, fraseEstado }: CabecalhoVivoProps) {
  const saudacao = saudacaoPorHorario(new Date().getHours())

  return (
    <section
      aria-labelledby="home-saudacao"
      className="relative -mx-10 -mt-10 overflow-hidden px-10 pb-16 pt-14"
      style={{
        maskImage: "linear-gradient(to bottom, black 55%, transparent)",
        WebkitMaskImage: "linear-gradient(to bottom, black 55%, transparent)",
      }}
    >
      <Atmosphere intensidade="media" />
      <div className="relative">
        <h1 id="home-saudacao" className="font-display text-display-md text-white">
          {saudacao}, {primeiroNome}.
        </h1>
        {/*
          Esta faixa é a única superfície do produto pintada pela atmosfera
          navy — por isso o texto de apoio usa `white/70` (mesma família da
          sidebar, `text-white/55`) em vez de `text-muted-foreground`: esse
          token é calibrado para as superfícies mist/card, e sobre o navy da
          atmosfera ficaria com contraste insuficiente (viola o princípio de
          acessibilidade AA do design system). Ver relatório da Task 14.
        */}
        <p className="mt-2 font-sans text-sm text-white/70">{fraseEstado}</p>
      </div>
    </section>
  )
}
