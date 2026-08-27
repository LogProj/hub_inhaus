import { InfoIndicador } from "@/components/dashboard/InfoIndicador"

/**
 * Info do módulo de Treinamentos, em linguagem de negócio (sem termo técnico).
 * Manter em sincronia com as regras de src/lib/treinamentos/index.ts.
 */
export function InfoTreinamentos() {
  return (
    <InfoIndicador titulo="Como funciona o registro de treinamentos">
      <p>
        Cada <strong>treinamento</strong> tem nome, data, duração e um responsável. Ao
        criar, o sistema gera um <strong>QR Code</strong> para a lista de presença.
      </p>
      <ul className="list-disc space-y-1 pl-4">
        <li>
          Quem participou <strong>escaneia o QR</strong>, informa o <strong>CPF</strong> e
          confirma. O sistema identifica o colaborador pelo CPF e registra a presença —
          nome, cargo e unidade aparecem automaticamente.
        </li>
        <li>
          <strong>Uma presença por pessoa.</strong> Confirmar o mesmo CPF duas vezes não
          conta em dobro.
        </li>
        <li>
          <strong>CPF não localizado:</strong> se a pessoa ainda não está no cadastro, a
          presença é registrada mesmo assim e marcada para o responsável confirmar depois.
          Ninguém fica de fora.
        </li>
        <li>
          <strong>Encerrar:</strong> enquanto o treinamento está aberto, o QR aceita novas
          presenças. Ao <strong>encerrar</strong>, a lista é fechada e o QR não aceita mais
          ninguém.
        </li>
      </ul>
      <p>
        <strong>Exemplo:</strong> um treinamento de 2h com 10 pessoas na sala gera 10
        presenças — cada uma confirmando o próprio CPF no QR.
      </p>
    </InfoIndicador>
  )
}
