#!/usr/bin/env python3
"""
migrate.py — Supabase → PocketBase migration
Copia todos os registros de cada tabela do Supabase para o PocketBase.

Problemas resolvidos:
  1. IDs: Supabase usa 13 chars, PocketBase exige 15 → pad com "xx"
  2. Nomes: app_presencas→app_presenca, app_loja_vendas→app_loja
  3. Referências cruzadas nos campos data.* → atualizadas com os IDs padados
"""

import json
import urllib.request
import urllib.error
import time
import re

SUPABASE_URL = "https://yvjcbvhkoukptpfnhwgt.supabase.co"
SUPABASE_KEY = "sb_publishable_KI5wL-O5QMqkdVKOxJwKGg_yJkXlsrx"
PB_URL       = "https://picklemanager.fly.dev"

# Mapeamento: nome no Supabase → nome no PocketBase
TABLE_MAP = {
    "app_planos":       "app_planos",
    "app_quadras":      "app_quadras",
    "app_alunos":       "app_alunos",
    "app_professores":  "app_professores",
    "app_turmas":       "app_turmas",
    "app_matriculas":   "app_matriculas",
    "app_presencas":    "app_presenca",     # plural → singular
    "app_eventos":      "app_eventos",
    "app_financeiro":   "app_financeiro",
    "app_loja_vendas":  "app_loja",         # vendas → loja
    "app_manutencao":   "app_manutencao",
    "app_usuarios":     "app_usuarios",
}

def pad_id(id_str):
    """Padda IDs de 13 chars para 15 adicionando 'xx'."""
    if not id_str:
        return id_str
    s = str(id_str)
    if len(s) == 13:
        return s + "xx"
    return s  # já 15 chars (ou outro tamanho)

def sb_fetch_all(table):
    """Busca todos os registros do Supabase com paginação."""
    records = []
    offset  = 0
    limit   = 1000
    while True:
        url = f"{SUPABASE_URL}/rest/v1/{table}?limit={limit}&offset={offset}"
        req = urllib.request.Request(url, headers={
            "apikey":        SUPABASE_KEY,
            "Authorization": f"Bearer {SUPABASE_KEY}",
        })
        try:
            with urllib.request.urlopen(req, timeout=30) as r:
                batch = json.loads(r.read())
        except Exception as e:
            print(f"  ⚠ Erro ao buscar {table} offset={offset}: {e}")
            break
        if not batch:
            break
        records.extend(batch)
        if len(batch) < limit:
            break
        offset += limit
    return records

def collect_all_ids(all_tables_data):
    """Coleta todos os IDs de 13 chars de todas as tabelas."""
    ids_13 = set()
    for records in all_tables_data.values():
        for rec in records:
            rid = rec.get("id", "")
            if rid and len(rid) == 13:
                ids_13.add(rid)
    return ids_13

def replace_ids_in_data(data_obj, ids_13_set):
    """
    Percorre recursivamente o objeto data e substitui todas as
    ocorrências de IDs de 13 chars pela versão padada (+ 'xx').
    Trata strings, listas e dicts.
    """
    if isinstance(data_obj, str):
        if data_obj in ids_13_set and len(data_obj) == 13:
            return data_obj + "xx"
        return data_obj
    elif isinstance(data_obj, list):
        return [replace_ids_in_data(item, ids_13_set) for item in data_obj]
    elif isinstance(data_obj, dict):
        return {k: replace_ids_in_data(v, ids_13_set) for k, v in data_obj.items()}
    return data_obj

def pb_create(collection, record):
    """Cria um registro no PocketBase. Retorna (ok, status_code, msg)."""
    url  = f"{PB_URL}/api/collections/{collection}/records"
    body = json.dumps(record).encode()
    req  = urllib.request.Request(url, data=body, headers={
        "Content-Type": "application/json",
    }, method="POST")
    try:
        with urllib.request.urlopen(req, timeout=15) as r:
            return True, r.status, ""
    except urllib.error.HTTPError as e:
        body = e.read().decode()
        return False, e.code, body
    except Exception as e:
        return False, 0, str(e)

def main():
    print("PickleManager — Migração Supabase → PocketBase")
    print(f"Origem:  {SUPABASE_URL}")
    print(f"Destino: {PB_URL}")
    print()

    # ── 1. Busca tudo do Supabase ────────────────────────────────────────
    print("Carregando dados do Supabase...")
    all_data = {}
    for sb_table in TABLE_MAP:
        records = sb_fetch_all(sb_table)
        all_data[sb_table] = records
        print(f"  {sb_table}: {len(records)} registros")

    # ── 2. Coleta todos os IDs de 13 chars para substituição ─────────────
    ids_13 = collect_all_ids(all_data)
    print(f"\n  IDs de 13 chars encontrados: {len(ids_13)}")

    # ── 3. Migra cada tabela ─────────────────────────────────────────────
    total_ok = total_skip = total_fail = 0

    for sb_table, pb_collection in TABLE_MAP.items():
        records = all_data[sb_table]
        print(f"\n{'='*52}")
        print(f"  {sb_table} → {pb_collection}  ({len(records)} registros)")
        print(f"{'='*52}")

        ok = skip = fail = 0
        for rec in records:
            original_id = rec.get("id", "")
            padded_id   = pad_id(original_id)

            # Atualiza cross-references no campo data
            data_raw = rec.get("data", {})
            data_updated = replace_ids_in_data(data_raw, ids_13)

            payload = {
                "id":        padded_id,
                "tenant_id": rec.get("tenant_id", ""),
                "data":      data_updated,
            }
            if not payload["id"]:
                del payload["id"]

            success, code, msg = pb_create(pb_collection, payload)
            if success:
                ok += 1
            elif code == 400 and ('"id"' in msg or "already" in msg.lower() or "unique" in msg.lower()):
                skip += 1
            elif code == 400 and "length" in msg.lower():
                # ID ainda com tamanho errado — reporta
                fail += 1
                if fail <= 2:
                    print(f"  ✗ ID size error: original={original_id} ({len(original_id)}) padded={padded_id} ({len(padded_id)})")
            else:
                fail += 1
                if fail <= 3:
                    print(f"  ✗ id={padded_id} HTTP {code}: {msg[:100]}")

            time.sleep(0.04)

        print(f"  ✓ criados: {ok}  |  ⚡ já existiam: {skip}  |  ✗ erros: {fail}")
        total_ok   += ok
        total_skip += skip
        total_fail += fail

    print(f"\n{'='*52}")
    print(f"  TOTAL: {total_ok} criados | {total_skip} já existiam | {total_fail} erros")
    print(f"{'='*52}")

if __name__ == "__main__":
    main()
