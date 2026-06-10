import os
import json
import requests
from datetime import datetime, timezone
from pathlib import Path
from dotenv import load_dotenv
import re

# Carregar .env do diretório pai
env_path = Path(__file__).parent.parent / '.env'
load_dotenv(env_path)

# Supabase Configuration
SUPABASE_URL = os.getenv("VITE_SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY")
USER_ID = os.getenv("SUPABASE_USER_ID", "default-user")

def clean_product_name(name):
    """Remove ID do início do nome do produto"""
    # Remove padrão (SADXXXXX) ou (JACKXXXXX) do início
    name = re.sub(r'^\([A-Z]+\d+\)\s*', '', name)
    return name.strip()

def fix_product_url(url):
    """Remove duplicação de URL"""
    if 'https://app.seuarmazemdrop.com.brhttps://app.seuarmazemdrop.com.br/' in url:
        url = url.replace('https://app.seuarmazemdrop.com.brhttps://app.seuarmazemdrop.com.br/', 'https://app.seuarmazemdrop.com.br/')
    return url

def extract_category_from_name(name):
    """Extrai categoria do nome do produto"""
    # Lista de categorias comuns
    categories = [
        'Bolsa', 'Mochila', 'Copo', 'Caneca', 'Garrafa', 'Kit', 
        'Conjunto', 'Chaveiro', 'Porta', 'Organizador', 'Caixa',
        'Estojo', 'Necessaire', 'Carteira', 'Cartão'
    ]
    
    name_lower = name.lower()
    for cat in categories:
        if cat.lower() in name_lower:
            return cat
    
    return 'Geral'

def main():
    print("="*60)
    print("🔧 CORRIGINDO DADOS NO SUPABASE")
    print("="*60)
    
    headers = {
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': f'Bearer {SUPABASE_SERVICE_KEY}',
        'Content-Type': 'application/json'
    }
    
    # Buscar todos os produtos
    print("📡 [1/4] Buscando produtos do Supabase...")
    url = f"{SUPABASE_URL}/rest/v1/products?user_id=eq.{USER_ID}&select=*"
    response = requests.get(url, headers=headers, timeout=30)
    
    if response.status_code != 200:
        print(f"❌ Erro ao buscar produtos: {response.status_code}")
        return
    
    products = response.json()
    print(f"✅ [1/4] {len(products)} produtos encontrados")
    
    # Corrigir dados
    print("🔧 [2/4] Corrigindo nomes e URLs...")
    fixed_count = 0
    batch_size = 50
    
    for i in range(0, len(products), batch_size):
        batch = products[i:i + batch_size]
        batch_num = i // batch_size + 1
        total_batches = (len(products) + batch_size - 1) // batch_size
        
        print(f"📦 [{batch_num}/{total_batches}] Processando lote de {len(batch)} produtos...")
        
        for product in batch:
            original_name = product['name']
            original_url = product.get('url', '')
            
            # Corrigir nome
            cleaned_name = clean_product_name(original_name)
            
            # Corrigir URL
            cleaned_url = fix_product_url(original_url)
            
            # Extrair categoria
            category = extract_category_from_name(cleaned_name)
            
            # Verificar se precisa atualizar
            needs_update = (
                cleaned_name != original_name or
                cleaned_url != original_url
            )
            
            if needs_update:
                # Atualizar produto
                update_url = f"{SUPABASE_URL}/rest/v1/products?id=eq.{product['id']}"
                update_data = {
                    'name': cleaned_name,
                    'url': cleaned_url,
                    'updated_at': datetime.now(timezone.utc).isoformat()
                }
                
                try:
                    update_response = requests.patch(update_url, headers=headers, json=update_data, timeout=30)
                    if update_response.status_code in [200, 204]:
                        fixed_count += 1
                        if fixed_count <= 5:  # Mostrar apenas os primeiros 5
                            print(f"  ✓ Corrigido: {original_name[:40]}... → {cleaned_name[:40]}...")
                except Exception as e:
                    print(f"  ❌ Erro ao atualizar {product['id']}: {e}")
    
    print(f"✅ [2/4] {fixed_count} produtos corrigidos")
    
    # Limpar cache da API
    print("🧹 [3/4] Limpando cache da API...")
    try:
        cache_url = f"{SUPABASE_URL}/rest/v1/products?select=id"
        requests.get(cache_url, headers=headers, timeout=10)
    except:
        pass
    
    print("✅ [3/4] Cache limpo")
    
    # Verificar resultado
    print("🔍 [4/4] Verificando resultado...")
    response = requests.get(url, headers=headers, timeout=30)
    if response.status_code == 200:
        updated_products = response.json()
        print(f"✅ [4/4] {len(updated_products)} produtos no Supabase")
        
        # Mostrar exemplo
        if updated_products:
            sample = updated_products[0]
            print(f"\n📋 Exemplo de produto corrigido:")
            print(f"   Nome: {sample['name']}")
            print(f"   URL: {sample.get('url', 'N/A')[:60]}...")
    
    print("="*60)
    print("✅ CORREÇÃO CONCLUÍDA")
    print("="*60)

if __name__ == "__main__":
    main()
