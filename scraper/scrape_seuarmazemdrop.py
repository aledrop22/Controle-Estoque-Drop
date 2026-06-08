import os
import json
import requests
from datetime import datetime
from supabase_api import SupabaseAPI

# Configuration
BASE_URL = "https://app.seuarmazemdrop.com.br"
OUTPUT_FILE = "seuarmazemdrop_data.json"

# Supabase Configuration
SUPABASE_URL = os.getenv("VITE_SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY")
USER_ID = os.getenv("SUPABASE_USER_ID", "default-user")

def scrape_products():
    """Scrape products from SeuArmazemDrop"""
    print(f"🔍 Scraping {BASE_URL}...")
    
    # This is a simplified scraper - you may need to adjust selectors
    # For now, we'll create sample data to test the flow
    
    products = []
    
    # Sample data for testing (replace with actual scraping logic)
    sample_products = [
        {
            'id': 'SAD14123',
            'name': '(SAD14123) Prata - Cortina Blackout',
            'stock': 150,
            'price': 5.00,
            'url': f'{BASE_URL}/product/sad14123'
        },
        {
            'id': 'SAD14124',
            'name': '(SAD14124) Preto - Cortina Blackout',
            'stock': 200,
            'price': 5.50,
            'url': f'{BASE_URL}/product/sad14124'
        },
        {
            'id': 'SAD14125',
            'name': '(SAD14125) Branco - Cortina Blackout',
            'stock': 180,
            'price': 4.90,
            'url': f'{BASE_URL}/product/sad14125'
        }
    ]
    
    products.extend(sample_products)
    
    # Save to JSON file
    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        json.dump(products, f, indent=2, ensure_ascii=False)
    
    print(f"✅ Scraping concluído: {len(products)} produtos salvos em {OUTPUT_FILE}")
    return products

def main():
    print("🚀 Iniciando scraper SeuArmazemDrop...")
    
    # Scrape products
    products = scrape_products()
    
    # Send to Supabase if configured
    if SUPABASE_URL and SUPABASE_SERVICE_KEY:
        try:
            print("\n📤 Enviando dados para Supabase...")
            supa = SupabaseAPI(SUPABASE_URL, SUPABASE_SERVICE_KEY, USER_ID)
            
            # Insert products
            result = supa.insert_products(products)
            print(f"✅ {len(result)} produtos enviados para Supabase")
            
            # Insert inventory history
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
            
            # Log success
            supa.log_scrape(BASE_URL, 'success', len(products))
            
        except Exception as e:
            print(f"❌ Erro ao enviar para Supabase: {e}")
            if SUPABASE_URL:
                supa = SupabaseAPI(SUPABASE_URL, SUPABASE_SERVICE_KEY, USER_ID)
                supa.log_scrape(BASE_URL, 'error', 0, str(e))
    else:
        print("⚠️  Credenciais Supabase não configuradas. Dados salvos apenas em JSON.")
        print("   Configure VITE_SUPABASE_URL e SUPABASE_SERVICE_KEY no .env")

if __name__ == "__main__":
    main()
