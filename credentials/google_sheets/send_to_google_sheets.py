#!/usr/bin/env python3
"""
Script para enviar dados do data.json para Google Sheets.

Pré-requisitos:
1. Arquivo de credenciais Google: credentials.json (ou especificar o caminho abaixo)
2. Planilha Google compartilhada com o e-mail da credencial de serviço
3. Nome da aba na planilha (padrão: 'Dados_Brutos')

Uso:
    python send_to_google_sheets.py [--sheet-name "Nome da Planilha"] [--worksheet "Nome da Aba"] [--creds "credentials.json"]
"""

import json
import sys
import argparse
import logging
from pathlib import Path

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


def load_data_from_json(json_file):
    """Carrega dados do arquivo JSON"""
    try:
        with open(json_file, 'r', encoding='utf-8') as f:
            data = json.load(f)
        logger.info(f"✅ Carregados {len(data)} itens de {json_file}")
        return data
    except Exception as e:
        logger.error(f"❌ Erro ao carregar {json_file}: {e}")
        return None


def send_to_google_sheets(data, sheet_name, worksheet_name, creds_file):
    """Envia dados para Google Sheets"""
    try:
        import gspread
        from oauth2client.service_account import ServiceAccountCredentials
    except ImportError:
        logger.error("❌ gspread ou oauth2client não instalados. Execute: pip install gspread oauth2client")
        return False

    try:
        # Autenticação com Google
        scope = [
            'https://spreadsheets.google.com/feeds',
            'https://www.googleapis.com/auth/drive'
        ]
        
        logger.info(f"🔐 Autenticando com Google usando {creds_file}...")
        creds = ServiceAccountCredentials.from_json_keyfile_name(creds_file, scope)
        client = gspread.authorize(creds)
        
        # Abre a planilha e a aba
        logger.info(f"📊 Abrindo planilha '{sheet_name}', aba '{worksheet_name}'...")
        spreadsheet = client.open(sheet_name)
        
        try:
            worksheet = spreadsheet.worksheet(worksheet_name)
        except gspread.exceptions.WorksheetNotFound:
            logger.warning(f"⚠️  Aba '{worksheet_name}' não existe. Criando...")
            worksheet = spreadsheet.add_worksheet(title=worksheet_name, rows=1, cols=1)
        
        # Limpa a aba existente
        logger.info(f"🧹 Limpando aba '{worksheet_name}'...")
        worksheet.clear()
        
        # Define cabeçalhos (campos do data.json)
        if data:
            headers = list(data[0].keys())
        else:
            logger.error("❌ Nenhum dado para enviar")
            return False
        
        # Adiciona cabeçalhos
        logger.info(f"📝 Adicionando {len(headers)} colunas: {', '.join(headers)}")
        worksheet.append_row(headers)
        
        # Prepara os dados em lotes para melhor performance
        BATCH_SIZE = 100
        total_rows = len(data)
        
        logger.info(f"📤 Enviando {total_rows} itens em lotes de {BATCH_SIZE}...")
        
        for i in range(0, total_rows, BATCH_SIZE):
            batch = data[i:i + BATCH_SIZE]
            rows = []
            
            for item in batch:
                row = [item.get(header, '') for header in headers]
                rows.append(row)
            
            worksheet.append_rows(rows, value_input_option='USER_ENTERED')
            
            progress = min(i + BATCH_SIZE, total_rows)
            logger.info(f"   ✓ {progress}/{total_rows} itens enviados ({(progress/total_rows)*100:.1f}%)")
        
        logger.info(f"✅ Sucesso! {total_rows} itens enviados para Google Sheets")
        logger.info(f"📍 Planilha: {sheet_name}")
        logger.info(f"📍 Aba: {worksheet_name}")
        
        return True
        
    except FileNotFoundError:
        logger.error(f"❌ Arquivo de credenciais não encontrado: {creds_file}")
        logger.error("   Crie um arquivo de credenciais em https://console.cloud.google.com/")
        return False
    except gspread.exceptions.SpreadsheetNotFound:
        logger.error(f"❌ Planilha '{sheet_name}' não encontrada ou não acessível")
        logger.error("   Verifique se a planilha existe e se foi compartilhada com o e-mail da credencial")
        return False
    except Exception as e:
        logger.error(f"❌ Erro ao enviar para Google Sheets: {e}")
        return False


def main():
    parser = argparse.ArgumentParser(
        description='Enviar dados do data.json para Google Sheets',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Exemplos:
  # Usar valores padrão
  python send_to_google_sheets.py

  # Especificar nome da planilha e aba
  python send_to_google_sheets.py --sheet-name "Meu Drop" --worksheet "Produtos"

  # Usar arquivo de credenciais customizado
  python send_to_google_sheets.py --creds "/path/to/credentials.json"
        """
    )
    
    parser.add_argument(
        '--sheet-name',
        default='MeuDrop',
        help='Nome da planilha no Google Sheets (padrão: MeuDrop)'
    )
    
    parser.add_argument(
        '--worksheet',
        default='Dados_Brutos',
        help='Nome da aba dentro da planilha (padrão: Dados_Brutos)'
    )
    
    parser.add_argument(
        '--creds',
        default='credentials.json',
        help='Caminho do arquivo de credenciais JSON (padrão: credentials.json)'
    )
    
    parser.add_argument(
        '--data-file',
        default='data.json',
        help='Arquivo JSON com os dados a enviar (padrão: data.json)'
    )
    
    args = parser.parse_args()
    
    logger.info("=" * 60)
    logger.info("📊 Enviador de Dados para Google Sheets")
    logger.info("=" * 60)
    
    # Verifica se data.json existe
    if not Path(args.data_file).exists():
        logger.error(f"❌ Arquivo {args.data_file} não encontrado")
        sys.exit(1)
    
    # Carrega dados
    data = load_data_from_json(args.data_file)
    if not data:
        sys.exit(1)
    
    # Envia para Google Sheets
    success = send_to_google_sheets(
        data,
        args.sheet_name,
        args.worksheet,
        args.creds
    )
    
    logger.info("=" * 60)
    
    sys.exit(0 if success else 1)


if __name__ == '__main__':
    main()
