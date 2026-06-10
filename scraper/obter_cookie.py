from playwright.sync_api import sync_playwright
import json
import os
from pathlib import Path
from dotenv import load_dotenv

# Carregar .env do diretório pai
env_path = Path(__file__).parent.parent / '.env'
load_dotenv(env_path)

def main():
    print("🔐 Obtendo cookie de autenticação do SeuArmazemDrop...")
    
    # Configurações de login (substitua com suas credenciais)
    EMAIL = os.getenv("EMAIL") or os.getenv("SEUARMAZEMDROP_EMAIL")
    PASSWORD = os.getenv("PASSWORD") or os.getenv("SEUARMAZEMDROP_PASSWORD")
    
    if not EMAIL or not PASSWORD:
        print("⚠️  Configure EMAIL/PASSWORD ou SEUARMAZEMDROP_EMAIL/SEUARMAZEMDROP_PASSWORD no .env")
        print("⚠️  Ou faça login manual...")
        manual_login = True
    else:
        manual_login = False
    
    with sync_playwright() as p:
        # Usar headless=False para debug do login, pode ser alterado para True depois
        browser = p.chromium.launch(headless=False)
        context = browser.new_context()
        page = context.new_page()
        
        # Acessar página de login
        page.goto("https://app.seuarmazemdrop.com.br/login", wait_until="networkidle")
        print("📄 Página de login carregada")
        
        if not manual_login:
            print(f"🔑 Fazendo login automático com {EMAIL}...")
            
            # Tirar screenshot antes de preencher
            page.screenshot(path="cookie_login_before_fill.png")
            print("📸 Screenshot salvo: cookie_login_before_fill.png")
            
            try:
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
                    page.screenshot(path="cookie_login_error_no_email.png")
                    browser.close()
                    return False
                
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
                    page.screenshot(path="cookie_login_error_no_password.png")
                    browser.close()
                    return False
                
                # Tirar screenshot após preencher
                page.screenshot(path="cookie_login_after_fill.png")
                print("📸 Screenshot salvo: cookie_login_after_fill.png")
                
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
                    page.screenshot(path="cookie_login_error_no_button.png")
                    browser.close()
                    return False
                
                # Aguardar redirecionamento com mais tempo e verificar URL atual
                print("⏳ Aguardando redirecionamento...")
                try:
                    page.wait_for_url("**/dashboard/**", timeout=30000)
                    print("✅ Login realizado com sucesso!")
                except:
                    # Verificar se já estamos no dashboard mesmo com URL diferente
                    current_url = page.url
                    print(f"⚠️  Timeout aguardando dashboard. URL atual: {current_url}")
                    page.screenshot(path="cookie_login_timeout.png")
                    
                    # Tentar verificar se estamos logados de outra forma
                    try:
                        if "dashboard" in current_url.lower():
                            print("✅ Já estamos no dashboard (URL contém 'dashboard')")
                        else:
                            print("❌ Não foi possível confirmar login")
                            browser.close()
                            return False
                    except:
                        print("❌ Não foi possível confirmar login")
                        browser.close()
                        return False
                
            except Exception as e:
                print(f"❌ Login automático falhou completamente: {e}")
                page.screenshot(path="cookie_login_exception.png")
                browser.close()
                return False
        else:
            print("⚠️  Credenciais não configuradas. Não é possível fazer login automático.")
            browser.close()
            return False
        
        # Salvar estado de autenticação
        context.storage_state(path="storage_state.json")
        print("✅ Cookie salvo em storage_state.json")
        
        browser.close()

if __name__ == "__main__":
    main()
