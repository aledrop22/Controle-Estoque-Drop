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
TOTAL_PAGES = 10  # Atualizado de 8 para 10 (será substituído por detecção automática)
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

def save_progress(products, append=False):
    """Save products to JSON file"""
    existing_products = []
    if append and os.path.exists(OUTPUT_FILE):
        try:
            with open(OUTPUT_FILE, 'r', encoding='utf-8') as f:
                existing_products = json.load(f)
                print(f"📂 Carregados {len(existing_products)} produtos existentes")
        except:
            existing_products = []
    
    all_products = existing_products + products
    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        json.dump(all_products, f, indent=2, ensure_ascii=False)
    return all_products

def scrape_products():
    """Scrape products from SeuArmazemDrop using Playwright"""
    print(f"🔍 Scraping {CATALOG_URL}...")
    
    # Carregar produtos existentes se houver
    existing_products = []
    if os.path.exists(OUTPUT_FILE):
        try:
            with open(OUTPUT_FILE, 'r', encoding='utf-8') as f:
                existing_products = json.load(f)
                print(f"� Carregados {len(existing_products)} produtos existentes do JSON")
        except:
            existing_products = []
    
    products = existing_products  # Começar com produtos existentes
    start_index = len(existing_products)  # Índice para novos produtos
    save_interval = 50  # Salvar a cada 50 produtos
    
    # Criar set de IDs existentes para evitar duplicatas
    existing_ids = set(p['id'] for p in existing_products)
    print(f"📋 {len(existing_ids)} IDs únicos já existentes")
    
    # Obter credenciais
    EMAIL = os.getenv("EMAIL") or os.getenv("SEUARMAZEMDROP_EMAIL")
    PASSWORD = os.getenv("PASSWORD") or os.getenv("SEUARMAZEMDROP_PASSWORD")
    
    if not EMAIL or not PASSWORD:
        print("❌ Configure EMAIL/PASSWORD ou SEUARMAZEMDROP_EMAIL/SEUARMAZEMDROP_PASSWORD no .env")
        return []
    
    with sync_playwright() as p:
        # Usar headless=False para debug do login, pode ser alterado para True depois
        browser = p.chromium.launch(headless=False)
        context = browser.new_context()
        page = context.new_page()
        
        # Fazer login fresco
        print(f"🔑 Fazendo login com {EMAIL}...")
        try:
            page.goto("https://app.seuarmazemdrop.com.br/login", wait_until="networkidle")
            print("📄 Página de login carregada")
            
            # Tirar screenshot antes de preencher
            page.screenshot(path="login_before_fill.png")
            print("📸 Screenshot salvo: login_before_fill.png")
            
            # Tentar diferentes seletores para email com logging
            email_filled = False
            selectors_email = ["input[name='email']", "#email", "input[type='email']", "input[placeholder*='email']", "input[placeholder*='E-mail']"]
            for selector in selectors_email:
                try:
                    page.wait_for_selector(selector, timeout=2000)
                    page.fill(selector, EMAIL)
                    print(f"✅ Email preenchido usando seletor: {selector}")
                    email_filled = True
                    break
                except:
                    print(f"⚠️  Seletor {selector} não encontrado")
                    continue
            
            if not email_filled:
                print("❌ Não foi possível encontrar campo de email")
                page.screenshot(path="login_error_no_email.png")
                browser.close()
                return []
            
            # Tentar diferentes seletores para senha com logging
            password_filled = False
            selectors_password = ["input[name='password']", "#password", "input[type='password']", "input[placeholder*='senha']", "input[placeholder*='Senha']"]
            for selector in selectors_password:
                try:
                    page.wait_for_selector(selector, timeout=2000)
                    page.fill(selector, PASSWORD)
                    print(f"✅ Senha preenchida usando seletor: {selector}")
                    password_filled = True
                    break
                except:
                    print(f"⚠️  Seletor {selector} não encontrado")
                    continue
            
            if not password_filled:
                print("❌ Não foi possível encontrar campo de senha")
                page.screenshot(path="login_error_no_password.png")
                browser.close()
                return []
            
            # Tirar screenshot após preencher
            page.screenshot(path="login_after_fill.png")
            print("📸 Screenshot salvo: login_after_fill.png")
            
            # Tentar diferentes seletores para botão de login com logging
            button_clicked = False
            selectors_button = ["button[type='submit']", "button:has-text('Entrar')", "button:has-text('entrar')", "button.btn-primary", "button.btn-login", "button[type='button']:has-text('Entrar')"]
            for selector in selectors_button:
                try:
                    page.wait_for_selector(selector, timeout=2000)
                    page.click(selector)
                    print(f"✅ Botão clicado usando seletor: {selector}")
                    button_clicked = True
                    break
                except:
                    print(f"⚠️  Seletor {selector} não encontrado")
                    continue
            
            if not button_clicked:
                print("❌ Não foi possível encontrar botão de login")
                page.screenshot(path="login_error_no_button.png")
                browser.close()
                return []
            
            # Aguardar redirecionamento com mais tempo e verificar URL atual
            print("⏳ Aguardando redirecionamento...")
            try:
                page.wait_for_url("**/dashboard/**", timeout=30000)
                print("✅ Login realizado com sucesso!")
            except:
                # Verificar se já estamos no dashboard mesmo com URL diferente
                current_url = page.url
                print(f"⚠️  Timeout aguardando dashboard. URL atual: {current_url}")
                page.screenshot(path="login_timeout.png")
                
                # Tentar verificar se estamos logados de outra forma
                try:
                    if "dashboard" in current_url.lower():
                        print("✅ Já estamos no dashboard (URL contém 'dashboard')")
                    else:
                        print("❌ Não foi possível confirmar login")
                        browser.close()
                        return []
                except:
                    print("❌ Não foi possível confirmar login")
                    browser.close()
                    return []
            
            # Fechar pop-up de aviso IMEDIATAMENTE após login (antes de navegar)
            print("🔍 Verificando pop-up de aviso...")
            try:
                page.wait_for_timeout(500)  # Reduzido de 1000 para 500
                close_button = page.locator("button.btn-close").first
                if close_button.is_visible(timeout=1000):  # Reduzido de 2000 para 1000
                    close_button.click()
                    print("✅ Pop-up de aviso fechado (btn-close)")
                    page.wait_for_timeout(300)  # Reduzido de 500 para 300
            except:
                # Tentar fechar pelo botão "Fechar"
                try:
                    fechar_button = page.locator("button.btn-light:has-text('Fechar')").first
                    if fechar_button.is_visible(timeout=800):  # Reduzido de 1500 para 800
                        fechar_button.click()
                        print("✅ Pop-up de aviso fechado (botão Fechar)")
                        page.wait_for_timeout(300)  # Reduzido de 500 para 300
                except:
                    pass  # Pop-up não encontrado, continuar
            
        except Exception as e:
            print(f"❌ Login falhou com erro: {e}")
            page.screenshot(path="login_exception.png")
            browser.close()
            return []
        
        try:
            # Navigate to catalog
            page.goto(CATALOG_URL, wait_until="networkidle")
            
            # Set pagination to 100 items per page
            print("⚙️  Configurando paginação para 100 itens...")
            try:
                page.select_option("#perPage", "100")
                page.wait_for_timeout(500)  # Reduzido de 1000 para 500
            except:
                print("⚠️  Não foi possível configurar paginação. Continuando com padrão.")
            
            # Detectar número total de páginas automaticamente
            print("🔍 Detectando número total de páginas...")
            total_pages_detected = TOTAL_PAGES  # Usar valor padrão como fallback
            try:
                # Tentar encontrar o último número de página na paginação
                page_numbers = page.locator("li.page-item a").all()
                if page_numbers:
                    max_page = 1
                    for pn in page_numbers:
                        try:
                            text = pn.inner_text().strip()
                            if text.isdigit():
                                page_num = int(text)
                                if page_num > max_page:
                                    max_page = page_num
                        except:
                            continue
                    if max_page > 1:
                        total_pages_detected = max_page
                        print(f"✅ Detectadas {total_pages_detected} páginas automaticamente")
                    else:
                        print(f"⚠️  Não foi possível detectar páginas, usando padrão: {TOTAL_PAGES}")
                else:
                    print(f"⚠️  Paginação não encontrada, usando padrão: {TOTAL_PAGES}")
            except Exception as e:
                print(f"⚠️  Erro ao detectar páginas: {e}, usando padrão: {TOTAL_PAGES}")
            
            # Calcular página inicial baseada nos produtos existentes
            start_page = (len(existing_products) // PER_PAGE) + 1
            
            print(f"📊 Produtos existentes: {len(existing_products)}")
            print(f"📄 Continuando da página {start_page}/{total_pages_detected}...")
            
            # Se não estiver na página inicial, navegar para ela
            if start_page > 1:
                print(f"🔗 Navegando para página {start_page}...")
                try:
                    # Tentar construir URL direta com parâmetro de página
                    page.goto(f"{CATALOG_URL}?page={start_page}", wait_until="networkidle")
                    page.wait_for_timeout(500)
                except:
                    print("⚠️  Navegação direta falhou, tentando navegação manual...")
                    # Navegar página por página até a página inicial
                    for _ in range(start_page - 1):
                        try:
                            next_page = page.locator("li.page-item.active + li.page-item a").first
                            if next_page.is_visible():
                                next_page.click()
                                page.wait_for_timeout(500)
                            else:
                                break
                        except:
                            break
            
            # Scrape from start_page to end
            for page_num in range(start_page, total_pages_detected + 1):
                print(f"📄 Página {page_num}/{total_pages_detected}...")
                
                # Verificar se há trava na página (loading spinner, overlay, etc)
                try:
                    loading = page.locator(".spinner, .loading, .overlay, [class*='loading'], [class*='spinner']").first
                    if loading.is_visible(timeout=1000):
                        print("⏳ Página carregando, aguardando...")
                        page.wait_for_selector(".spinner, .loading, .overlay", state="hidden", timeout=10000)
                except:
                    pass  # Não há loading, continuar
                
                # Wait for products to load
                try:
                    page.wait_for_selector("a.text-dark", timeout=3000)  # Reduzido de 5000 para 3000
                except:
                    print("⚠️  Seletor 'a.text-dark' não encontrado. Tentando seletor alternativo...")
                    try:
                        page.wait_for_selector("a[href*='/product/']", timeout=3000)  # Reduzido de 5000 para 3000
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
                        product_id = extract_id_from_description(description, start_index + len(products) + 1)
                        
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
                            'index': start_index + len(products) + 1,  # Ordem de raspagem (continuando dos existentes)
                            'id': product_id,
                            'name': description,
                            'stock': stock,
                            'price': price,
                            'url': f"{BASE_URL}{product_url}",
                            'image': image,
                            'color': color,
                            'size': size
                        }
                        
                        # Verificar se o ID já existe para evitar duplicatas
                        if product_id in existing_ids:
                            print(f"  ⏭️  {product_id}: já existe, pulando...")
                            continue
                        
                        products.append(product)
                        existing_ids.add(product_id)  # Adicionar ao set de IDs existentes
                        print(f"  ✓ {product_id}: {description[:50]}...")
                        
                        # Salvar progresso a cada 50 produtos
                        if len(products) % save_interval == 0:
                            save_progress(products, append=True)
                            print(f"💾 Progresso salvo: {len(products)} produtos")
                        
                    except Exception as e:
                        print(f"  ✗ Erro ao extrair produto: {e}")
                        continue
                
                # Navigate to next page if not last page
                if page_num < total_pages_detected:
                    try:
                        next_page = page.locator("li.page-item.active + li.page-item a").first
                        if next_page.is_visible():
                            next_page.click()
                            page.wait_for_timeout(500)  # Reduzido de 1000 para 500
                        else:
                            print(f"📄 Não há mais páginas. Parando na página {page_num}")
                            break
                    except:
                        print(f"📄 Não foi possível ir para a próxima página. Parando na página {page_num}")
                        break
            
        finally:
            browser.close()
    
    # Save final results to JSON file
    final_products = save_progress(products, append=True)
    
    print(f"✅ Scraping concluído: {len(final_products)} produtos salvos em {OUTPUT_FILE}")
    print(f"   (Novos produtos: {len(products)}, Total: {len(final_products)})")
    return final_products

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
