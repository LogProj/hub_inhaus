import { PrismaClient } from "@prisma/client"

// Singleton do Prisma para evitar múltiplas conexões em dev/serverless.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }

// O db_inhaus é COMPARTILHADO (hub + RPA/SRA) e o hub roda serverless na Vercel
// (muitas instâncias). Sem limitar o pool, elas esgotam as conexões do Postgres e
// caem em "Timed out fetching a connection". Embutimos o limite AQUI para não
// depender de a env do host trazer `connection_limit` — se a URL já tiver, mantém.
function urlComLimite(): string | undefined {
  const url = process.env.DATABASE_URL
  if (!url || url.includes("connection_limit")) return url
  return url + (url.includes("?") ? "&" : "?") + "connection_limit=5&pool_timeout=20"
}

const urlFinal = urlComLimite()

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    ...(urlFinal ? { datasources: { db: { url: urlFinal } } } : {}),
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  })

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma
