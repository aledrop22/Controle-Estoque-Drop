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
    print("🚀 Iniciando processo completo de scraping e deploy...")
    
    # Mudar para diretório scraper
    script_dir = os.path.dirname(os.path.abspath(__file__))
    os.chdir(script_dir)
    
    # Step 1: Verificar credenciais
    print("\n📋 Step 1: Verificando credenciais...")
    email = os.getenv("EMAIL") or os.getenv("SEUARMAZEMDROP_EMAIL")
    password = os.getenv("PASSWORD") or os.getenv("SEUARMAZEMDROP_PASSWORD")
    
    if not email or not password:
        print("❌ Configure EMAIL/PASSWORD ou SEUARMAZEMDROP_EMAIL/SEUARMAZEMDROP_PASSWORD no .env")
        return
    
    print(f"✅ Credenciais configuradas para {email}")
    
    # Step 2: Run scraper (login automático integrado)
    print("\n📋 Step 2: Executando scraper (login automático)...")
    
    # Set environment variables for Supabase
    supabase_url = os.getenv("VITE_SUPABASE_URL", "https://lroxouwlciplbvitqzmh.supabase.co")
    supabase_key = os.getenv("SUPABASE_SERVICE_KEY", "")
    
    if not supabase_key:
        print("⚠️  SUPABASE_SERVICE_KEY não configurado. Dados serão salvos apenas em JSON.")
    
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
    
    # Step 3: Check if JSON file was created
    if not os.path.exists("seuarmazemdrop_data.json"):
        print("❌ Arquivo seuarmazemdrop_data.json não foi criado")
        return
    
    print("✅ Arquivo seuarmazemdrop_data.json criado com sucesso")
    
    # Step 4: Commit and push to Vercel
    print("\n📋 Step 3: Commit e push para Vercel...")
    
    # Go to parent directory
    os.chdir("..")
    
    run_command("git add -A", "Adicionar arquivos ao git")
    run_command('git commit -m "chore: update scraped data from SeuArmazemDrop"', "Commit das mudanças")
    run_command("git push", "Push para GitHub (Vercel)")
    
    print("\n" + "="*60)
    print("✅ Processo completo finalizado!")
    print("="*60)
    print("\n📊 Resumo:")
    print("  ✅ Cookie de autenticação obtido")
    print("  ✅ Scraper executado e dados coletados")
    print("  ✅ Dados salvos em seuarmazemdrop_data.json")
    print("  ✅ Dados enviados para Supabase (se configurado)")
    print("  ✅ Commit e push para Vercel realizado")
    print("\n🌐 Acesse seu dashboard no Vercel para ver os dados atualizados!")

if __name__ == "__main__":
    main()
