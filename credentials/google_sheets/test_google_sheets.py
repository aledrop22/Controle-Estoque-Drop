#!/usr/bin/env python3
"""
Script de teste para validar credenciais do Google Sheets
Uso: python test_google_sheets.py
"""

import json
import sys
from pathlib import Path

def test_credentials():
    """Testa se o arquivo de credenciais é válido"""
    creds_file = Path('credentials.json')
    
    if not creds_file.exists():
        print("❌ Arquivo credentials.json não encontrado")
        print("   Siga as instruções em GOOGLE_SHEETS_RAPIDO.md")
        return False
    
    try:
        with open(creds_file) as f:
            creds = json.load(f)
        
        # Valida campos obrigatórios
        required = ['type', 'project_id', 'private_key_id', 'private_key', 'client_email']
        for field in required:
            if field not in creds:
                print(f"❌ Campo obrigatório '{field}' ausente em credentials.json")
                return False
        
        print("✅ Credenciais válidas!")
        print(f"   Tipo: {creds.get('type')}")
        print(f"   Projeto: {creds.get('project_id')}")
        print(f"   Email: {creds.get('client_email')}")
        return True
        
    except json.JSONDecodeError:
        print("❌ Erro: credentials.json não é um JSON válido")
        return False
    except Exception as e:
        print(f"❌ Erro ao ler credentials.json: {e}")
        return False


def test_data_json():
    """Testa se data.json existe e tem dados"""
    data_file = Path('data.json')
    
    if not data_file.exists():
        print("❌ Arquivo data.json não encontrado")
        print("   Execute o scraper primeiro: python -m scrapy crawl meudrop -O data.json")
        return False
    
    try:
        with open(data_file) as f:
            data = json.load(f)
        
        if not isinstance(data, list):
            print("❌ data.json não é uma lista")
            return False
        
        if len(data) == 0:
            print("❌ data.json está vazio")
            return False
        
        print(f"✅ data.json válido! ({len(data)} produtos)")
        print(f"   Campos: {', '.join(data[0].keys())}")
        return True
        
    except json.JSONDecodeError:
        print("❌ Erro: data.json não é um JSON válido")
        return False
    except Exception as e:
        print(f"❌ Erro ao ler data.json: {e}")
        return False


def test_imports():
    """Testa se as dependências estão instaladas"""
    required_modules = ['gspread', 'oauth2client']
    
    all_ok = True
    for module in required_modules:
        try:
            __import__(module)
            print(f"✅ {module} instalado")
        except ImportError:
            print(f"❌ {module} NÃO instalado")
            all_ok = False
    
    if not all_ok:
        print("\n⚠️  Para instalar as dependências:")
        print("   pip install gspread oauth2client")
    
    return all_ok


def test_gspread_connection(sheet_name="MeuDrop"):
    """Testa conexão com Google Sheets"""
    try:
        import gspread
        from oauth2client.service_account import ServiceAccountCredentials
    except ImportError:
        print("⚠️  Pulando teste de conexão (módulos não instalados)")
        return None
    
    try:
        scope = [
            'https://spreadsheets.google.com/feeds',
            'https://www.googleapis.com/auth/drive'
        ]
        
        creds = ServiceAccountCredentials.from_json_keyfile_name('credentials.json', scope)
        client = gspread.authorize(creds)
        
        print(f"✅ Conectado ao Google Sheets!")
        
        try:
            spreadsheet = client.open(sheet_name)
            print(f"✅ Planilha '{sheet_name}' encontrada!")
            return True
        except gspread.exceptions.SpreadsheetNotFound:
            print(f"⚠️  Planilha '{sheet_name}' NÃO encontrada")
            print(f"   Crie uma planilha chamada '{sheet_name}' e compartilhe com:")
            with open('credentials.json') as f:
                creds_json = json.load(f)
                print(f"   {creds_json.get('client_email')}")
            return False
            
    except Exception as e:
        print(f"❌ Erro de conexão: {e}")
        print("   Verifique se credentials.json é válido")
        return False


def main():
    print("=" * 60)
    print("🧪 Teste de Google Sheets")
    print("=" * 60)
    print()
    
    print("1. Testando imports...")
    imports_ok = test_imports()
    print()
    
    print("2. Testando credentials.json...")
    creds_ok = test_credentials()
    print()
    
    print("3. Testando data.json...")
    data_ok = test_data_json()
    print()
    
    print("4. Testando conexão com Google Sheets...")
    if creds_ok and imports_ok:
        connection_ok = test_gspread_connection()
    else:
        print("⚠️  Pulando teste de conexão (credenciais inválidas)")
        connection_ok = None
    print()
    
    print("=" * 60)
    print("📊 Resumo dos Testes")
    print("=" * 60)
    print(f"Imports:    {'✅ OK' if imports_ok else '❌ Falhou'}")
    print(f"Credenciais: {'✅ OK' if creds_ok else '❌ Falhou'}")
    print(f"Data JSON:   {'✅ OK' if data_ok else '❌ Falhou'}")
    print(f"Conexão:    {'✅ OK' if connection_ok else ('❌ Falhou' if connection_ok is not None else '⚠️  Pulado')}")
    print()
    
    all_ok = imports_ok and creds_ok and data_ok and (connection_ok is None or connection_ok)
    
    if all_ok:
        print("✨ Tudo pronto! Execute:")
        print("   python send_to_google_sheets.py")
    else:
        print("⚠️  Resolva os problemas acima antes de continuar")
        sys.exit(1)


if __name__ == '__main__':
    main()
