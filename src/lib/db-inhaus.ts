import { Pool } from "pg"

/**
 * Pool de conexão com o banco db_inhaus (Postgres), SEPARADO do DATABASE_URL do
 * hub (db_inhaus, auth local). Usado pelos indicadores (Absenteísmo/Turnover) que leem as
 * views do db_inhaus. Reaproveitado entre hot-reloads no dev via globalThis.
 * Usado apenas no servidor.
 *
 * O pool é criado de forma PREGUIÇOSA (na primeira query), nunca no load do
 * módulo — assim o `next build` (que importa o módulo ao coletar dados das
 * páginas) não precisa da env nem tenta conectar em tempo de build.
 */
const globalForDb = globalThis as unknown as { inhausPool?: Pool }

function criarPool(): Pool {
  // Aceita DATABASE_URL como fallback (ambos apontam para o db_inhaus hoje).
  const inhausUrl = process.env.DATABASE_URL_INHAUS || process.env.DATABASE_URL
  if (!inhausUrl) {
    throw new Error(
      "Conexão com o db_inhaus não configurada: defina DATABASE_URL_INHAUS (ou DATABASE_URL) nas variáveis de ambiente."
    )
  }
  const pool = new Pool({
    connectionString: inhausUrl,
    max: 5,
    connectionTimeoutMillis: 15000,
    idleTimeoutMillis: 30000,
  })
  if (process.env.NODE_ENV !== "production") globalForDb.inhausPool = pool
  return pool
}

function getPool(): Pool {
  return globalForDb.inhausPool ?? criarPool()
}

// Proxy: só materializa o Pool quando alguma propriedade (ex.: .query) é acessada
// em runtime. Preserva a interface de `Pool` para quem importa `inhausPool`.
export const inhausPool = new Proxy({} as Pool, {
  get(_target, prop, receiver) {
    const pool = getPool()
    const value = Reflect.get(pool, prop, receiver)
    return typeof value === "function" ? value.bind(pool) : value
  },
})
