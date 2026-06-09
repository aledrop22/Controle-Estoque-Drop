import os
import json
import re
from datetime import datetime
from pathlib import Path
from playwright.sync_api import sync_playwright
from dotenv import load_dotenv
from supabase_api import SupabaseAPI

# Carregar .env do diretório pai
env_path = Path(__file__).parent.parent / '.env'
load_dotenv(env_path)

# Configuration
BASE_URL = "https://app.seuarmazemdrop.com.br"
CATALOG_URL = f"{BASE_URL}/dashboard/catalog"
OUTPUT_FILE = "seuarmazemdrop_data.json"
TOTAL_PAGES = 8
PER_PAGE = 100

# Supabase Configuration
SUPABASE_URL = os.getenv("VITE_SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY")
USER_ID = os.getenv("SUPABASE_USER_ID", "default-user")

def extract_value(text, prefix):
    """Extract value after prefix from text"""
    if prefix in text:
        return text.split(prefix)[1].strip()
    return ""

def clean_price(price_text):
    """Clean price text and convert to float"""
    # Remove R$ and spaces
    cleaned = price_text.replace("R$", "").replace(" ", "").strip()
    # Replace comma with dot for decimal
    cleaned = cleaned.replace(",", ".")
    try:
        return float(cleaned)
    except:
        return 0.0

def clean_stock(stock_text):
    """Clean stock text and extract number"""
    # Extract number from text like "300 pcs"
    match = re.search(r'\d+', stock_text)
    if match:
        return int(match.group())
    return 0

def extract_id_from_description(description, index):
    """Extract product ID from description like (SAD14123) or (JACKZWJ000001)"""
    # Tenta SAD primeiro
    match = re.search(r'\((SAD\d+)\)', description)
    if match:
        return match.group(1)
    # Tenta JACK ou outros padrões
    match = re.search(r'\(([A-Z]+\d+)\)', description)
    if match:
        return match.group(1)
    # Se não encontrar ID, gera ID automático
    return f"AUTO{index:04d}"

def save_progress(products):
    """Save products to JSON file"""
    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        json.dump(products, f, indent=2, ensure_ascii=False)

def scrape_products():
    """Scrape products from SeuArmazemDrop using Playwright"""
    print(f"🔍 Scraping {CATALOG_URL}...")
    
    # Limpar arquivo JSON anterior se existir
    if os.path.exists(OUTPUT_FILE):
        os.remove(OUTPUT_FILE)
        print(f"🗑️  Arquivo {OUTPUT_FILE} removido (limpeza automática)")
    
    products = []
    save_interval = 50  # Salvar a cada 50 produtos
    
    with sync_playwright() as p:
        # Check if storage_state.json exists
        if not os.path.exists("storage_state.json"):
            print("⚠️  storage_state.json não encontrado. Execute python obter_cookie.py primeiro")
            return []
        
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(storage_state="storage_state.json")
        page = context.new_page()
        
        try:
            # Navigate to catalog
            page.goto(CATALOG_URL, wait_until="networkidle")
            
            # Fechar pop-up de aviso se aparecer
            try:
                page.wait_for_timeout(1000)
                close_button = page.locator("button.btn-close").first
                if close_button.is_visible(timeout=2000):
                    close_button.click()
                    print("✅ Pop-up de aviso fechado")
                    page.wait_for_timeout(500)
            except:
                # Tentar fechar pelo botão "Fechar"
                try:
                    fechar_button = page.locator("button.btn-light:has-text('Fechar')").first
                    if fechar_button.is_visible(timeout=1500):
                        fechar_button.click()
                        print("✅ Pop-up de aviso fechado (botão Fechar)")
                        page.wait_for_timeout(500)
                except:
                    pass  # Pop-up não encontrado, continuar
            
            # Set pagination to 100 items per page
            print("⚙️  Configurando paginação para 100 itens...")
            try:
                page.select_option("#perPage", "100")
                page.wait_for_timeout(1000)
            except:
                print("⚠️  Não foi possível configurar paginação. Continuando com padrão.")
            
            # Scrape all pages
            for page_num in range(1, TOTAL_PAGES + 1):
                print(f"📄 Página {page_num}/{TOTAL_PAGES}...")
                
                # Wait for products to load
                try:
                    page.wait_for_selector("a.text-dark", timeout=5000)
                except:
                    print("⚠️  Seletor 'a.text-dark' não encontrado. Tentando seletor alternativo...")
                    try:
                        page.wait_for_selector("a[href*='/product/']", timeout=5000)
                    except:
                        print("❌ Nenhum produto encontrado na página. Verifique se o login expirou.")
                        print("💡 Execute 'python obter_cookie.py' para renovar o login.")
                        break
                
                # Get all product cards
                try:
                    product_links = page.locator("a.text-dark").all()
                except:
                    product_links = page.locator("a[href*='/product/']").all()
                
                for link in product_links:
                    try:
                        # Get product URL
                        product_url = link.get_attribute("href")
                        if not product_url:
                            continue
                        
                        # Get description
                        description = link.inner_text().strip()
                        product_id = extract_id_from_description(description, len(products) + 1)
                        
                        # Get parent card to extract other data
                        card = link.locator("xpath=ancestor::div[contains(@class, 'card')]").first
                        
                        # Extract image
                        image_elem = card.locator("img[alt='product-pic']").first
                        image = image_elem.get_attribute("src") if image_elem.is_visible() else ""
                        
                        # Extract price
                        price_elem = card.locator("div.product-price-tag").first
                        price_text = price_elem.inner_text().strip() if price_elem.is_visible() else "R$ 0,00"
                        price = clean_price(price_text)
                        
                        # Extract color, size, stock from h5 elements
                        h5_elements = card.locator("h5.m-0 span.text-muted").all()
                        color = ""
                        size = ""
                        stock = 0
                        
                        for h5 in h5_elements:
                            text = h5.inner_text().strip()
                            if "Cor :" in text:
                                color = extract_value(text, "Cor :")
                            elif "Tamanho :" in text:
                                size = extract_value(text, "Tamanho :")
                            elif "Estoque :" in text:
                                stock = clean_stock(text)
                        
                        product = {
                            'index': len(products) + 1,  # Ordem de raspagem
                            'id': product_id,
                            'name': description,
                            'stock': stock,
                            'price': price,
                            'url': f"{BASE_URL}{product_url}",
                            'image': image,
                            'color': color,
                            'size': size
                        }
                        
                        products.append(product)
                        print(f"  ✓ {product_id}: {description[:50]}...")
                        
                        # Salvar progresso a cada 50 produtos
                        if len(products) % save_interval == 0:
                            save_progress(products)
                            print(f"💾 Progresso salvo: {len(products)} produtos")
                        
                    except Exception as e:
                        print(f"  ✗ Erro ao extrair produto: {e}")
                        continue
                
                # Navigate to next page if not last page
                if page_num < TOTAL_PAGES:
                    try:
                        next_page = page.locator("li.page-item.active + li.page-item a").first
                        if next_page.is_visible():
                            next_page.click()
                            page.wait_for_timeout(1000)
                        else:
                            print(f"📄 Não há mais páginas. Parando na página {page_num}")
                            break
                    except:
                        print(f"📄 Não foi possível ir para a próxima página. Parando na página {page_num}")
                        break
            
        finally:
            browser.close()
    
    # Save final results to JSON file
    save_progress(products)
    
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
