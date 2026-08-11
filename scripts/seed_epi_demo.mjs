// Seed de DEMONSTRAÇÃO do acompanhamento de EPI. Cria um mês de sessões cobrindo os
// 4 alertas. REVERSÍVEL: todas as sessões usam token "seed-..." (rode com --limpar).
//   node scripts/seed_epi_demo.mjs           -> cria o cenário
//   node scripts/seed_epi_demo.mjs --limpar  -> remove só as sessões de demo
import pg from "pg"
import fs from "node:fs"
import crypto from "node:crypto"

function env(n) {
  const txt = fs.readFileSync(".env.local", "utf8")
  for (const l of txt.split(/\r?\n/)) {
    const m = l.match(new RegExp("^\\s*" + n + "\\s*=\\s*(.*)$"))
    if (m) { let x = m[1].trim(); if ((x[0] === '"' && x.at(-1) === '"') || (x[0] === "'" && x.at(-1) === "'")) x = x.slice(1, -1); return x }
  }
  return null
}
const SECRET = env("EPI_CPF_SECRET")
const hmac = (cpf) => crypto.createHmac("sha256", SECRET).update(String(cpf).replace(/\D/g, "")).digest("hex")
const hoje = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date())
const MES = hoje.slice(0, 7)
const dia = (d) => `${MES}-${String(d).padStart(2, "0")}`

const db = new pg.Client({ connectionString: env("DATABASE_URL") })
const sra = new pg.Client({ connectionString: env("DATABASE_URL_INHAUS") || env("DATABASE_URL") })

async function limpar() {
  const r = await db.query("DELETE FROM epi_sessao_turno WHERE token LIKE 'seed-%'")
  console.log(`Sessões de demo removidas: ${r.rowCount}`)
}

async function turnoAlvo(crPrefixo) {
  const t = await db.query(
    `SELECT t.id, t.cr, t.nome, t.dias_semana,
            (SELECT cv.id FROM epi_checklist_versao cv
               JOIN epi_cliente_cr cc ON cc.checklist_template_id=cv.template_id
              WHERE cc.cr=t.cr AND cv.publicado_em IS NOT NULL
              ORDER BY cv.id DESC LIMIT 1) versao_id,
            (SELECT cv.itens FROM epi_checklist_versao cv
               JOIN epi_cliente_cr cc ON cc.checklist_template_id=cv.template_id
              WHERE cc.cr=t.cr AND cv.publicado_em IS NOT NULL
              ORDER BY cv.id DESC LIMIT 1) itens
       FROM epi_turno t
      WHERE t.ativo=true AND t.cr LIKE $1
      ORDER BY (SELECT count(*) FROM epi_atribuicao_turno a WHERE a.turno_id=t.id AND a.fim_em IS NULL) DESC
      LIMIT 1`, [crPrefixo + " %"])
  if (t.rowCount === 0) return null
  const turno = t.rows[0]
  const a = await db.query(`SELECT cpf_hash FROM epi_atribuicao_turno WHERE turno_id=$1 AND fim_em IS NULL`, [turno.id])
  const hashes = a.rows.map((r) => r.cpf_hash)
  // nomes via SRA (cpf -> hmac)
  const s = await sra.query(
    `SELECT cpf, nome, descricao_funcao FROM ft_colaboradores_sra
      WHERE cr=$1 AND dt_demissao IS NULL AND mes_referencia=(SELECT max(mes_referencia) FROM ft_colaboradores_sra)`, [turno.cr])
  const nome = new Map(), cargo = new Map()
  for (const row of s.rows) { const h = hmac(row.cpf); nome.set(h, row.nome); cargo.set(h, row.descricao_funcao) }
  return { ...turno, hashes, nome, cargo }
}

