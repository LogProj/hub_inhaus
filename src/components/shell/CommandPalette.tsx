"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import * as Dialog from "@radix-ui/react-dialog"
import { useRouter } from "next/navigation"
import { Search } from "lucide-react"
import { buscarTelas, TELA_HOME, type TelaComDominio } from "@/lib/domains"
import { useTema } from "@/lib/theme"
import { cn } from "@/lib/utils"

/**
 * ⌘K / Ctrl+K em qualquer lugar do shell. Nome de evento exportado porque a
 * AppTopbar precisa abrir a mesma instância a partir do botão de busca —
 * evita levantar um Context só para isso.
 */
export const EVENTO_ABRIR_COMMAND_PALETTE = "inhaus:abrir-command-palette"

type ItemTela = {
  tipo: "tela"
  key: string
  label: string
  grupo: string
  desabilitado: boolean
  onSelecionar: () => void
}

type ItemAcao = {
  tipo: "acao"
  key: string
  label: string
  grupo: "Ações"
  desabilitado: false
  onSelecionar: () => void
}

type Item = ItemTela | ItemAcao

function normalizar(texto: string) {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
}

export function CommandPalette() {
  const [aberto, setAberto] = useState(false)
  const [termo, setTermo] = useState("")
  const [indiceAtivo, setIndiceAtivo] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()
  const { tema, alternar } = useTema()

  // Atalho global. Funciona mesmo com a palette fechada.
  useEffect(() => {
    function aoTeclar(evento: KeyboardEvent) {
      if ((evento.metaKey || evento.ctrlKey) && evento.key.toLowerCase() === "k") {
        evento.preventDefault()
        setAberto((atual) => !atual)
      }
    }
    window.addEventListener("keydown", aoTeclar)
    return () => window.removeEventListener("keydown", aoTeclar)
  }, [])

  // Gatilho da topbar (botão de busca) — mesma instância, aberta por evento.
  useEffect(() => {
    function aoAbrir() {
      setAberto(true)
    }
    window.addEventListener(EVENTO_ABRIR_COMMAND_PALETTE, aoAbrir)
    return () => window.removeEventListener(EVENTO_ABRIR_COMMAND_PALETTE, aoAbrir)
  }, [])

  function fechar() {
    setAberto(false)
    setTermo("")
    setIndiceAtivo(0)
  }

  function irPara(href: string) {
    router.push(href)
    fechar()
  }

  // Sem termo digitado: mostra a Home como ponto de partida — o resto se
  // encontra digitando. `buscarTelas("")` devolve vazio de propósito.
  const telasEncontradas: TelaComDominio[] = useMemo(() => {
    const alvo = termo.trim()
    if (!alvo) return [TELA_HOME]
    return buscarTelas(alvo)
  }, [termo])

  const acoesDisponiveis: ItemAcao[] = useMemo(() => {
    const todas: ItemAcao[] = [
      {
        tipo: "acao",
        key: "alternar-tema",
        label: tema === "dark" ? "Mudar para o tema claro" : "Mudar para o tema escuro",
        grupo: "Ações",
        desabilitado: false,
        onSelecionar: () => {
          alternar()
          fechar()
        },
      },
      {
        tipo: "acao",
        key: "ir-home",
        label: "Ir para a Home",
        grupo: "Ações",
        desabilitado: false,
        onSelecionar: () => irPara("/home"),
      },
    ]
    const alvo = normalizar(termo)
    if (!alvo) return todas
    return todas.filter((acao) => normalizar(acao.label).includes(alvo))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [termo, tema])

  const itensTela: ItemTela[] = telasEncontradas.map((tela) => ({
    tipo: "tela",
    key: tela.key,
    label: tela.label,
    grupo: tela.dominioLabel,
    desabilitado: Boolean(tela.emBreve),
    onSelecionar: () => irPara(tela.href),
  }))

  const itens: Item[] = [...itensTela, ...acoesDisponiveis]
  const itensNavegaveis = itens.filter((item) => !item.desabilitado)

  useEffect(() => {
    setIndiceAtivo(0)
  }, [termo, aberto])

  function aoTeclarInput(evento: React.KeyboardEvent<HTMLInputElement>) {
    if (itensNavegaveis.length === 0) return
    if (evento.key === "ArrowDown") {
      evento.preventDefault()
      setIndiceAtivo((atual) => (atual + 1) % itensNavegaveis.length)
    } else if (evento.key === "ArrowUp") {
      evento.preventDefault()
      setIndiceAtivo((atual) => (atual - 1 + itensNavegaveis.length) % itensNavegaveis.length)
    } else if (evento.key === "Enter") {
      evento.preventDefault()
      itensNavegaveis[indiceAtivo]?.onSelecionar()
    }
  }

  const itemAtivo = itensNavegaveis[indiceAtivo]

  // Agrupa por `grupo`, preservando a ordem de primeira ocorrência.
  const grupos: { nome: string; itens: Item[] }[] = []
  for (const item of itens) {
    let grupo = grupos.find((g) => g.nome === item.grupo)
    if (!grupo) {
      grupo = { nome: item.grupo, itens: [] }
      grupos.push(grupo)
    }
    grupo.itens.push(item)
  }

  return (
    <Dialog.Root open={aberto} onOpenChange={(valor) => (valor ? setAberto(true) : fechar())}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-navy/40 backdrop-blur-[2px]" />
        <Dialog.Content
          className="fixed left-1/2 top-[18%] z-50 w-[calc(100%-2rem)] max-w-[560px] -translate-x-1/2 overflow-hidden rounded-lg border border-hairline bg-card shadow-lift data-[state=open]:[animation:palette-entrada_220ms_cubic-bezier(0.22,1,0.36,1)_both]"
          onOpenAutoFocus={(evento) => {
            evento.preventDefault()
            inputRef.current?.focus()
          }}
        >
          {/* Keyframe local: escala + leve subida + fade. Não existe token de
              animação com escala em tailwind.config.ts, então fica aqui. */}
          <style>{`
            @keyframes palette-entrada {
              from { opacity: 0; transform: translateY(8px) scale(0.98); }
              to { opacity: 1; transform: translateY(0) scale(1); }
            }
          `}</style>

          <Dialog.Title className="sr-only">Busca de indicadores</Dialog.Title>
          <Dialog.Description className="sr-only">
            Busque por telas do hub ou execute uma ação rápida.
          </Dialog.Description>

          <div className="flex items-center gap-3 border-b border-hairline px-4 py-3">
            <Search className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} aria-hidden="true" />
            <input
              ref={inputRef}
              value={termo}
              onChange={(evento) => setTermo(evento.target.value)}
              onKeyDown={aoTeclarInput}
              role="combobox"
              aria-expanded={aberto}
              aria-controls="command-palette-listbox"
              aria-activedescendant={itemAtivo ? `opcao-${itemAtivo.key}` : undefined}
              aria-autocomplete="list"
              autoComplete="off"
              placeholder="Buscar tela, indicador ou ação..."
              className="w-full border-0 bg-transparent font-sans text-[15px] text-foreground outline-none placeholder:text-muted-foreground"
            />
          </div>

          <div
            id="command-palette-listbox"
            role="listbox"
            aria-label="Resultados da busca"
            className="max-h-[360px] overflow-y-auto p-2"
          >
            {grupos.length === 0 && (
              <p className="px-3 py-6 text-center text-sm text-muted-foreground">
                Nada encontrado para &quot;{termo}&quot;.
              </p>
            )}
            {grupos.map((grupo) => (
              <div key={grupo.nome} className="mb-1 last:mb-0">
                <p className="px-3 pb-1 pt-2 text-label uppercase text-muted-foreground">
                  {grupo.nome}
                </p>
                {grupo.itens.map((item) => {
                  const ativo = itemAtivo?.key === item.key
                  return (
                    <button
                      key={item.key}
                      id={`opcao-${item.key}`}
                      role="option"
                      aria-selected={ativo}
                      aria-disabled={item.desabilitado}
                      type="button"
                      tabIndex={-1}
                      disabled={item.desabilitado}
                      onClick={() => !item.desabilitado && item.onSelecionar()}
                      onMouseEnter={() => {
                        if (item.desabilitado) return
                        const posicao = itensNavegaveis.findIndex((i) => i.key === item.key)
                        if (posicao >= 0) setIndiceAtivo(posicao)
                      }}
                      className={cn(
                        "relative flex w-full items-center justify-between gap-3 rounded-md px-3 py-2 text-left text-sm transition-colors duration-[160ms] ease-calm",
                        item.desabilitado
                          ? "cursor-default text-muted-foreground/60"
                          : "text-foreground hover:bg-muted",
                        ativo &&
                          !item.desabilitado &&
                          "bg-muted before:absolute before:left-0 before:top-1/2 before:h-5 before:w-[2px] before:-translate-y-1/2 before:bg-teal",
                      )}
                    >
                      <span>{item.label}</span>
                      {item.tipo === "tela" && item.desabilitado && (
                        <span className="text-label shrink-0 rounded-sm border border-hairline px-1.5 py-0.5 text-muted-foreground">
                          em breve
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
            ))}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
