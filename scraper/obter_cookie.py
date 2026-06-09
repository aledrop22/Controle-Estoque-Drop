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
        browser = p.chromium.launch(headless=True)
        context = browser.new_context()
        page = context.new_page()
        
        # Acessar página de login
        page.goto("https://app.seuarmazemdrop.com.br/login", wait_until="networkidle")
        
        if not manual_login:
            print(f"🔑 Fazendo login automático com {EMAIL}...")
            
            try:
                # Preencher email
                page.wait_for_selector("input[name='email']", timeout=5000)
                page.fill("input[name='email']", EMAIL)
                
                # Preencher senha
                page.fill("input[name='password']", PASSWORD)
                
                # Clicar no botão de login
                page.click("button[type='submit']")
                
                # Aguardar redirecionamento
                page.wait_for_url("**/dashboard/**", timeout=15000)
                print("✅ Login realizado com sucesso!")
            except Exception as e:
                print(f"⚠️  Login automático falhou: {e}")
                print("⚠️  Tentando abordagem alternativa...")
                try:
                    # Tentar outros seletores comuns
                    page.fill("#email", EMAIL)
                    page.fill("#password", PASSWORD)
                    page.click("button[type='submit']")
                    page.wait_for_url("**/dashboard/**", timeout=15000)
                    print("✅ Login realizado com sucesso (alternativa)!")
                except Exception as e2:
                    print(f"❌ Login automático falhou completamente: {e2}")
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
