import os
import json
import requests
from dotenv import load_dotenv
from pathlib import Path

# Carregar .env
env_path = Path(__file__).parent / '.env'
load_dotenv(env_path)

SUPABASE_URL = os.getenv("VITE_SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY")
JSON_FILE = "seuarmazemdrop_data.json"

print("🔍 Comparando dados do JSON local com Supabase...")
print("="*60)

# Carregar JSON local
print(f"\n📂 Lendo JSON local: {JSON_FILE}")
with open(JSON_FILE, 'r', encoding='utf-8') as f:
    local_data = json.load(f)

print(f"Total de produtos no JSON: {len(local_data)}")

# Buscar dados do Supabase
print(f"\n📦 Buscando dados do Supabase...")
headers = {
    'apikey': SUPABASE_SERVICE_KEY,
    'Authorization': f'Bearer {SUPABASE_SERVICE_KEY}',
    'Content-Type': 'application/json'
}

url = f"{SUPABASE_URL}/rest/v1/products?select=*"
response = requests.get(url, headers=headers, timeout=30)
supabase_data = response.json()

print(f"Total de produtos no Supabase: {len(supabase_data)}")

# Criar dicionários para comparação
local_by_id = {p['id']: p for p in local_data}
supabase_by_id = {p['id']: p for p in supabase_data}

# Encontrar IDs que estão no JSON mas não no Supabase
missing_in_supabase = set(local_by_id.keys()) - set(supabase_by_id.keys())
print(f"\n❌ IDs no JSON mas não no Supabase: {len(missing_in_supabase)}")
if missing_in_supabase:
    print(f"   Exemplos: {list(missing_in_supabase)[:5]}")

# Encontrar IDs que estão no Supabase mas não no JSON
extra_in_supabase = set(supabase_by_id.keys()) - set(local_by_id.keys())
print(f"\n➕ IDs no Supabase mas não no JSON: {len(extra_in_supabase)}")
if extra_in_supabase:
    print(f"   Exemplos: {list(extra_in_supabase)[:5]}")

# Comparar estoque para IDs comuns
print(f"\n📊 Comparando estoque para {len(local_by_id.keys() & supabase_by_id.keys())} produtos comuns...")
stock_mismatches = []
price_mismatches = []

for id_ in local_by_id.keys() & supabase_by_id.keys():
    local = local_by_id[id_]
    supabase = supabase_by_id[id_]
    
    if local.get('stock') != supabase.get('stock'):
        stock_mismatches.append({
            'id': id_,
            'local_stock': local.get('stock'),
            'supabase_stock': supabase.get('stock'),
            'name': local.get('name', '')[:50]
        })
    
    if local.get('price') != supabase.get('price'):
        price_mismatches.append({
            'id': id_,
            'local_price': local.get('price'),
            'supabase_price': supabase.get('price'),
            'name': local.get('name', '')[:50]
        })

print(f"\n❌ Divergências de estoque: {len(stock_mismatches)}")
if stock_mismatches:
    print(f"   Top 10:")
    for m in stock_mismatches[:10]:
        print(f"   - {m['id']}: Local={m['local_stock']}, Supabase={m['supabase_stock']} - {m['name']}")

print(f"\n❌ Divergências de preço: {len(price_mismatches)}")
if price_mismatches:
    print(f"   Top 10:")
    for m in price_mismatches[:10]:
        print(f"   - {m['id']}: Local={m['local_price']}, Supabase={m['supabase_price']} - {m['name']}")

# Resumo
print("\n" + "="*60)
print("📋 RESUMO:")
print(f"   Total JSON: {len(local_data)}")
print(f"   Total Supabase: {len(supabase_data)}")
print(f"   Diferença: {len(supabase_data) - len(local_data)}")
print(f"   IDs faltando no Supabase: {len(missing_in_supabase)}")
print(f"   IDs extras no Supabase: {len(extra_in_supabase)}")
print(f"   Divergências de estoque: {len(stock_mismatches)}")
print(f"   Divergências de preço: {len(price_mismatches)}")
