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
        <li>
          <strong>Status</strong>: <em>Em tratativa</em> (o caso está em andamento),{" "}
          <em>Pendente</em> (ainda não foi resolvido) e <em>Concluída</em> (o caso foi
          resolvido).
        </li>
        <li>Os contadores no topo somam os casos de cada status no seu acesso.</li>
        <li>Você só enxerga os desvios do(s) cliente(s) aos quais foi vinculado.</li>
      </ul>
      <p>
        <strong>Exemplo:</strong> um envio com uma caixa a menos entra como
        <em> Envio Divergente</em>; enquanto a devolução não é concluída, fica
        <em> Em tratativa</em> ou <em>Pendente</em>; ao resolver, vira <em>Concluída</em>.
      </p>
    </InfoIndicador>
  )
}

export function InfoPainelDesvios() {
  return (
    <InfoIndicador titulo="Como ler o painel de desvios">
      <p>
        Este painel resume, em números e gráficos, todos os <strong>desvios
        (ocorrências)</strong> dentro do seu acesso — a mesma base de dados da tela de
        acompanhamento, só que consolidada.
      </p>
      <ul className="list-disc space-y-1 pl-4">
        <li>
          <strong>Total de desvios</strong>: quantos casos existem no seu acesso, em
          qualquer situação.
        </li>
        <li>
          <strong>Em tratativa, Pendente e Concluída</strong>: quantos casos estão em
          cada situação, e o percentual que cada uma representa do total.
        </li>
        <li>
          <strong>Aderência</strong>: quanto dos desvios já foi resolvido, calculado como
          casos <em>Concluída</em> dividido pelo total de casos.
        </li>
        <li>
          <strong>Valor pendente</strong> e <strong>valor total</strong>: a soma em reais
          dos casos que ainda não foram concluídos, e a soma de todos os casos.
        </li>
        <li>
          <strong>Por Motivo, Causa Raiz, Cliente e Mês</strong>: quebras que mostram
          onde os desvios mais acontecem e como evoluem ao longo do tempo — ajudam a
          enxergar padrões e priorizar ações.
        </li>
      </ul>
      <p>
        <strong>Exemplo de Aderência:</strong> se existem 50 desvios registrados e 30
        já foram <em>Concluída</em>, a aderência é 30 ÷ 50 = <strong>60%</strong>.
      </p>
    </InfoIndicador>
  )
}
