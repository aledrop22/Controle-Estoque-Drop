import os
import json
import requests
from dotenv import load_dotenv
from pathlib import Path

# Carregar .env do diretório pai
env_path = Path(__file__).parent.parent / '.env'
load_dotenv(env_path)

SUPABASE_URL = os.getenv("VITE_SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY")
USER_ID = os.getenv("SUPABASE_USER_ID", "default-user")

def check_supabase_products():
    """Verificar quantos produtos estão no Supabase"""
    if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
        print("❌ Credenciais Supabase não configuradas")
        return
    
    headers = {
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': f'Bearer {SUPABASE_SERVICE_KEY}',
        'Content-Type': 'application/json'
    }
    
    url = f"{SUPABASE_URL}/rest/v1/products?user_id=eq.{USER_ID}&select=count"
    
    try:
        response = requests.get(url, headers=headers)
        if response.status_code == 200:
            data = response.json()
            count = data[0]['count'] if data else 0
            print(f"📊 Produtos no Supabase: {count}")
            return count
        else:
            print(f"❌ Erro ao verificar Supabase: {response.status_code}")
            return 0
    except Exception as e:
        print(f"❌ Erro ao verificar Supabase: {e}")
        return 0

def check_local_products():
    """Verificar quantos produtos estão no JSON local"""
    try:
        with open("seuarmazemdrop_data.json", 'r', encoding='utf-8') as f:
            data = json.load(f)
            print(f"📦 Produtos no JSON local: {len(data)}")
            return len(data)
    except Exception as e:
        print(f"❌ Erro ao ler JSON: {e}")
        return 0

if __name__ == "__main__":
    print("🔍 Verificando produtos...")
    local_count = check_local_products()
    supabase_count = check_supabase_products()
    
    if local_count and supabase_count:
        if local_count > supabase_count:
            print(f"⚠️  Faltam {local_count - supabase_count} produtos no Supabase")
        elif local_count == supabase_count:
            print("✅ Todos os produtos estão no Supabase")
        else:
            print(f"⚠️  Há mais produtos no Supabase ({supabase_count}) que no local ({local_count})")
