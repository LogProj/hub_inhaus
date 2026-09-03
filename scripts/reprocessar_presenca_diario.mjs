// Reprocessa presenças de TREINAMENTO que ficaram "não localizadas na SRA",
// re-resolvendo o CPF contra o HISTÓRICO DIÁRIO completo (ft_colaboradores_sra_diario,
// qualquer dia, inclusive desligados) — a mesma regra nova de src/lib/treinamentos/colaborador.ts.
//
// Só reprocessa quem tem CPF em claro (cpf_texto) — ou seja, os não localizados. As
// presenças já localizadas guardam só o hash (sem CPF em claro), então não há como
// recomputá-las, e já estão corretas.
//
// Ao localizar: grava snapshot (nome/cargo/CR/matrícula), marca localizado_na_sra=true
// e APAGA o cpf_texto (identidade volta a ser só o hash). O cpf_hash não muda.
//
// Rode com  --apply  para gravar; sem flag = simulação (dry-run).
import fs from "fs"
import crypto from "crypto"
import pg from "pg"

const APPLY = process.argv.includes("--apply")

const env = Object.fromEntries(
  fs.readFileSync(".env.local", "utf8").split("\n")
    .filter((l) => l.includes("=") && !l.trim().startsWith("#"))
    .map((l) => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, "")] }),
)
const SEGREDO = env.EPI_CPF_SECRET
const hmac = (digitos) => crypto.createHmac("sha256", SEGREDO).update(digitos).digest("hex")
const soDig = (s) => (s || "").toString().replace(/\D/g, "")
// Código de 5 chars do CR a partir do texto da SRA ("01234 - NOME"). Igual a codigoDoCrSra.
const crCod = (crBruto) => {
  if (!crBruto) return null
  const parte = (crBruto.toString().trim().split(" - ")[0] || "").trim()
  if (!parte) return null
  return parte.length < 5 ? parte.padStart(5, "0") : parte
}

const c = new pg.Client({ connectionString: env.DATABASE_URL_INHAUS })
await c.connect()

// Candidatos: não localizados com CPF em claro guardado.
const pend = await c.query(
  `select id, treinamento_id, cpf_hash, cpf_texto
     from treinamento_presenca
    where localizado_na_sra = false
      and cpf_texto is not null`,
)
console.log(`Presenças não localizadas com CPF: ${pend.rows.length}`)

let localizados = 0
let seguemNaoLocalizados = 0
let hashDivergente = 0

for (const p of pend.rows) {
  const digitos = soDig(p.cpf_texto)
  if (!digitos) { seguemNaoLocalizados++; continue }

  const r = await c.query(
    `select cpf, nome, descricao_funcao, matricula, cr
       from ft_colaboradores_sra_diario
      where regexp_replace(cpf, '\\D', '', 'g') = $1
      order by data_referencia desc
      limit 1`,
    [digitos],
  )
  const row = r.rows[0]
  if (!row) { seguemNaoLocalizados++; continue }

  // Sanidade: o hash recomputado tem de bater com o já gravado — senão a identidade
  // mudaria (não deveria acontecer). Se divergir, NÃO mexe.
  const novoHash = hmac(digitos)
  if (novoHash !== p.cpf_hash) {
    hashDivergente++
    console.warn(`  ! hash divergente na presença ${p.id} — pulando`)
    continue
  }

  localizados++
  const dados = {
    nome: row.nome ?? null,
    cargo: row.descricao_funcao ?? null,
    matricula: row.matricula ?? null,
    crCod: crCod(row.cr ?? null),
    crNome: (row.cr ?? "").trim() || null,
  }

  if (APPLY) {
    await c.query(
      `update treinamento_presenca
          set nome_colab = $1, cargo = $2, matricula = $3, cr_cod = $4, cr_nome = $5,
              localizado_na_sra = true, cpf_texto = null
        where id = $6`,
      [dados.nome, dados.cargo, dados.matricula, dados.crCod, dados.crNome, p.id],
    )
  } else {
    console.log(`  ~ ${p.id}: ${dados.nome} (${dados.crNome})`)
  }
}

console.log("\n=== Resultado ===")
console.log(`Agora localizados:        ${localizados}`)
console.log(`Seguem não localizados:   ${seguemNaoLocalizados}`)
if (hashDivergente) console.log(`Hash divergente (pulados): ${hashDivergente}`)
console.log(APPLY ? "\nGRAVADO (--apply)." : "\nSimulação (dry-run). Rode com --apply para gravar.")

await c.end()
