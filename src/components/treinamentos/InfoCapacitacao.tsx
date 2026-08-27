import { InfoIndicador } from "@/components/dashboard/InfoIndicador"

/**
 * Info do painel Controle de Capacitação, em linguagem de negócio (sem termo técnico).
 * Manter em sincronia com as regras de src/lib/capacitacao.ts.
 */
export function InfoCapacitacao() {
  return (
    <InfoIndicador titulo="Como ler o Controle de Capacitação">
      <p>
        Este painel consolida os <strong>treinamentos realizados</strong> e transforma cada
        presença confirmada em <strong>horas de capacitação</strong>.
      </p>
      <ul className="list-disc space-y-1 pl-4">
        <li>
          <strong>Colaboradores treinados:</strong> quantidade de pessoas <strong>distintas</strong>.
          Quem participou de vários treinamentos conta <strong>uma vez</strong> aqui.
        </li>
        <li>
          <strong>Horas treinadas:</strong> soma das horas de <strong>todas</strong> as presenças.
          A mesma pessoa em dois treinamentos de 4h soma <strong>8h</strong>.
        </li>
        <li>
          <strong>Média de horas por colaborador:</strong> horas treinadas ÷ colaboradores
          treinados — a carga horária média de cada pessoa.
        </li>
        <li>
          <strong>Por CR, cargo e treinamento:</strong> as horas (e as pessoas) somadas por
          unidade, por função e por treinamento. Quem não foi encontrado no cadastro aparece
          como <strong>"Não localizado na SRA"</strong>, mas continua contando no total.
        </li>
        <li>
          <strong>Linha do tempo:</strong> horas treinadas em cada <strong>mês</strong> do
          treinamento.
        </li>
      </ul>
      <p>
        <strong>Filtros:</strong> mês, cliente, CR e responsável. Sem seleção, mostra tudo.
        Cliente e CR vêm da <strong>unidade do colaborador</strong> na data da presença.
      </p>
      <p>
        <strong>Exemplo:</strong> 3 treinamentos de 4h com 10 pessoas cada, todas diferentes,
        dão <strong>30 colaboradores treinados</strong> e <strong>120 horas</strong> (média de 4h
        por pessoa).
      </p>
    </InfoIndicador>
  )
}
