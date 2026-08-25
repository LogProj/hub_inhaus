// Importa as ocorrências GPS (aba "Ocorrências LOG" da planilha Controle de Aderência)
// para a tabela `desvio`, no contratante Atlas Copco. REVERSÍVEL e IDEMPOTENTE:
// todas as linhas são gravadas com criado_por='seed:gps'; rodar de novo apaga as
// anteriores desse seed e reinsere (não duplica).
//
//   1) python scripts/extrair_desvios_gps.py   -> gera scripts/desvios_gps.json
//   2) node scripts/seed_desvios_gps.mjs        -> insere no banco
//   node scripts/seed_desvios_gps.mjs --limpar  -> só remove as linhas do seed
//
// O passo (1) usa openpyxl (pré-processamento); este script só fala com o banco via
// `pg`, lendo DATABASE_URL do .env.local (o Prisma não lê .env.local).
import pg from "pg"
import fs from "node:fs"

function env(n) {
  const txt = fs.readFileSync(".env.local", "utf8")
  for (const l of txt.split(/\r?\n/)) {
    const m = l.match(new RegExp("^\\s*" + n + "\\s*=\\s*(.*)$"))
    if (m) {
      let x = m[1].trim()
      if ((x[0] === '"' && x.at(-1) === '"') || (x[0] === "'" && x.at(-1) === "'")) x = x.slice(1, -1)
      return x
    }
  }
  return null
}

const db = new pg.Client({ connectionString: env("DATABASE_URL") })

async function main() {
  await db.connect()
  const { rows } = await db.query("SELECT id FROM cliente_contratante WHERE slug='atlas'")
  if (!rows.length) throw new Error("Contratante Atlas não existe — aplique prisma/sql/009_desvios.sql primeiro.")
  const contratanteId = rows[0].id

  await db.query("DELETE FROM desvio WHERE contratante_id=$1 AND criado_por='seed:gps'", [contratanteId])

  if (process.argv.includes("--limpar")) {
    console.log("Linhas do seed GPS removidas.")
    return
  }

  const linhas = JSON.parse(fs.readFileSync("scripts/desvios_gps.json", "utf8"))
  let n = 0
  for (const d of linhas) {
    await db.query(
      `INSERT INTO desvio (
        contratante_id, responsavel_interno, numero_otb_wbs, tipo, divisao, solicitante,
        data_ocorrencia, cliente_final, motivo, causa_raiz, resumo_caso, solucao, status,
        data_faturamento, data_separacao, valor, criado_por, atualizado_por
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,'seed:gps','seed:gps')`,
      [
        contratanteId, d.responsavelInterno, d.numeroOtbWbs, d.tipo, d.divisao, d.solicitante,
        d.dataOcorrencia, d.clienteFinal, d.motivo, d.causaRaiz, d.resumoCaso, d.solucao, d.status,
        d.dataFaturamento, d.dataSeparacao, d.valor,
      ],
    )
    n++
  }
  console.log(`Importados ${n} desvios GPS para Atlas Copco (contratante ${contratanteId}).`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => db.end())
