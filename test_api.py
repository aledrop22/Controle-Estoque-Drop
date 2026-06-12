import requests
import os
from dotenv import load_dotenv
from pathlib import Path

# Carregar .env
env_path = Path(__file__).parent / '.env'
load_dotenv(env_path)

# Testar API local
print("🔍 Testando API local...")
print("="*60)

# Testar health
try:
    response = requests.get('http://localhost:4000/api/health', timeout=5)
    print(f"Health Check: {response.status_code}")
    print(f"Response: {response.json()}")
except Exception as e:
    print(f"❌ Health Check falhou: {e}")

print("\n" + "="*60)

# Testar inventory-supabase
try:
    response = requests.get('http://localhost:4000/api/inventory-supabase', timeout=10)
    print(f"Inventory Supabase: {response.status_code}")
    data = response.json()
    print(f"Source: {data.get('source')}")
    print(f"Products count: {len(data.get('products', []))}")
    if data.get('products'):
        print(f"Sample product: {data['products'][0].get('name', 'N/A')}")
except Exception as e:
    print(f"❌ Inventory Supabase falhou: {e}")

print("\n" + "="*60)

# Verificar variáveis de ambiente
print("🔍 Verificando variáveis de ambiente...")
print(f"VITE_SUPABASE_URL: {'✅ Configurada' if os.getenv('VITE_SUPABASE_URL') else '❌ Não configurada'}")
print(f"SUPABASE_SERVICE_KEY: {'✅ Configurada' if os.getenv('SUPABASE_SERVICE_KEY') else '❌ Não configurada'}")
print(f"VITE_GEMINI_API_KEY: {'✅ Configurada' if os.getenv('VITE_GEMINI_API_KEY') else '❌ Não configurada'}")
