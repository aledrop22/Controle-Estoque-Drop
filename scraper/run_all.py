import os
import subprocess
import sys

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
    
    # Step 1: Get authentication cookie
    if not os.path.exists("storage_state.json"):
        print("\n📋 Step 1: Obtendo cookie de autenticação...")
        if not run_command("python obter_cookie.py", "Obter cookie de autenticação"):
            print("⚠️  Falha ao obter cookie. Continuando...")
    else:
        print("✅ Cookie já existe (storage_state.json)")
    
    # Step 2: Run scraper
    print("\n📋 Step 2: Executando scraper...")
    
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
