import os
import requests
from dotenv import load_dotenv
from pathlib import Path

# Carregar .env
env_path = Path(__file__).parent / '.env'
load_dotenv(env_path)

SUPABASE_URL = os.getenv("VITE_SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY")

print("🔍 Testando conexão direta com Supabase...")
print("="*60)

if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
    print("❌ Credenciais não encontradas no .env")
    exit(1)

print(f"URL: {SUPABASE_URL}")
print(f"Service Key: {SUPABASE_SERVICE_KEY[:20]}...")

headers = {
    'apikey': SUPABASE_SERVICE_KEY,
    'Authorization': f'Bearer {SUPABASE_SERVICE_KEY}',
    'Content-Type': 'application/json'
}

try:
    # Testar conexão buscando produtos
    print("\n📦 Buscando produtos...")
    url = f"{SUPABASE_URL}/rest/v1/products?select=*&limit=5"
    response = requests.get(url, headers=headers, timeout=10)
    
    print(f"Status: {response.status_code}")
    
    if response.status_code == 200:
        data = response.json()
        print(f"✅ Conexão funcionando!")
        print(f"Total de produtos (amostra): {len(data)}")
        
        if data:
            print(f"\nExemplo de produto:")
            print(f"  ID: {data[0].get('id')}")
            print(f"  Nome: {data[0].get('name')[:50]}...")
            print(f"  Estoque: {data[0].get('stock')}")
        
        # Contar total de produtos
        print("\n📊 Contando total de produtos...")
        url_count = f"{SUPABASE_URL}/rest/v1/products?select=id"
        response_count = requests.get(url_count, headers=headers, timeout=30)
        all_products = response_count.json()
        print(f"Total de produtos no Supabase: {len(all_products)}")
        
        # Verificar histórico
        print("\n📈 Verificando histórico...")
        url_history = f"{SUPABASE_URL}/rest/v1/inventory_history?select=id"
        response_history = requests.get(url_history, headers=headers, timeout=30)
        all_history = response_history.json()
        print(f"Total de registros no histórico: {len(all_history)}")
    else:
        print(f"❌ Erro na resposta: {response.status_code}")
        print(f"Response: {response.text}")
    
except Exception as e:
    print(f"❌ Erro na conexão: {e}")
    print(f"\nPossíveis causas:")
    print(f"1. URL do Supabase incorreta")
    print(f"2. Service Key expirada ou inválida")
    print(f"3. Tabelas não existem no Supabase")
    print(f"4. Permissões insuficientes")