async function main() {
  await db.connect(); await sra.connect()
  await limpar()
  if (process.argv.includes("--limpar")) { await db.end(); await sra.end(); return }

  const knorr = await turnoAlvo("17780")
  const novelis = await turnoAlvo("15162")
  if (!knorr || !novelis) { console.error("Turnos alvo não encontrados"); await db.end(); await sra.end(); process.exit(1) }

  // corrige o nome nas respostas (usa o mapa de nomes do turno)
  const nomeResp = (turno, h) => turno.nome.get(h) ?? "Colaborador"

  // ---- KNORR: dias 1-6 validados (com faltas + 1 não conforme), 7-8 pendentes, 9 sem sessão ----
  const alKn = knorr.hashes
  const respKn = alKn.slice(0, Math.max(1, alKn.length - 2)) // 2 alocados NÃO respondem (faltas)
  const naoConf = alKn[0]
  for (let d = 1; d <= 6; d++) await criarSessaoNome(knorr, dia(d), "VALIDADA", respKn, naoConf, true, true, nomeResp)
  for (let d = 7; d <= 8; d++) await criarSessaoNome(knorr, dia(d), "AGUARDANDO_VALIDACAO", respKn, null, false, false, nomeResp)
  // dia 9: sem sessão (alerta 4)

  // ---- NOVELIS: dias 1-9 todos validados, todos respondem conforme (líder em dia) ----
  const alNo = novelis.hashes
  for (let d = 1; d <= 9; d++) await criarSessaoNome(novelis, dia(d), "VALIDADA", alNo, null, true, true, nomeResp)

  console.log(`Seed criado para ${MES}. KNORR turno#${knorr.id} (${alKn.length} alocados), NOVELIS turno#${novelis.id} (${alNo.length} alocados).`)
  const c = await db.query("SELECT count(*) FROM epi_sessao_turno WHERE token LIKE 'seed-%'")
  console.log(`Sessões de demo agora: ${c.rows[0].count}`)
  await db.end(); await sra.end()
}

// versão que injeta o nome correto na resposta
async function criarSessaoNome(turno, d, status, respondentes, naoConformeHash, comPresenca, validar, nomeResp) {
  const token = `seed-${turno.id}-${d.replace(/-/g, "")}`
  const ins = await db.query(
    `INSERT INTO epi_sessao_turno (turno_id, checklist_versao_id, data, token, status)
     VALUES ($1,$2,$3::date,$4,$5) RETURNING id`, [turno.id, turno.versao_id, d, token, status])
  const sessaoId = ins.rows[0].id
  const itens = Array.isArray(turno.itens) ? turno.itens : []
  for (const h of respondentes) {
    const naoConf = h === naoConformeHash
    const respostas = itens.map((it, idx) => ({ itemId: it.id, rotulo: it.rotulo, conforme: !(naoConf && idx === itens.length - 1) }))
    const conforme = respostas.every((r) => r.conforme)
    await db.query(
      `INSERT INTO epi_resposta (sessao_id, cpf_hash, nome, cargo, cr, respostas, conforme, respondido_em)
       VALUES ($1,$2,$3,$4,$5,$6::jsonb,$7,$8::date)`,
      [sessaoId, h, nomeResp(turno, h), turno.cargo.get(h) ?? null, turno.cr, JSON.stringify(respostas), conforme, d])
  }
  if (comPresenca) for (const h of turno.hashes)
    await db.query(`INSERT INTO epi_presenca_sessao (sessao_id, cpf_hash, nome, presente) VALUES ($1,$2,$3,true) ON CONFLICT (sessao_id,cpf_hash) DO NOTHING`, [sessaoId, h, turno.nome.get(h) ?? "Colaborador"])
  if (validar) {
    const hash = crypto.createHash("sha256").update(`${sessaoId}-${d}`).digest("hex")
    await db.query(`INSERT INTO epi_validacao_sessao (sessao_id, auth_user_id, nome_lider, hash_conteudo) VALUES ($1,$2,$3,$4)`, [sessaoId, "seed-lider", "Líder (demo)", hash])
  }
  return sessaoId
}

main().catch((e) => { console.error("ERRO:", e.message); process.exit(1) })
