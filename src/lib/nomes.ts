/**
 * Capitaliza nomes próprios de pessoas para exibição, mantendo conectores em
 * minúsculo (da, de, do…). Os dados de origem vêm em CAIXA ALTA; guardamos o
 * valor bruto para filtrar e usamos esta função só na apresentação.
 *
 * Módulo puro (sem acesso a banco), para poder ser importado tanto no servidor
 * quanto em componentes client.
 */

const CONECTORES = new Set(["da", "de", "do", "das", "dos", "e", "di", "du", "van", "von"])

export function tituloNome(texto: string): string {
  return texto
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .map((palavra) =>
      CONECTORES.has(palavra)
        ? palavra
        : palavra.charAt(0).toUpperCase() + palavra.slice(1),
    )
    .join(" ")
}
