/**
 * Marca visual de cada cliente contratante (portal do cliente). O `slug` casa com
 * o `key` do ClienteHub em domains.ts e com o slug do contratante no banco.
 */
export type MarcaCliente = { slug: string; nome: string; logo?: string }

const MARCAS: Record<string, MarcaCliente> = {
  atlas: { slug: "atlas", nome: "Atlas Copco", logo: "/logo_atlas_copco.svg" },
}

/** Marca de um cliente pelo slug (ou uma marca genérica com o nome informado). */
export function marcaDoCliente(slug: string | null | undefined, nome?: string | null): MarcaCliente {
  if (slug && MARCAS[slug]) return MARCAS[slug]
  return { slug: slug ?? "", nome: nome ?? "Cliente" }
}
