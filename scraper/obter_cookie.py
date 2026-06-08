from playwright.sync_api import sync_playwright
import json
import os

def main():
    print("🔐 Obtendo cookie de autenticação do SeuArmazemDrop...")
    
    # Configurações de login (substitua com suas credenciais)
    EMAIL = os.getenv("renidreshop@gmail.com")
    PASSWORD = os.getenv("36180")
    
    if not EMAIL or not PASSWORD:
        print("⚠️  Configure SEUARMAZEMDROP_EMAIL e SEUARMAZEMDROP_PASSWORD no .env")
        print("⚠️  Ou faça login manual...")
        manual_login = True
    else:
        manual_login = False
    
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False)
        context = browser.new_context()
        page = context.new_page()
        
        # Acessar página de login
        page.goto("https://app.seuarmazemdrop.com.br/login")
        
        if not manual_login:
            print(f"🔑 Fazendo login automático com {EMAIL}...")
            
            # Preencher email
            page.fill("input[name='email']", EMAIL)
            
            # Preencher senha
            page.fill("input[name='password']", PASSWORD)
            
            # Clicar no botão de login
            page.click("button[type='submit']")
            
            # Aguardar redirecionamento
            page.wait_for_url("**/dashboard/**", timeout=10000)
            print("✅ Login realizado com sucesso!")
        else:
            print("⚠️  Faça login manual no navegador que abriu...")
            print("⚠️  Pressione ENTER no terminal após fazer login...")
            input()
        
        # Salvar estado de autenticação
        context.storage_state(path="storage_state.json")
        print("✅ Cookie salvo em storage_state.json")
        
        browser.close()

if __name__ == "__main__":
    main()
