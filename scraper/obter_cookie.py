from playwright.sync_api import sync_playwright
import json
import os

def main():
    print("🔐 Obtendo cookie de autenticação do SeuArmazemDrop...")
    
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False)
        context = browser.new_context()
        page = context.new_page()
        
        # Acessar página de login
        page.goto("https://app.seuarmazemdrop.com.br/login")
        
        print("⚠️  Faça login manual no navegador que abriu...")
        print("⚠️  Pressione ENTER no terminal após fazer login...")
        
        input()
        
        # Salvar estado de autenticação
        context.storage_state(path="storage_state.json")
        print("✅ Cookie salvo em storage_state.json")
        
        browser.close()

if __name__ == "__main__":
    main()
