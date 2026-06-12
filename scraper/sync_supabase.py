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
    print("🔄 Sincronizando JSON local com Supabase...")
    
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
        # 1. Buscar todos os IDs atuais no Supabase
        print("\n🔍 Buscando IDs atuais no Supabase...")
        url = f"{SUPABASE_URL}/rest/v1/products?select=id"
        response = requests.get(url, headers=headers, timeout=30)
        supabase_ids = {p['id'] for p in response.json()}
        print(f"   {len(supabase_ids)} produtos no Supabase")
        
        # 2. Identificar IDs que estão no Supabase mas não no JSON (para deletar)
        json_ids = {p['id'] for p in products}
        ids_to_delete = supabase_ids - json_ids
        print(f"\n🗑️  {len(ids_to_delete)} produtos antigos para deletar do Supabase")
        
        # Deletar produtos antigos em lotes
        if ids_to_delete:
            batch_size = 50  # Reduzir para evitar erros de URL muito longa
            for i in range(0, len(ids_to_delete), batch_size):
                batch = list(ids_to_delete)[i:i + batch_size]
                print(f"   Deletando lote {i//batch_size + 1} ({len(batch)} produtos)...")
                
                # Deletar um por um para garantir
                for id_ in batch:
                    delete_url = f"{SUPABASE_URL}/rest/v1/products?id=eq.{id_}"
                    response = requests.delete(delete_url, headers=headers, timeout=30)
                    if response.status_code in [200, 204]:
                        print(f"     ✅ {id_} deletado")
                    else:
                        print(f"     ❌ Erro ao deletar {id_}: {response.status_code}")
                
                print(f"   ✅ Lote {i//batch_size + 1} concluído")
        
        # 3. Enviar/atualizar todos os produtos do JSON
        print(f"\n📤 Enviando/atualizando {len(products)} produtos...")
        
        url = f"{SUPABASE_URL}/rest/v1/products"
        batch_size = 25
        
        for i in range(0, len(products), batch_size):
            batch = products[i:i + batch_size]
            print(f"   Lote {i//batch_size + 1}/{(len(products) + batch_size - 1)//batch_size} ({len(batch)} produtos)...")
            
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
                
                # Tentar PATCH (update) primeiro
                patch_url = f"{url}?id=eq.{product.get('id')}"
                response = requests.patch(patch_url, headers=headers, json=data, timeout=30)
                
                if response.status_code in [200, 204]:
                    print(f"     ✅ {product.get('id')}: atualizado")
                elif response.status_code == 404:
                    # Produto não existe, tentar POST (insert)
                    response = requests.post(url, headers=headers, json=data, timeout=30)
                    if response.status_code in [200, 201]:
                        print(f"     ✅ {product.get('id')}: inserido")
                    else:
                        print(f"     ❌ Erro produto {product.get('id')}: {response.status_code}")
                else:
                    print(f"     ❌ Erro produto {product.get('id')}: {response.status_code}")
        
        # 4. Atualizar histórico de estoque
        print(f"\n📈 Atualizando histórico de estoque...")
        today = datetime.now().isoformat().split('T')[0]
        history_data = [
            {
                'product_id': p['id'],
                'date': today,
                'quantity': p['stock'],
                'price': p['price']
            }
            for p in products
        ]
        
        # Deletar histórico do dia atual para evitar duplicatas
        print(f"   Deletando histórico do dia {today}...")
        delete_history_url = f"{SUPABASE_URL}/rest/v1/inventory_history?date=eq.{today}"
        requests.delete(delete_history_url, headers=headers, timeout=30)
        
        # Inserir novo histórico
        print(f"   Inserindo novo histórico...")
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
        print("✅ Sincronização concluída com sucesso!")
        print(f"   {len(products)} produtos sincronizados")
        print("="*60)
        
    except Exception as e:
        print(f"❌ Erro na sincronização: {e}")

if __name__ == "__main__":
    main()
