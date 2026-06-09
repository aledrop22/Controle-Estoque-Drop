import os
import json
import requests
from datetime import datetime
from pathlib import Path
from dotenv import load_dotenv
from supabase_api import SupabaseAPI

# Carregar .env do diretório pai
env_path = Path(__file__).parent.parent / '.env'
load_dotenv(env_path)

# Supabase Configuration
SUPABASE_URL = os.getenv("VITE_SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY")
USER_ID = os.getenv("SUPABASE_USER_ID", "default-user")
INPUT_FILE = "seuarmazemdrop_data.json"

def main():
    print("📤 Enviando dados do JSON para Supabase...")
    
    # Verificar se arquivo JSON existe
    if not os.path.exists(INPUT_FILE):
        print(f"❌ Arquivo {INPUT_FILE} não encontrado")
        print(f"   Execute o scraper primeiro para gerar o arquivo")
        return
    
    # Verificar credenciais
    if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
        print("❌ Credenciais Supabase não configuradas")
        print("   Configure VITE_SUPABASE_URL e SUPABASE_SERVICE_KEY no .env")
        return
    
    # Carregar dados do JSON
    print(f"📂 Lendo dados de {INPUT_FILE}...")
    with open(INPUT_FILE, 'r', encoding='utf-8') as f:
        products = json.load(f)
    
    print(f"📊 {len(products)} produtos encontrados")
    
    # Filtrar apenas produtos duplicados (manter IDs automáticos)
    print("🔍 Filtrando produtos duplicados...")
    unique_products = {}
    for product in products:
        product_id = product.get('id')
        if product_id:  # ID existe (pode ser automático)
            if product_id not in unique_products:
                unique_products[product_id] = product
    
    products = list(unique_products.values())
    print(f"📊 {len(products)} produtos únicos após filtragem")
    
    try:
        # Conectar ao Supabase
        print("🔗 Conectando ao Supabase...")
        supa = SupabaseAPI(SUPABASE_URL, SUPABASE_SERVICE_KEY, USER_ID)
        
        # Inserir produtos (com upsert automático)
        print("📤 Enviando produtos...")
        result = supa.insert_products(products)
        print(f"✅ {len(result)} produtos enviados para Supabase")
        
        # Inserir histórico de estoque
        print("📈 Atualizando histórico de estoque...")
        today = datetime.utcnow().isoformat().split('T')[0]
        history_data = [
            {
                'product_id': p['id'],
                'date': today,
                'quantity': p['stock'],
                'price': p['price']
            }
            for p in products
        ]
        supa.insert_inventory_history(history_data)
        print(f"✅ Histórico de estoque atualizado")
        
        # Log de sucesso
        supa.log_scrape("https://app.seuarmazemdrop.com.br", 'success', len(products))
        
        print("\n" + "="*60)
        print("✅ Dados enviados para Supabase com sucesso!")
        print("="*60)
        
    except Exception as e:
        print(f"❌ Erro ao enviar para Supabase: {e}")
        if SUPABASE_URL:
            supa = SupabaseAPI(SUPABASE_URL, SUPABASE_SERVICE_KEY, USER_ID)
            supa.log_scrape("https://app.seuarmazemdrop.com.br", 'error', 0, str(e))

if __name__ == "__main__":
    main()
