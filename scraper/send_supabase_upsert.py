import os
import json
import requests
from datetime import datetime, timezone
from pathlib import Path
from dotenv import load_dotenv

# Carregar .env do diretório pai
env_path = Path(__file__).parent.parent / '.env'
load_dotenv(env_path)

# Supabase Configuration
SUPABASE_URL = os.getenv("VITE_SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY")
USER_ID = os.getenv("SUPABASE_USER_ID", "default-user")
INPUT_FILE = "seuarmazemdrop_data.json"

def get_existing_product_ids():
    """Obter IDs dos produtos que já estão no Supabase"""
    print("📡 [1/5] Conectando ao Supabase para verificar produtos existentes...")
    headers = {
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': f'Bearer {SUPABASE_SERVICE_KEY}',
        'Content-Type': 'application/json'
    }
    
    url = f"{SUPABASE_URL}/rest/v1/products?user_id=eq.{USER_ID}&select=id"
    
    try:
        response = requests.get(url, headers=headers, timeout=30)
        if response.status_code == 200:
            data = response.json()
            print(f"✅ [1/5] {len(data)} produtos encontrados no Supabase")
            return set(p['id'] for p in data)
        else:
            print(f"❌ [1/5] Erro ao obter IDs existentes: {response.status_code}")
            return set()
    except Exception as e:
        print(f"❌ [1/5] Erro ao obter IDs existentes: {e}")
        return set()

def send_batch_upsert(batch, batch_num, total_batches):
    """Enviar um lote usando upsert (POST com Prefer header)"""
    print(f"📤 [{batch_num}/{total_batches}] Enviando lote de {len(batch)} produtos...")
    
    headers = {
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': f'Bearer {SUPABASE_SERVICE_KEY}',
        'Content-Type': 'application/json',
        'Prefer': 'resolution=ignore-duplicates,return=representation'
    }
    
    url = f"{SUPABASE_URL}/rest/v1/products"
    
    batch_data = []
    for product in batch:
        # Corrigir URL duplicada se houver
        product_url = product.get('url', '')
        if 'https://app.seuarmazemdrop.com.brhttps://app.seuarmazemdrop.com.br/' in product_url:
            product_url = product_url.replace('https://app.seuarmazemdrop.com.brhttps://app.seuarmazemdrop.com.br/', 'https://app.seuarmazemdrop.com.br/')
        
        batch_data.append({
            'id': product.get('id'),
            'user_id': USER_ID,
            'name': product.get('name'),
            'stock': product.get('stock', 0),
            'price': product.get('price', 0),
            'url': product_url,
            'image': product.get('image', ''),
            'color': product.get('color', ''),
            'size': product.get('size', ''),
            'updated_at': datetime.now(timezone.utc).isoformat()
        })
    
    try:
        response = requests.post(url, headers=headers, json=batch_data, timeout=60)
        
        if response.status_code in [200, 201]:
            print(f"✅ [{batch_num}/{total_batches}] Lote enviado com sucesso ({len(batch)} produtos)")
            return len(batch)
        else:
            print(f"❌ [{batch_num}/{total_batches}] Erro: {response.status_code}")
            print(f"   Resposta: {response.text[:200]}")
            return 0
            
    except Exception as e:
        print(f"❌ [{batch_num}/{total_batches}] Erro: {e}")
        return 0

def main():
    print("="*60)
    print("🚀 INICIANDO ENVIO PARA SUPABASE")
    print("="*60)
    
    # Verificar se arquivo JSON existe
    if not os.path.exists(INPUT_FILE):
        print(f"❌ Arquivo {INPUT_FILE} não encontrado")
        return
    
    # Verificar credenciais
    if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
        print("❌ Credenciais Supabase não configuradas")
        return
    
    # Carregar dados do JSON
    print(f"📂 [2/5] Lendo dados de {INPUT_FILE}...")
    with open(INPUT_FILE, 'r', encoding='utf-8') as f:
        all_products = json.load(f)
    
    print(f"✅ [2/5] {len(all_products)} produtos carregados do JSON")
    
    # Obter IDs existentes no Supabase
    existing_ids = get_existing_product_ids()
    
    # Filtrar apenas produtos faltantes
    print(f"🔍 [3/5] Filtrando produtos faltantes...")
    missing_products = [p for p in all_products if p['id'] not in existing_ids]
    print(f"✅ [3/5] {len(missing_products)} produtos faltantes identificados")
    
    if not missing_products:
        print("✅ Todos os produtos já estão no Supabase!")
        return
    
    # Enviar em lotes de 50
    batch_size = 50
    total_batches = (len(missing_products) + batch_size - 1) // batch_size
    
    print(f"📦 [4/5] Enviando em {total_batches} lotes de {batch_size} produtos...")
    print("="*60)
    
    success_count = 0
    for i in range(0, len(missing_products), batch_size):
        batch = missing_products[i:i + batch_size]
        batch_num = i // batch_size + 1
        
        sent = send_batch_upsert(batch, batch_num, total_batches)
        success_count += sent
        
        # Pequena pausa entre lotes
        if batch_num < total_batches:
            import time
            time.sleep(0.5)
    
    print("="*60)
    print(f"📊 [5/5] RESUMO: {success_count}/{len(missing_products)} produtos enviados")
    print("="*60)
    
    if success_count == len(missing_products):
        print("✅ Todos os produtos foram enviados com sucesso!")
    else:
        print(f"⚠️  {len(missing_products) - success_count} produtos não foram enviados")

if __name__ == "__main__":
    main()
