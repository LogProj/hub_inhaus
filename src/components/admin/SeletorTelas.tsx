"use client"

import * as React from "react"

import { DOMINIOS, TELA_HOME } from "@/lib/domains"
import { cn } from "@/lib/utils"

type Props = {
  value: string[]
  onChange: (next: string[]) => void
}

type GrupoTela = {
  titulo: string
  ehCliente: boolean
  telas: { key: string; label: string }[]
}

/**
 * Monta os grupos a partir da fonte de verdade dos domínios: primeiro as áreas
 * internas (uma por domínio sem clientes), depois uma seção por cliente
 * contratante ("Cliente: <nome>"). Só entram telas prontas (sem `emBreve`).
 */
function montarGrupos(): GrupoTela[] {
  const grupos: GrupoTela[] = []

  // "Visão Geral" (Home) é uma tela concedível como as demais: sem esta permissão
  // (nem admin), o usuário não vê a Visão Geral e cai direto na 1ª tela liberada.
  grupos.push({
    titulo: "Geral",
    ehCliente: false,
    telas: [{ key: TELA_HOME.key, label: TELA_HOME.label }],
  })

  for (const dominio of DOMINIOS) {
    if (dominio.clientes?.length) continue
    const telas = dominio.telas.filter((t) => !t.emBreve).map((t) => ({ key: t.key, label: t.label }))
    if (telas.length === 0) continue
    grupos.push({ titulo: dominio.label, ehCliente: false, telas })
  }

  for (const dominio of DOMINIOS) {
    for (const cliente of dominio.clientes ?? []) {
      const telas = cliente.telas.filter((t) => !t.emBreve).map((t) => ({ key: t.key, label: t.label }))
      if (telas.length === 0) continue
      grupos.push({ titulo: `Cliente: ${cliente.label}`, ehCliente: true, telas })
    }
  }

  return grupos
}

const GRUPOS = montarGrupos()

export function SeletorTelas({ value, onChange }: Props) {
  function alternar(key: string) {
    if (value.includes(key)) onChange(value.filter((k) => k !== key))
    else onChange([...value, key])
  }

  function alternarGrupo(grupo: GrupoTela) {
    const chaves = grupo.telas.map((t) => t.key)
    const todasSelecionadas = chaves.every((k) => value.includes(k))
    if (todasSelecionadas) {
      onChange(value.filter((k) => !chaves.includes(k)))
    } else {
      onChange(Array.from(new Set([...value, ...chaves])))
    }
  }

  return (
    <div className="max-h-72 space-y-4 overflow-y-auto rounded-xl border border-input p-3">
      {GRUPOS.map((grupo) => {
        const chaves = grupo.telas.map((t) => t.key)
        const todasSelecionadas = chaves.every((k) => value.includes(k))
        return (
          <div key={grupo.titulo}>
            <div className="flex items-center justify-between gap-2">
              <p
                className={cn(
                  "text-xs font-semibold uppercase tracking-wide",
                  grupo.ehCliente ? "text-teal" : "text-muted-foreground",
                )}
              >
                {grupo.titulo}
              </p>
              <button
                type="button"
                onClick={() => alternarGrupo(grupo)}
                className="text-xs font-medium text-navy underline-offset-2 hover:underline"
              >
                {todasSelecionadas ? "Limpar" : "Selecionar todas"}
              </button>
            </div>
            <div className="mt-1.5 grid gap-1.5 sm:grid-cols-2">
              {grupo.telas.map((tela) => (
                <label key={tela.key} className="flex items-center gap-2 text-sm text-navy">
                  <input
                    type="checkbox"
                    checked={value.includes(tela.key)}
                    onChange={() => alternar(tela.key)}
                    className="h-4 w-4 rounded border-navy/25 text-teal focus:ring-teal"
                  />
                  {tela.label}
                </label>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}
