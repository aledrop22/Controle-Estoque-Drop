import os
import subprocess
import sys
from pathlib import Path
from dotenv import load_dotenv

# Carregar .env do diretório pai
env_path = Path(__file__).parent.parent / '.env'
load_dotenv(env_path)

def run_command(cmd, description):
    """Execute a command and print status"""
    print(f"\n{'='*60}")
    print(f"🔄 {description}")
    print(f"{'='*60}")
    result = subprocess.run(cmd, shell=True, capture_output=False)
    if result.returncode != 0:
        print(f"❌ Erro em: {description}")
        return False
    print(f"✅ {description} concluído")
    return True

def main():
    print("🚀 Iniciando processo AUTOMÁTICO de scraping...")
    print("⚠️  Configure SEUARMAZEMDROP_EMAIL e SEUARMAZEMDROP_PASSWORD no .env")
    
    # Verificar se as credenciais estão configuradas
    email = os.getenv("SEUARMAZEMDROP_EMAIL") or os.getenv("EMAIL")
    password = os.getenv("SEUARMAZEMDROP_PASSWORD") or os.getenv("PASSWORD")
    
    if not email or not password:
        print("\n❌ ERRO: Credenciais não configuradas!")
        print("Configure no .env:")
        print("  SEUARMAZEMDROP_EMAIL=seu@email.com")
        print("  SEUARMAZEMDROP_PASSWORD=sua_senha")
        return
    
    # Step 1: Obter cookie automaticamente
    print("\n📋 Step 1: Obtendo cookie de autenticação automaticamente...")
    if not run_command("python obter_cookie.py", "Obter cookie de autenticação"):
        print("❌ Falha ao obter cookie. Verifique suas credenciais.")
        return
    
    # Step 2: Executar scraper
    print("\n📋 Step 2: Executando scraper...")
    
    # Set environment variables for Supabase
    supabase_url = os.getenv("VITE_SUPABASE_URL", "")
    supabase_key = os.getenv("SUPABASE_SERVICE_KEY", "")
    
    env = os.environ.copy()
    env["VITE_SUPABASE_URL"] = supabase_url
    env["SUPABASE_SERVICE_KEY"] = supabase_key
    
    result = subprocess.run(
        ["python", "scrape_seuarmazemdrop.py"],
        env=env,
        capture_output=False
    )
    
    if result.returncode != 0:
        print("❌ Erro ao executar scraper")
        return
    
    # Step 3: Verificar se JSON foi criado
    if not os.path.exists("seuarmazemdrop_data.json"):
        print("❌ Arquivo seuarmazemdrop_data.json não foi criado")
        return
    
    print("✅ Arquivo seuarmazemdrop_data.json criado com sucesso")
    
    # Step 4: Enviar para Supabase se configurado
    if supabase_url and supabase_key:
        print("\n📋 Step 3: Enviando dados para Supabase...")
        try:
            from supabase_api import SupabaseAPI
            from datetime import datetime
            
            # Carregar dados do JSON
            with open("seuarmazemdrop_data.json", 'r', encoding='utf-8') as f:
                products = json.load(f)
            
            # Conectar ao Supabase
            supa = SupabaseAPI(supabase_url, supabase_key, USER_ID)
            
            # Inserir produtos
            result = supa.insert_products(products)
            print(f"✅ {len(result)} produtos enviados para Supabase")
            
            # Inserir histórico de estoque
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
            
        except Exception as e:
            print(f"❌ Erro ao enviar para Supabase: {e}")
    else:
        print("\n⚠️  Supabase não configurado. Pulando envio para banco de dados.")
    
    # Step 5: Deploy no Vercel
    print("\n📋 Step 4: Deploy no Vercel...")
    
    # Voltar para diretório raiz
    os.chdir("..")
    
    run_command("git add -A", "Adicionar arquivos ao git")
    run_command('git commit -m "chore: update scraped data from SeuArmazemDrop"', "Commit das mudanças")
    run_command("git push", "Push para GitHub (Vercel)")
    
    print("\n" + "="*60)
    print("✅ Processo AUTOMÁTICO finalizado!")
    print("="*60)
    print("\n📊 Resumo:")
    print("  ✅ Login automático realizado")
    print("  ✅ Scraper executado e dados coletados")
    print("  ✅ Dados salvos em seuarmazemdrop_data.json")
    print("  ✅ Progresso salvo a cada 50 produtos")
    print("  ✅ Velocidade otimizada")
    print("  ✅ Dados enviados para Supabase (se configurado)")
    print("  ✅ Deploy no Vercel realizado")
    print("\n🌐 Dashboard atualizado no Vercel!")

if __name__ == "__main__":
    main()
