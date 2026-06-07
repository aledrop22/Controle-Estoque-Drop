# Google Sheets Integration (Legado)

Esta pasta contém os scripts e documentação para integração com Google Sheets, que foi substituída pelo Supabase.

## ⚠️ AVISO IMPORTANTE

Esta integração foi **DEPRECIADA** e substituída pelo **Supabase**. O sistema agora usa:
- **Scraper**: Salva dados diretamente no Supabase
- **Dashboard**: Lê dados do Supabase via `/api/inventory-supabase`
- **API**: `api/inventory-supabase.js` (nova) em vez de `api/inventory.js` (antiga)

## Arquivos nesta pasta

- `send_to_google_sheets.py` - Script para enviar dados JSON para Google Sheets
- `test_google_sheets.py` - Script de teste para integração Google Sheets
- `README_GOOGLE_SHEETS.md` - Documentação original da integração
- `GOOGLE_SHEETS_SETUP.md` - Guia de setup do Google Sheets
- `GOOGLE_SHEETS_RAPIDO.md` - Guia rápido do Google Sheets

## Como usar (se necessário)

Se você ainda precisa usar o Google Sheets por algum motivo:

1. Coloque seu arquivo `credentials.json` nesta pasta
2. Execute:
   ```bash
   python send_to_google_sheets.py --sheet-name "Nome da Planilha" --worksheet "Nome da Aba" --creds credentials.json
   ```

## Migração para Supabase

Para migrar do Google Sheets para Supabase:

1. Configure as variáveis de ambiente no `.env`:
   ```
   VITE_SUPABASE_URL=your-project-url
   SUPABASE_SERVICE_KEY=your-service-key
   SUPABASE_USER_ID=your-user-id
   ```

2. Execute o schema SQL do Supabase (veja `SUPABASE-SCHEMA.sql` na raiz)

3. O scraper agora salva automaticamente no Supabase quando configurado

4. O dashboard lê automaticamente do Supabase

## Suporte

Para dúvidas sobre a nova integração com Supabase, consulte:
- `SUPABASE-SETUP.md` na raiz do projeto
- `SCRAP_DROP_WSL-UBUNTU/supabase_api.py` para integração do scraper
- `api/inventory-supabase.js` para API do dashboard
