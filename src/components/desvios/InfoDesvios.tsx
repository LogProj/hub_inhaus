import { InfoIndicador } from "@/components/dashboard/InfoIndicador"

export function InfoDesvios() {
  return (
    <InfoIndicador titulo="Como funciona o controle de desvios">
      <p>
        Este painel registra e acompanha os <strong>desvios (ocorrências)</strong> da
        operação do cliente. Cada linha é um caso: o que aconteceu, por quê, e em que pé
        está a resolução.
      </p>
      <ul className="list-disc space-y-1 pl-4">
        <li><strong>Status</strong>: <em>Em tratativa</em> (em andamento), <em>Não</em>
          (ainda não resolvido) e <em>Sim</em> (resolvido).</li>
        <li>Os contadores no topo somam os casos de cada status no seu acesso.</li>
        <li>Você só enxerga os desvios do(s) cliente(s) aos quais foi vinculado.</li>
      </ul>
      <p>
        <strong>Exemplo:</strong> um envio com uma caixa a menos entra como
        <em> Envio Divergente</em>; enquanto a devolução não é concluída, fica
        <em> Em tratativa</em>; ao resolver, vira <em>Sim</em>.
      </p>
    </InfoIndicador>
  )
}
