# Migração Google Sheets → Supabase

## ✅ Migração Concluída

O sistema foi migrado com sucesso do Google Sheets para o Supabase.

## 📋 Mudanças Realizadas

### 1. Credenciais Google Sheets Isoladas
- Criada pasta `credentials/google_sheets/`
- Movidos todos os arquivos relacionados ao Google Sheets:
  - `send_to_google_sheets.py`
  - `test_google_sheets.py`
  - `README_GOOGLE_SHEETS.md`
  - `GOOGLE_SHEETS_SETUP.md`
  - `GOOGLE_SHEETS_RAPIDO.md`
- Adicionado README explicando que a integração foi depreciada

### 2. Scraper Atualizado
- Arquivo: `SCRAP_DROP_WSL-UBUNTU/scrape_seuarmazemdrop.py`
- Adicionada integração com Supabase via `supabase_api.py`
- Dados são salvos em:
  - JSON (backup): `seuarmazemdrop_data.json`
  - Supabase (principal): tabela `products`
- Conversão automática de dados:
  - Preço: string "R$ 5,00" → float 5.0
  - Estoque: string "300 pcs" → int 300
  - SKU: extraído da descrição "(SAD14123)" → "SAD14123"

### 3. Nova API Supabase
- Arquivo: `api/inventory-supabase.js`
- Endpoint: `/api/inventory-supabase`
- Funcionalidades:
  - Busca produtos do Supabase
  - Busca histórico de estoque
  - Cache de 1 minuto
  - Suporte a filtros por data
  - Formata dados para o dashboard

### 4. Dashboard Atualizado
- Arquivo: `src/App.tsx`
- Alterado endpoint de `/api/inventory` para `/api/inventory-supabase`
- Mensagens atualizadas para refletir Supabase em vez de planilha

### 5. Segurança
- Atualizado `.gitignore` para proteger credenciais:
  - `credentials/**/credentials.json`
  - `credentials/**/*.key`
  - `credentials/**/service-account.json`

## 🔧 Configuração Necessária

Para usar o sistema com Supabase, configure as variáveis de ambiente no `.env`:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key
SUPABASE_USER_ID=your-user-id
```

## 📊 Estrutura de Dados no Supabase

### Tabela: products
```sql
- id (UUID, primary key)
- user_id (UUID, foreign key)
- name (text)
- sku (text)
- color (text)
- size (text)
- price (numeric)
- stock (integer)
- image_url (text)
- url (text)
- created_at (timestamp)
- updated_at (timestamp)
```

### Tabela: inventory_history
```sql
- id (UUID, primary key)
- user_id (UUID, foreign key)
- product_id (UUID, foreign key → products)
- date (date)
- quantity (integer)
- price (numeric)
- notes (text)
- created_at (timestamp)
```

### Tabela: scraper_logs
```sql
- id (UUID, primary key)
- user_id (UUID, foreign key)
- url (text)
- status (text: 'success' | 'error' | 'pending')
- items_count (integer)
- error_message (text)
- created_at (timestamp)
```

## 🚀 Como Usar

### Executar Scraper
```bash
cd SCRAP_DROP_WSL-UBUNTU
python scrape_seuarmazemdrop.py
```

O scraper salvará automaticamente no Supabase se as credenciais estiverem configuradas.

### Ver Dashboard
1. Inicie o servidor: `npm run dev`
2. Acesse: `http://localhost:5173`
3. O dashboard carregará dados do Supabase automaticamente

## 🔄 Fluxo de Dados

```
Scraper (Playwright)
    ↓
scrape_seuarmazemdrop.py
    ↓
Dados JSON + Supabase API
    ↓
Supabase (products table)
    ↓
API: /api/inventory-supabase
    ↓
Dashboard (React)
```

## ⚠️ Notas Importantes

1. **Google Sheets Legado**: A integração com Google Sheets ainda está disponível em `credentials/google_sheets/` para referência, mas não é mais usada pelo sistema principal.

2. **Backup em JSON**: O scraper continua salvando em JSON como backup, mas o Supabase é a fonte principal de dados.

3. **Row Level Security**: O Supabase deve ter RLS configurado para que cada usuário veja apenas seus próprios dados.

4. **Histórico de Estoque**: Para ter histórico funcional, você precisa implementar um job que registre o estoque diariamente na tabela `inventory_history`.

## 📝 Próximos Passos Opcionais

1. Implementar job agendado para registrar histórico de estoque diariamente
2. Adicionar autenticação no dashboard
3. Implementar sincronização bidirecional (dashboard → Supabase)
4. Adicionar notificações de estoque baixo via Supabase

## 🆘 Suporte

Para problemas:
- Verifique se as variáveis de ambiente estão configuradas
- Verifique se o schema SQL foi executado no Supabase
- Consulte `SUPABASE-SETUP.md` para mais detalhes
