import fs from "fs"
import crypto from "crypto"
import pg from "pg"

const env = Object.fromEntries(
  fs.readFileSync(".env.local", "utf8").split("\n")
    .filter((l) => l.includes("=") && !l.trim().startsWith("#"))
    .map((l) => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, "")] }),
)

const hub = new pg.Client({ connectionString: env.DATABASE_URL })
const sra = new pg.Client({ connectionString: env.DATABASE_URL_INHAUS })
await hub.connect(); await sra.connect()

const SEGREDO = env.EPI_CPF_SECRET
const hmac = (cpf) => crypto.createHmac("sha256", SEGREDO).update(cpf.replace(/\D/g, "")).digest("hex")
const uuid = () => crypto.randomUUID()
const cod5 = (crBruto) => {
  if (!crBruto) return null
  const p = String(crBruto).trim().split(" - ")[0]?.trim() ?? ""
  if (!p) return null
  return p.length < 5 ? p.padStart(5, "0") : p
}

// --- Limpa seeds anteriores (idempotente) ---
await hub.query(`DELETE FROM treinamento_presenca WHERE treinamento_id IN (SELECT id FROM treinamento WHERE nome LIKE '%(seed)%')`)
await hub.query(`DELETE FROM treinamento WHERE nome LIKE '%(seed)%'`)
await hub.query(`DELETE FROM treinamento_responsavel WHERE nome LIKE '%(seed)%'`)

// --- Colaboradores ativos reais, variados por CR ---
const { rows: colabs } = await sra.query(
  `SELECT cpf, nome, descricao_funcao, matricula, cr
     FROM ft_colaboradores_sra
    WHERE dt_demissao IS NULL AND cpf IS NOT NULL
      AND mes_referencia = (SELECT MAX(mes_referencia) FROM ft_colaboradores_sra)
    ORDER BY cr, nome
    LIMIT 80`,
)
console.log("colaboradores disponiveis:", colabs.length)

// --- Responsáveis ---
const resps = ["Carlos Andrade (seed)", "Fernanda Lima (seed)", "Marcos Souza (seed)"].map((nome) => ({ id: uuid(), nome }))
for (const r of resps) {
  await hub.query(`INSERT INTO treinamento_responsavel (id, nome, ativo) VALUES ($1,$2,true)`, [r.id, r.nome])
}

// --- Treinamentos ---
const treinos = [
  { nome: "Integração de Novos Colaboradores (seed)", data: "2026-06-10", dur: 4, status: "ENCERRADO", ini: 0, qtd: 14, naoLoc: 0 },
  { nome: "Código de Conduta e Ética (seed)", data: "2026-06-24", dur: 2, status: "ENCERRADO", ini: 10, qtd: 12, naoLoc: 0 },
  { nome: "LGPD para Colaboradores (seed)", data: "2026-07-07", dur: 3, status: "ENCERRADO", ini: 0, qtd: 20, naoLoc: 2 },
  { nome: "Prevenção ao Assédio e Compliance (seed)", data: "2026-07-21", dur: 3, status: "ENCERRADO", ini: 25, qtd: 15, naoLoc: 0 },
  { nome: "Liderança e Gestão de Equipes (seed)", data: "2026-08-08", dur: 8, status: "ABERTO", ini: 5, qtd: 18, naoLoc: 1 },
  { nome: "Feedback e Avaliação de Desempenho (seed)", data: "2026-08-20", dur: 4, status: "ABERTO", ini: 30, qtd: 16, naoLoc: 0 },
]

let cpfFake = 90000000000
const fakeCpf = () => String(++cpfFake).padStart(11, "0")

let totalPres = 0
for (let i = 0; i < treinos.length; i++) {
  const t = treinos[i]
  const id = uuid()
  const token = crypto.randomBytes(16).toString("base64url")
  const resp = resps[i % resps.length]
  await hub.query(
    `INSERT INTO treinamento (id, nome, data, duracao_horas, responsavel_id, status, token_publico) VALUES ($1,$2,$3,$4,$5,$6,$7)`,
    [id, t.nome, t.data, t.dur, resp.id, t.status, token],
  )
  // presenças localizadas (fatia rotativa dos colaboradores, com sobreposição entre treinos)
  const slice = []
  for (let k = 0; k < t.qtd; k++) slice.push(colabs[(t.ini + k) % colabs.length])
  const vistos = new Set()
  for (const c of slice) {
    const h = hmac(c.cpf)
    if (vistos.has(h)) continue
    vistos.add(h)
    await hub.query(
      `INSERT INTO treinamento_presenca (id, treinamento_id, cpf_hash, nome_colab, cr_cod, cr_nome, cargo, matricula, localizado_na_sra, cpf_texto)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,true,NULL) ON CONFLICT (treinamento_id, cpf_hash) DO NOTHING`,
      [uuid(), id, h, c.nome, cod5(c.cr), (c.cr ?? "").trim(), c.descricao_funcao ?? null, c.matricula ?? null],
    )
    totalPres++
  }
  // não localizados
  for (let n = 0; n < t.naoLoc; n++) {
    const cpf = fakeCpf()
    await hub.query(
      `INSERT INTO treinamento_presenca (id, treinamento_id, cpf_hash, nome_colab, cr_cod, cr_nome, cargo, matricula, localizado_na_sra, cpf_texto)
       VALUES ($1,$2,$3,NULL,NULL,NULL,NULL,NULL,false,$4) ON CONFLICT (treinamento_id, cpf_hash) DO NOTHING`,
      [uuid(), id, hmac(cpf), cpf],
    )
    totalPres++
  }
  console.log(`  ${t.nome}: ${t.qtd} localizados + ${t.naoLoc} nao-loc`)
}

console.log("Seed pronto. Treinamentos:", treinos.length, "| presencas inseridas:", totalPres)
await hub.end(); await sra.end()
