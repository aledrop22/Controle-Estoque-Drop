import os
import json
import requests
from datetime import datetime
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
    headers = {
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': f'Bearer {SUPABASE_SERVICE_KEY}',
        'Content-Type': 'application/json'
    }
    
    url = f"{SUPABASE_URL}/rest/v1/products?user_id=eq.{USER_ID}&select=id"
    
    try:
        response = requests.get(url, headers=headers)
        if response.status_code == 200:
            data = response.json()
            return set(p['id'] for p in data)
        else:
            print(f"❌ Erro ao obter IDs existentes: {response.status_code}")
            return set()
    except Exception as e:
        print(f"❌ Erro ao obter IDs existentes: {e}")
        return set()

def send_batch_to_supabase(batch, batch_num, total_batches):
    """Enviar um lote de produtos para o Supabase"""
    headers = {
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': f'Bearer {SUPABASE_SERVICE_KEY}',
        'Content-Type': 'application/json'
    }
    
    url = f"{SUPABASE_URL}/rest/v1/products"
    
    batch_data = []
    for product in batch:
        # Corrigir URL duplicada se houver
        url = product.get('url', '')
        if 'https://app.seuarmazemdrop.com.brhttps://app.seuarmazemdrop.com.br/' in url:
            url = url.replace('https://app.seuarmazemdrop.com.brhttps://app.seuarmazemdrop.com.br/', 'https://app.seuarmazemdrop.com.br/')
        
        batch_data.append({
            'id': product.get('id'),
            'index_num': product.get('index'),
            'user_id': USER_ID,
            'name': product.get('name'),
            'stock': product.get('stock', 0),
            'price': product.get('price', 0),
            'url': url,
            'image': product.get('image', ''),
            'color': product.get('color', ''),
            'size': product.get('size', ''),
            'updated_at': datetime.utcnow().isoformat()
        })
    
    try:
        response = requests.post(url, headers=headers, json=batch_data, timeout=30)
        
        if response.status_code in [200, 201]:
            print(f"  ✅ Lote {batch_num}/{total_batches} enviado ({len(batch)} produtos)")
            return True
        else:
            print(f"  ❌ Erro no lote {batch_num}/{total_batches}: {response.status_code}")
            # Tentar um por um
            success_count = 0
            for product in batch:
                try:
                    # Corrigir URL duplicada se houver
                    url = product.get('url', '')
                    if 'https://app.seuarmazemdrop.com.brhttps://app.seuarmazemdrop.com.br/' in url:
                        url = url.replace('https://app.seuarmazemdrop.com.brhttps://app.seuarmazemdrop.com.br/', 'https://app.seuarmazemdrop.com.br/')
                    
                    data = {
                        'id': product.get('id'),
                        'index_num': product.get('index'),
                        'user_id': USER_ID,
                        'name': product.get('name'),
                        'stock': product.get('stock', 0),
                        'price': product.get('price', 0),
                        'url': url,
                        'image': product.get('image', ''),
                        'color': product.get('color', ''),
                        'size': product.get('size', ''),
                        'updated_at': datetime.utcnow().isoformat()
                    }
                    
                    # Tentar PATCH (update) primeiro
                    patch_url = f"{url}?id=eq.{product.get('id')}"
                    response = requests.patch(patch_url, headers=headers, json=data, timeout=30)
                    
                    if response.status_code in [200, 204]:
                        success_count += 1
                    else:
                        # Se PATCH falhar, tentar POST (insert)
                        response = requests.post(url, headers=headers, json=data, timeout=30)
                        if response.status_code in [200, 201]:
                            success_count += 1
                        else:
                            print(f"    ❌ Erro produto {product.get('id')}: {response.status_code}")
                except Exception as e:
                    print(f"    ❌ Erro produto {product.get('id')}: {e}")
            
            print(f"  ⚠️  Lote {batch_num}/{total_batches}: {success_count}/{len(batch)} produtos enviados")
            return success_count > 0
            
    except Exception as e:
        print(f"  ❌ Erro no lote {batch_num}/{total_batches}: {e}")
        return False

def main():
    print("📤 Enviando produtos faltantes para Supabase (lotes de 50)...")
    
    # Verificar se arquivo JSON existe
    if not os.path.exists(INPUT_FILE):
        print(f"❌ Arquivo {INPUT_FILE} não encontrado")
        return
    
    # Verificar credenciais
    if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
        print("❌ Credenciais Supabase não configuradas")
        return
    
    # Carregar dados do JSON
    print(f"📂 Lendo dados de {INPUT_FILE}...")
    with open(INPUT_FILE, 'r', encoding='utf-8') as f:
        all_products = json.load(f)
    
    print(f"📊 {len(all_products)} produtos no JSON local")
    
    # Obter IDs existentes no Supabase
    print("🔍 Verificando produtos existentes no Supabase...")
    existing_ids = get_existing_product_ids()
    print(f"📊 {len(existing_ids)} produtos já existem no Supabase")
    
    # Filtrar apenas produtos faltantes
    missing_products = [p for p in all_products if p['id'] not in existing_ids]
    print(f"📦 {len(missing_products)} produtos faltantes para enviar")
    
    if not missing_products:
        print("✅ Todos os produtos já estão no Supabase")
        return
    
    # Enviar em lotes de 50
    batch_size = 50
    total_batches = (len(missing_products) + batch_size - 1) // batch_size
    
    print(f"📤 Enviando em {total_batches} lotes de {batch_size} produtos...")
    
    success_count = 0
    for i in range(0, len(missing_products), batch_size):
        batch = missing_products[i:i + batch_size]
        batch_num = i // batch_size + 1
        
        if send_batch_to_supabase(batch, batch_num, total_batches):
            success_count += len(batch)
        
        # Pequena pausa entre lotes para não sobrecarregar
        if batch_num < total_batches:
            import time
            time.sleep(1)
    
    print(f"\n✅ {success_count}/{len(missing_products)} produtos enviados para Supabase")
    
    # Enviar histórico de estoque para os novos produtos
    if success_count > 0:
        print("📈 Atualizando histórico de estoque...")
        today = datetime.utcnow().isoformat().split('T')[0]
        
        # Enviar histórico em lotes de 100
        history_batch_size = 100
        history_data = [
            {
                'product_id': p['id'],
                'date': today,
                'quantity': p['stock'],
                'price': p['price']
            }
            for p in missing_products
        ]
        
        headers = {
            'apikey': SUPABASE_SERVICE_KEY,
            'Authorization': f'Bearer {SUPABASE_SERVICE_KEY}',
            'Content-Type': 'application/json'
        }
        
        history_url = f"{SUPABASE_URL}/rest/v1/inventory_history"
        total_history_batches = (len(history_data) + history_batch_size - 1) // history_batch_size
        
        for i in range(0, len(history_data), history_batch_size):
            batch = history_data[i:i + history_batch_size]
            batch_num = i // history_batch_size + 1
            
            try:
                response = requests.post(history_url, headers=headers, json=batch, timeout=30)
                if response.status_code in [200, 201]:
                    print(f"  ✅ Histórico lote {batch_num}/{total_history_batches} enviado")
                else:
                    print(f"  ❌ Erro no histórico lote {batch_num}/{total_history_batches}: {response.status_code}")
            except Exception as e:
                print(f"  ❌ Erro no histórico lote {batch_num}/{total_history_batches}: {e}")
        
        print("✅ Histórico de estoque atualizado")

if __name__ == "__main__":
    main()
