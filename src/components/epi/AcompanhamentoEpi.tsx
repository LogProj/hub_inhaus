"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  Cell,
  PieChart,
  Pie,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  LabelList,
} from "recharts"
import {
  AlertTriangle,
  UserX,
  ClipboardCheck,
  CalendarX,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react"

import { Combobox } from "@/components/ui/Combobox"
import { tituloNome } from "@/lib/nomes"
import { dataBR } from "@/lib/epi/datas"
import { cn } from "@/lib/utils"
import type { AcompanhamentoMes } from "@/lib/epi/acompanhamento"

// Paleta In-Haus + status (reservadas para bom/atenção/crítico).
const TEAL = "#027193"
const NAVY = "#002443"
const VERDE = "#10b981"
const AMBAR = "#f59e0b"
const VERMELHO = "#ef4444"

function corAderencia(v: number): string {
  return v >= 90 ? VERDE : v >= 70 ? AMBAR : VERMELHO
}

function crCurto(cr: string): string {
  const partes = cr.split(" - ")
  const codigo = partes[0]?.trim() ?? cr
  const resto = partes.slice(1).join(" - ").replace(/^[A-Z]{2} - [A-Z]+ - /, "")
  return resto ? `${codigo} · ${resto}` : codigo
}

function TooltipCaixa({ titulo, linhas }: { titulo: string; linhas: string[] }) {
  return (
    <div className="rounded-xl border border-navy/10 bg-white px-3 py-2 shadow-card">
      <p className="text-xs font-medium text-navy">{titulo}</p>
      {linhas.map((l, i) => (
        <p key={i} className="text-xs text-muted-foreground">{l}</p>
      ))}
    </div>
  )
}

export function AcompanhamentoEpi({ dados, crFiltro }: { dados: AcompanhamentoMes; crFiltro: string | null }) {
  const router = useRouter()

  // Filtro é SERVER-SIDE: mudar mês/CR navega e recalcula tudo (KPIs, gráficos e
  // listas seguem o CR). Preserva o outro parâmetro na navegação.
  const navega = (mes: string, cr: string | null) => {
    const params = new URLSearchParams()
    params.set("mes", mes)
    if (cr) params.set("cr", cr)
    router.push(`?${params.toString()}`)
  }

  // dados já vêm filtrados pelo servidor.
  const semPreenchimento = dados.semPreenchimento
  const naoConformidades = dados.naoConformidades
  const turnosSemSessao = dados.turnosSemSessao
  const porCrTop = dados.porCr.slice(0, 12)
  const donut = [
    { nome: "Conforme", valor: dados.conformidade.conformes, cor: VERDE },
    { nome: "Não conforme", valor: dados.conformidade.naoConformes, cor: VERMELHO },
  ]
  const totalDonut = donut.reduce((n, d) => n + d.valor, 0)

  return (
    <div className="space-y-6">
      {/* filtros */}
      <div className="glass flex flex-wrap items-end gap-4 rounded-3xl p-5">
        <div>
          <label className="mb-1.5 block text-xs font-medium text-navy">Mês</label>
          <input
            type="month"
            value={dados.mes}
            onChange={(e) => e.target.value && navega(e.target.value, crFiltro)}
            className="h-10 rounded-xl border border-input bg-white/80 px-3 text-sm text-foreground focus:border-teal/50 focus:outline-none focus:ring-2 focus:ring-teal/20"
          />
        </div>
        <div className="min-w-[260px]">
          <label className="mb-1.5 block text-xs font-medium text-navy">CR</label>
          <Combobox
            value={crFiltro}
            onChange={(v) => navega(dados.mes, v)}
            options={dados.crs.map((c) => ({ value: c, label: crCurto(c) }))}
            placeholder="Todos os CRs"
            allowClear
            clearLabel="Todos os CRs"
            ariaLabel="Filtrar por CR"
          />
        </div>
      </div>

      {/* HERO: aderência (rosca) + stat tiles */}
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="glass flex items-center gap-5 rounded-3xl p-6">
          <div className="relative h-32 w-32 shrink-0">
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={[
                    { v: dados.kpis.aderencia },
                    { v: 100 - dados.kpis.aderencia },
                  ]}
                  dataKey="v"
                  innerRadius={44}
                  outerRadius={60}
                  startAngle={90}
                  endAngle={-270}
                  stroke="none"
                >
                  <Cell fill={corAderencia(dados.kpis.aderencia)} />
                  <Cell fill="#e6eaf0" />
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className="font-display text-2xl font-semibold" style={{ color: corAderencia(dados.kpis.aderencia) }}>
                {dados.kpis.aderencia}%
              </span>
              <span className="text-[10px] uppercase tracking-wide text-muted-foreground">aderência</span>
            </div>
          </div>
          <div>
            <p className="font-display text-lg font-semibold text-navy">Aderência do mês</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {dados.kpis.preenchidos} preenchimentos de <strong>{dados.kpis.esperados}</strong> esperados.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 lg:col-span-2">
          <StatTile icone={UserX} rotulo="Sem preenchimento" valor={dados.semPreenchimento.length} detalhe="colaboradores" cor={VERMELHO} />
          <StatTile icone={AlertTriangle} rotulo="Não conformidades" valor={dados.kpis.naoConformidades} detalhe="ocorrências" cor={AMBAR} />
          <StatTile icone={ClipboardCheck} rotulo="Validações pendentes" valor={dados.kpis.validacoesPendentes} detalhe="sessões" cor={AMBAR} />
          <StatTile icone={CalendarX} rotulo="Turnos sem sessão" valor={dados.kpis.turnosSemSessao} detalhe="dias" cor={AMBAR} />
        </div>
      </div>

      {/* gráficos: tendência + conformidade */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card titulo="Aderência ao longo do mês" className="lg:col-span-2">
          {dados.porDia.length === 0 ? (
            <Vazio texto="Sem dados de preenchimento no mês." />
          ) : (
            <div className="h-64">
              <ResponsiveContainer>
                <AreaChart data={dados.porDia} margin={{ top: 8, right: 16, left: 4, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gradAder" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={TEAL} stopOpacity={0.35} />
                      <stop offset="100%" stopColor={TEAL} stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#eef1f5" vertical={false} />
                  <XAxis dataKey="dia" tickFormatter={(d) => d.slice(8)} tick={{ fontSize: 11, fill: "#6b7280" }} tickLine={false} axisLine={false} />
                  <YAxis domain={[0, 100]} ticks={[0, 25, 50, 75, 100]} tickFormatter={(v) => `${v}%`} tick={{ fontSize: 11, fill: "#6b7280" }} tickLine={false} axisLine={false} width={44} />
                  <Tooltip
                    content={({ active, payload }) =>
                      active && payload?.length ? (
                        <TooltipCaixa
                          titulo={dataBR(String(payload[0].payload.dia))}
                          linhas={[
                            `Aderência: ${payload[0].payload.aderencia}%`,
                            `${payload[0].payload.preenchidos} de ${payload[0].payload.esperados} esperados`,
                          ]}
                        />
                      ) : null
                    }
                  />
                  <Area type="monotone" dataKey="aderencia" stroke={TEAL} strokeWidth={2} fill="url(#gradAder)" dot={{ r: 3, fill: TEAL }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>

        <Card titulo="Conformidade dos preenchimentos">
          {totalDonut === 0 ? (
            <Vazio texto="Nenhum preenchimento no mês." />
          ) : (
            <div className="flex h-64 flex-col items-center justify-center">
              <div className="relative h-40 w-40">
                <ResponsiveContainer>
                  <PieChart>
                    <Pie data={donut} dataKey="valor" nameKey="nome" innerRadius={50} outerRadius={70} stroke="none" paddingAngle={2}>
                      {donut.map((d) => (
                        <Cell key={d.nome} fill={d.cor} />
                      ))}
                    </Pie>
                    <Tooltip
                      content={({ active, payload }) =>
                        active && payload?.length ? (
                          <TooltipCaixa
                            titulo={String(payload[0].name)}
                            linhas={[`${payload[0].value} (${Math.round((Number(payload[0].value) / totalDonut) * 100)}%)`]}
                          />
                        ) : null
                      }
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                  <span className="font-display text-2xl font-semibold text-emerald-600">
                    {Math.round((dados.conformidade.conformes / totalDonut) * 100)}%
                  </span>
                  <span className="text-[10px] uppercase tracking-wide text-muted-foreground">conforme</span>
                </div>
              </div>
              <div className="mt-3 flex gap-4 text-sm">
                <Legenda cor={VERDE} rotulo={`Conforme (${dados.conformidade.conformes})`} />
                <Legenda cor={VERMELHO} rotulo={`Não conforme (${dados.conformidade.naoConformes})`} />
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* aderência por CR + pendências por líder */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card titulo="Aderência por CR (pior primeiro)">
          {porCrTop.length === 0 ? (
            <Vazio texto="Sem CRs com expectativa no mês." />
          ) : (
            <div style={{ height: Math.max(180, porCrTop.length * 34) }}>
              <ResponsiveContainer>
                <BarChart data={porCrTop} layout="vertical" margin={{ top: 4, right: 40, left: 8, bottom: 4 }}>
                  <XAxis type="number" domain={[0, 100]} hide />
                  <YAxis type="category" dataKey="cr" tickFormatter={crCurto} width={180} tick={{ fontSize: 11, fill: "#374151" }} tickLine={false} axisLine={false} />
                  <Tooltip
                    cursor={{ fill: "#f3f4f6" }}
                    content={({ active, payload }) =>
                      active && payload?.length ? (
                        <TooltipCaixa
                          titulo={crCurto(String(payload[0].payload.cr))}
                          linhas={[
                            `Aderência: ${payload[0].payload.aderencia}%`,
                            `${payload[0].payload.preenchidos} de ${payload[0].payload.esperados} esperados`,
                          ]}
                        />
                      ) : null
                    }
                  />
                  <Bar dataKey="aderencia" radius={[0, 4, 4, 0]} barSize={18}>
                    {porCrTop.map((c) => (
                      <Cell key={c.cr} fill={corAderencia(c.aderencia)} />
                    ))}
                    <LabelList dataKey="aderencia" position="right" formatter={(v) => `${v}%`} style={{ fontSize: 11, fill: "#374151" }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>

        <Card titulo="Validações pendentes por líder">
          {dados.lideresPendentes.length === 0 ? (
            <div className="flex h-full flex-col justify-center gap-3">
              <Vazio texto="Nenhum líder com validações pendentes. 👍" tom="ok" />
              {dados.lideresEmDia.length > 0 && (
                <div className="flex flex-wrap justify-center gap-2">
                  {dados.lideresEmDia.map((l) => (
                    <span key={l.authUserId} className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/12 px-3 py-1 text-sm text-emerald-700">
                      <ShieldCheck className="h-3.5 w-3.5" /> {tituloNome(l.nome)}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div style={{ height: Math.max(180, dados.lideresPendentes.length * 40) }}>
              <ResponsiveContainer>
                <BarChart data={dados.lideresPendentes.map((l) => ({ ...l, nomeCurto: tituloNome(l.nome) }))} layout="vertical" margin={{ top: 4, right: 40, left: 8, bottom: 4 }}>
                  <XAxis type="number" hide />
                  <YAxis type="category" dataKey="nomeCurto" width={160} tick={{ fontSize: 12, fill: "#374151" }} tickLine={false} axisLine={false} />
                  <Tooltip cursor={{ fill: "#f3f4f6" }} content={({ active, payload }) => (active && payload?.length ? <TooltipCaixa titulo={String(payload[0].payload.nomeCurto)} linhas={[`${payload[0].payload.pendentes} sessão(ões) pendente(s)`]} /> : null)} />
                  <Bar dataKey="pendentes" fill={AMBAR} radius={[0, 4, 4, 0]} barSize={20}>
                    <LabelList dataKey="pendentes" position="right" style={{ fontSize: 11, fill: "#374151" }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>
      </div>

      {/* detalhamento (tabelas) */}
      <details className="glass rounded-3xl p-6" open>
        <summary className="cursor-pointer select-none font-display text-base font-semibold text-navy">
          Detalhamento dos alertas
        </summary>
        <div className="mt-4 space-y-6">
          <BlocoTabela titulo="Colaboradores sem preenchimento" icone={UserX} vazio="Ninguém pendente. 👏" total={semPreenchimento.length}>
            {semPreenchimento.map((s, i) => (
              <li key={i} className="flex flex-wrap items-center gap-2 py-2 text-sm">
                <span className="min-w-[180px] flex-1 font-medium text-navy">{tituloNome(s.nome)}</span>
                <span className="text-muted-foreground">{crCurto(s.cr)} · {s.turno}</span>
                <span className="ml-auto rounded-full bg-red-500/12 px-2.5 py-0.5 text-xs font-semibold text-red-600">{s.diasFaltantes} dia(s)</span>
              </li>
            ))}
          </BlocoTabela>

          <BlocoTabela titulo="Não conformidades" icone={AlertTriangle} vazio="Nenhuma no período." total={naoConformidades.length}>
            {naoConformidades.map((n, i) => (
              <li key={i} className="flex flex-wrap items-center gap-2 py-2 text-sm">
                <span className="min-w-[160px] font-medium text-navy">{tituloNome(n.nome)}</span>
                <span className="text-muted-foreground">{crCurto(n.cr)}</span>
                <span className="text-amber-700">{n.itens.join(", ") || "item não conforme"}</span>
                <span className="ml-auto text-xs text-muted-foreground">{dataBR(n.data)}</span>
              </li>
            ))}
          </BlocoTabela>

          <BlocoTabela titulo="Turnos esperados sem sessão" icone={CalendarX} vazio="Todos os turnos tiveram sessão." total={turnosSemSessao.length}>
            {turnosSemSessao.map((t, i) => (
              <li key={i} className="flex flex-wrap items-center gap-2 py-2 text-sm">
                <span className="min-w-[200px] flex-1 font-medium text-navy">{crCurto(t.cr)} · {t.turno}</span>
                <span className="text-muted-foreground">{t.dias.map(dataBR).join(", ")}</span>
                <span className="ml-auto rounded-full bg-amber-400/20 px-2.5 py-0.5 text-xs font-semibold text-amber-700">{t.dias.length} dia(s)</span>
              </li>
            ))}
          </BlocoTabela>
        </div>
      </details>
    </div>
  )
}

function StatTile({ icone: Icone, rotulo, valor, detalhe, cor }: { icone: React.ComponentType<{ className?: string; style?: React.CSSProperties }>; rotulo: string; valor: number; detalhe: string; cor: string }) {
  return (
    <div className="glass rounded-3xl p-5">
      <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        <Icone className="h-4 w-4" style={{ color: cor }} /> {rotulo}
      </div>
      <p className="mt-2 font-display text-3xl font-semibold" style={{ color: valor > 0 ? cor : NAVY }}>{valor}</p>
      <p className="mt-0.5 text-xs text-muted-foreground">{detalhe}</p>
    </div>
  )
}

function Card({ titulo, children, className }: { titulo: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("glass rounded-3xl p-6", className)}>
      <p className="mb-4 font-display text-base font-semibold text-navy">{titulo}</p>
      {children}
    </div>
  )
}

function Vazio({ texto, tom = "neutro" }: { texto: string; tom?: "neutro" | "ok" }) {
  return <p className={cn("py-8 text-center text-sm", tom === "ok" ? "text-emerald-700" : "text-muted-foreground")}>{texto}</p>
}

function Legenda({ cor, rotulo }: { cor: string; rotulo: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-muted-foreground">
      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: cor }} /> {rotulo}
    </span>
  )
}

function BlocoTabela({ titulo, icone: Icone, vazio, total, children }: { titulo: string; icone: React.ComponentType<{ className?: string }>; vazio: string; total: number; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-1 flex items-center gap-2 text-sm font-semibold text-navy">
        <Icone className="h-4 w-4 text-teal" /> {titulo}
        {total > 0 && <span className="rounded-full bg-navy/8 px-2 py-0.5 text-xs font-medium text-muted-foreground">{total}</span>}
      </p>
      {total === 0 ? <p className="py-3 text-sm text-emerald-700">{vazio}</p> : <ul className="divide-y divide-navy/5">{children}</ul>}
    </div>
  )
}
