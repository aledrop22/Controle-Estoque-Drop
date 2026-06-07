# 🚀 Setup Supabase + Login - Guia Completo

## 📋 Pré-requisitos
- Conta no Supabase (https://supabase.com)
- Projeto criado no Supabase
- Node.js 18+

## 🔧 Passo 1: Configurar Supabase SQL Schema

1. Vá para seu projeto Supabase
2. Abra **SQL Editor**
3. Copie todo o conteúdo de `SUPABASE-SCHEMA.sql`
4. Cole no editor SQL e execute
5. Aguarde conclusão (criará todas as tabelas e políticas de segurança)

✅ Status: Banco de dados pronto!

---

## 🔑 Passo 2: Obter Credenciais Supabase

### URL do Projeto
1. Vá em **Settings → API**
2. Copie **Project URL** (formato: `https://xxxxx.supabase.co`)
3. Cole no `.env` como `VITE_SUPABASE_URL`

### ANON_KEY (Chave Pública)
1. Em **Settings → API**
2. Copie **Anononymous Key** (chave pública para frontend)
3. Cole no `.env` como `VITE_SUPABASE_ANON_KEY`

### SERVICE KEY (Chave Privada - para API)
1. Em **Settings → API**
2. Copie **Service Role Key** (chave privada para backend)
3. Cole no `.env` como `SUPABASE_SERVICE_KEY`
4. ⚠️ **IMPORTANTE**: Nunca compartilhe nor commite esta chave!

Arquivo `.env` deve ficar assim:
```env
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJh...
SUPABASE_SERVICE_KEY=eyJh... (servidor apenas)
```

---

## 🎨 Passo 3: Instalar Dependências

```bash
npm install @supabase/supabase-js @supabase/auth-helpers-react
```

✅ Já feito! Dependências instaladas.

---

## 📝 Passo 4: Arquivos Criados

### Frontend (Login + Dados)
```
src/
  supabase/
    client.ts      → Inicializa cliente Supabase
    auth.ts        → Funções de autenticação
    types.ts       → TypeScript interfaces
    products.ts    → Funções para products/inventory
  
components/
  LoginPage.tsx   → Tela de login/registro
```

### Backend (API)
```
api/
  supabase.js     → API endpoints para Supabase
```

### Scraper
```
SCRAP_DROP_WSL-UBUNTU/
  supabase_api.py → Helper para salvar dados em Supabase
```

---

## 🔓 Passo 5: Integrar Login no App

A tela de login está pronta em `components/LoginPage.tsx`

Você precisa atualizar `src/App.tsx` para:
1. Mostrar LoginPage se usuário não está autenticado
2. Mostrar Dashboard se autenticado

Código de exemplo:
```tsx
import { useState, useEffect } from 'react';
import { LoginPage } from '../components/LoginPage';
import { getCurrentUser, onAuthStateChange } from './supabase/auth';

export const App = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is already logged in
    getCurrentUser().then(setUser);

    // Listen for auth changes
    const subscription = onAuthStateChange((newUser) => {
      setUser(newUser);
      setLoading(false);
    });

    return () => subscription?.unsubscribe();
  }, []);

  if (loading) return <div>Carregando...</div>;
  if (!user) return <LoginPage onLoginSuccess={() => window.location.reload()} />;

  return (
    <div>
      {/* Seu dashboard aqui */}
      <p>Bem-vindo, {user.email}!</p>
      <button onClick={() => signOut()}>Logout</button>
    </div>
  );
};
```

---

## 🐍 Passo 6: Integrar Scraper com Supabase

Seu scraper agora pode salvar direto em Supabase:

```python
# SCRAP_DROP_WSL-UBUNTU/scrape_seuarmazemdrop.py

import os
from supabase_api import SupabaseAPI

# Initialize
supa = SupabaseAPI(
    supabase_url=os.getenv('SUPABASE_URL'),
    service_key=os.getenv('SUPABASE_SERVICE_KEY'),
    user_id='seu-user-id'  # Get from auth
)

# After scraping all products
products = [
    {
        'name': '(SAD14123) Prata - Cortina...',
        'sku': 'SAD14123',
        'color': 'Prata',
        'size': 'Único',
        'price': 5.00,
        'stock': 300,
        'image_url': 'https://...'
    },
    # ... mais produtos
]

try:
    result = supa.insert_products(products)
    supa.log_scrape(url, 'success', len(products))
    print(f'✅ {len(products)} produtos salvos em Supabase')
except Exception as e:
    supa.log_scrape(url, 'error', 0, str(e))
    print(f'❌ Erro: {e}')
```

---

## 🧪 Passo 7: Testar Localmente

```bash
# Terminal 1: Backend API
npm run api

# Terminal 2: Frontend Dev
npm run dev
```

1. Acesse http://localhost:5173
2. Clique em "Não tenho conta - Criar Conta"
3. Crie uma conta (ex: teste@exemplo.com)
4. Faça login
5. Dashboard carrega os dados do Supabase ✅

---

## 🚀 Passo 8: Deploy em Vercel

### Variáveis de Ambiente

No Vercel, vá em **Project Settings → Environment Variables** e adicione:

```
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJh...
SUPABASE_SERVICE_KEY=eyJh...  (para API routes)
```

### Deploy
```bash
git add .
git commit -m "feat: Supabase integration + login"
git push
```

Vercel detectará e fará deploy automaticamente.

---

## 📊 Estrutura de Dados

### Tabela: products
```
id (UUID)
user_id (UUID) ← Quem é o dono
name (text)
sku (text)
color (text)
size (text)
price (number)
stock (integer)
image_url (text)
created_at
updated_at
```

### Tabela: inventory_history
```
id (UUID)
user_id (UUID)
product_id (UUID) → Referencia products
date (date)
quantity (integer)
notes (text)
created_at
```

### Tabela: scraper_logs
```
id (UUID)
user_id (UUID)
url (text)
status ('success' | 'error' | 'pending')
items_count (integer)
error_message (text)
created_at
```

---

## 🔐 Segurança (Row Level Security)

✅ Cada usuário vê **APENAS** seus próprios dados:
- Produtos dele
- Histórico dele
- Logs dele

Isso é automático via RLS policies no `SUPABASE-SCHEMA.sql`

---

## 🐛 Troubleshooting

### "SUPABASE_KEY not found"
→ Verifique `.env`, reload a página

### "Can't access table"
→ Execute o SQL schema no Supabase SQL Editor

### "Login não funciona"
→ Ative **Auth → Email** em Supabase Project Settings

### Dados não aparecem
→ Certifique-se que está usando `user_id` correto

---

## 📚 Arquivos Importantes

- `SUPABASE-SCHEMA.sql` - Schema SQL (execute uma vez)
- `src/supabase/` - Client SDK
- `components/LoginPage.tsx` - Tela de login pronta
- `api/supabase.js` - Backend API endpoints
- `SCRAP_DROP_WSL-UBUNTU/supabase_api.py` - Scraper integration

---

## ✅ Checklist de Setup

- [ ] Conta criada no Supabase
- [ ] Projeto criado no Supabase
- [ ] SQL Schema executado
- [ ] Credenciais adicionadas ao `.env`
- [ ] Dependências instaladas (`npm install`)
- [ ] LoginPage testada localmente
- [ ] Scraper testado com Supabase
- [ ] Deploy em Vercel
- [ ] Usuários criados e testados
- [ ] Dados sendo salvos corretamente

---

## 🎯 Próximos Passos

1. **Integrar dados históricos** - Importar CSV do Google Sheets
2. **Dashboard ao vivo** - Atualizar gráficos em tempo real
3. **Mais usuários** - Convidar colaboradores
4. **API pública** - Expor dados para integrações

Tudo pronto! 🚀
