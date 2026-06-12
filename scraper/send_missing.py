import os
import json
import requests
from dotenv import load_dotenv
from pathlib import Path
from datetime import datetime

# Carregar .env do diretório pai
env_path = Path(__file__).parent.parent / '.env'
load_dotenv(env_path)

# Supabase Configuration
SUPABASE_URL = os.getenv("VITE_SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY")
USER_ID = os.getenv("SUPABASE_USER_ID", "default-user")
INPUT_FILE = "seuarmazemdrop_data.json"

def main():
    print("🔄 Enviando produtos faltantes para Supabase...")
    
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
        products = json.load(f)
    
    print(f"📊 {len(products)} produtos no JSON")
    
    headers = {
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': f'Bearer {SUPABASE_SERVICE_KEY}',
        'Content-Type': 'application/json'
    }
    
    try:
        # Buscar IDs atuais no Supabase
        print("\n🔍 Buscando IDs atuais no Supabase...")
        url = f"{SUPABASE_URL}/rest/v1/products?select=id"
        response = requests.get(url, headers=headers, timeout=30)
        supabase_ids = {p['id'] for p in response.json()}
        print(f"   {len(supabase_ids)} produtos no Supabase")
        
        # Identificar produtos que estão no JSON mas não no Supabase
        json_ids = {p['id'] for p in products}
        missing_ids = json_ids - supabase_ids
        print(f"\n📤 {len(missing_ids)} produtos faltantes para enviar")
        
        # Filtrar apenas produtos faltantes
        missing_products = [p for p in products if p['id'] in missing_ids]
        
        # Enviar produtos faltantes
        print(f"\n📤 Enviando {len(missing_products)} produtos...")
        
        url = f"{SUPABASE_URL}/rest/v1/products"
        batch_size = 25
        
        for i in range(0, len(missing_products), batch_size):
            batch = missing_products[i:i + batch_size]
            print(f"   Lote {i//batch_size + 1}/{(len(missing_products) + batch_size - 1)//batch_size} ({len(batch)} produtos)...")
            
            for product in batch:
                data = {
                    'id': product.get('id'),
                    'user_id': USER_ID,
                    'name': product.get('name'),
                    'sku': product.get('id'),
                    'stock': product.get('stock', 0),
                    'price': product.get('price', 0),
                    'url': product.get('url'),
                    'image': product.get('image', ''),
                    'color': product.get('color', ''),
                    'size': product.get('size', '')
                }
                
                response = requests.post(url, headers=headers, json=data, timeout=30)
                if response.status_code in [200, 201]:
                    print(f"     ✅ {product.get('id')}: inserido")
                else:
                    print(f"     ❌ Erro produto {product.get('id')}: {response.status_code}")
        
        # Atualizar histórico de estoque para produtos faltantes
        print(f"\n📈 Atualizando histórico de estoque...")
        today = datetime.now().isoformat().split('T')[0]
        history_data = [
            {
                'product_id': p['id'],
                'date': today,
                'quantity': p['stock'],
                'price': p['price']
            }
            for p in missing_products
        ]
        
        history_url = f"{SUPABASE_URL}/rest/v1/inventory_history"
        batch_size = 100
        
        for i in range(0, len(history_data), batch_size):
            batch = history_data[i:i + batch_size]
            headers_with_prefer = headers.copy()
            headers_with_prefer['Prefer'] = 'resolution=ignore-duplicates'
            
            response = requests.post(history_url, headers=headers_with_prefer, json=batch, timeout=30)
            if response.status_code in [200, 201]:
                print(f"   ✅ Histórico lote {i//batch_size + 1} enviado")
            elif response.status_code == 409:
                print(f"   ⏭️  Histórico lote {i//batch_size + 1}: ignorado (já existe)")
        
        print("\n" + "="*60)
        print("✅ Produtos faltantes enviados com sucesso!")
        print(f"   {len(missing_products)} produtos adicionados")
        print("="*60)
        
    except Exception as e:
        print(f"❌ Erro ao enviar produtos faltantes: {e}")

if __name__ == "__main__":
    main()
