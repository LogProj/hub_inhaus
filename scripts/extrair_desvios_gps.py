# Extrai da planilha "Controle de Aderência.xlsx" (aba "Ocorrências LOG") apenas as
# ocorrências com Responsável Interno = "GPS" e grava scripts/desvios_gps.json.
# Uso: python scripts/extrair_desvios_gps.py [caminho_da_planilha]
# Pré-requisito: openpyxl. É um passo de PRÉ-PROCESSAMENTO do seed (o insert é feito
# por scripts/seed_desvios_gps.mjs, que lê o JSON). Não toca no banco.
import json
import sys
import datetime
import openpyxl

CAMINHO_PADRAO = (
    r"C:\Users\fernando.c.souza\Documents\Projetos\0.1 ATLAS COPCO"
    r"\0.1 CONTROLE DE ADERÊNCIA\Controle de Aderência.xlsx"
)


def status_do_texto(t):
    s = (str(t).strip().lower()) if t is not None else ""
    if s == "sim":
        return "CONCLUIDA"
    if s in ("não", "nao"):
        return "PENDENTE"
    return "EM_TRATATIVA"


def iso_data(v):
    if isinstance(v, (datetime.datetime, datetime.date)):
        return v.strftime("%Y-%m-%d")
    return None


def texto(v):
    if v is None:
        return None
    s = str(v).strip()
    return s if s else None


def numero(v):
    try:
        return float(v)
    except (TypeError, ValueError):
        return None


def main():
    caminho = sys.argv[1] if len(sys.argv) > 1 else CAMINHO_PADRAO
    wb = openpyxl.load_workbook(caminho, data_only=True, read_only=True)
    ws = wb["Ocorrências LOG"]
    # Índices 0-based na tupla da linha (cabeçalho na linha 1):
    # 1 Responsável, 2 OTB/WBS, 3 Tipo, 4 Divisão, 5 Solicitante, 6 Data ocorrência,
    # 7 Cliente, 8 Motivo, 9 Causa Raiz, 10 Resumo, 11 Solução, 12 Caso Resolvido?,
    # 13 Data faturamento, 14 Data separação, 15 Valor.
    linhas = []
    for r in ws.iter_rows(min_row=2, values_only=True):
        resp = r[1] if len(r) > 1 else None
        if not resp or str(resp).strip().upper() != "GPS":
            continue
        g = lambda i: r[i] if len(r) > i else None
        linhas.append(
            {
                "responsavelInterno": texto(g(1)),
                "numeroOtbWbs": texto(g(2)),
                "tipo": texto(g(3)),
                "divisao": texto(g(4)),
                "solicitante": texto(g(5)),
                "dataOcorrencia": iso_data(g(6)),
                "clienteFinal": texto(g(7)),
                "motivo": texto(g(8)),
                "causaRaiz": texto(g(9)),
                "resumoCaso": texto(g(10)),
                "solucao": texto(g(11)),
                "status": status_do_texto(g(12)),
                "dataFaturamento": iso_data(g(13)),
                "dataSeparacao": iso_data(g(14)),
                "valor": numero(g(15)),
            }
        )
    with open("scripts/desvios_gps.json", "w", encoding="utf-8") as f:
        json.dump(linhas, f, ensure_ascii=False, indent=1)
    print(f"Extraídas {len(linhas)} linhas GPS -> scripts/desvios_gps.json")


if __name__ == "__main__":
    main()
