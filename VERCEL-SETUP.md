# 🚀 Guia Completo: Dashboard Sempre Disponível no Vercel

## ✅ Checklist Rápido

- [ ] Variáveis de ambiente configuradas no Vercel
- [ ] Build realizado com sucesso
- [ ] API `/api/health` respondendo
- [ ] API `/api/inventory` retornando dados
- [ ] Dashboard carregando no navegador

---

## 🔧 Passo 1: Configurar Variáveis de Ambiente no Vercel

### Acesse o Dashboard da Vercel
1. Vá para [vercel.com/dashboard](https://vercel.com/dashboard)
2. Selecione seu projeto **Controle-Estoque-Drop**
3. Clique em **Settings** → **Environment Variables**

### Adicione TODAS estas variáveis:

#### ⚠️ IMPORTANTE: Copie do arquivo `.env` local

**Para as Environment Variables normais:**
```bash
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua_chave_anon_publica
SUPABASE_SERVICE_KEY=sua_chave_service_role_privada
VITE_GEMINI_API_KEY=sua_chave_gemini_opcional
```

**⚠️ ATENÇÃO: Variável VITE_GEMINI_API_KEY**

A chave Gemini precisa estar disponível em **build time**. No Vercel:

1. Vá em **Settings** → **Environment Variables**
2. Adicione `VITE_GEMINI_API_KEY` com o valor da sua chave
3. **IMPORTANTE**: Marque as 3 opções:
   - ✅ Production
   - ✅ Preview  
   - ✅ Development

**OU configure como Secret (recomendado):**

1. No terminal local:
```powershell
# Instale a CLI da Vercel (se não tiver)
npm i -g vercel

# Faça login
vercel login

# Adicione o secret
vercel secrets add vite_gemini_api_key "SUA_CHAVE_AQUI"
```

2. O `vercel.json` já está configurado para usar o secret `@vite_gemini_api_key`

#### 📝 Dicas Importantes:

- **VITE_SUPABASE_URL**: URL do seu projeto Supabase (obtido em Settings → API)
- **VITE_SUPABASE_ANON_KEY**: Chave pública anon do Supabase (obtido em Settings → API)
- **SUPABASE_SERVICE_KEY**: Chave privada service role (obtido em Settings → API)
  - **OBRIGATÓRIO** para a API funcionar
  - Nunca exponha esta chave no frontend
- **VITE_GEMINI_API_KEY**: 
  - **OBRIGATÓRIO** estar nas 3 environments (Production, Preview, Development)
  - Ou configure como secret (veja acima)
  - Sem ela, os insights de IA não funcionarão

---

## 🔄 Passo 2: Forçar Novo Deploy

Após configurar as variáveis:

### Opção A: Pelo Dashboard Vercel
1. Vá em **Deployments**
2. Clique nos 3 pontinhos do último deploy
3. Selecione **Redeploy**
4. Marque **Use existing Build Cache** = OFF
5. Confirme

### Opção B: Via Git (Recomendado)
```powershell
# No VS Code, abra o terminal PowerShell
git add .
git commit -m "Atualizar configurações Vercel" --allow-empty
git push origin main
```

Aguarde 1-2 minutos para o build completar.

---

## ✅ Passo 3: Testar se Está Funcionando

### 1. Teste o Health Check
Abra no navegador:
```
https://seu-projeto.vercel.app/api/health
```

**Resposta esperada:**
```json
{
  "ok": true,
  "timestamp": "2025-11-28T..."
}
```

### 2. Teste a API de Inventário
```
https://seu-projeto.vercel.app/api/inventory?today=1
```

**Resposta esperada:**
```json
{
  "source": "live",
  "filterDate": "2025-11-28",
  "products": [...]
}
```

### 3. Teste o Debug de Ambiente
```
https://seu-projeto.vercel.app/api/inventory-supabase
```

**Verifique:**
- Retorna array de produtos do Supabase
- Sem erros de credenciais

### 4. Abra o Dashboard
```
https://seu-projeto.vercel.app/
```

O dashboard deve carregar normalmente, sem erros no console.

---

## 🔖 Passo 4: Adicionar aos Favoritos

### Chrome/Edge:
1. Abra `https://seu-projeto.vercel.app/`
2. Pressione `Ctrl + D`
3. Nomeie como "Controle de Estoque"
4. Salve

### Acesso Rápido:
- Adicione à barra de favoritos
- Ou crie um atalho na área de trabalho

---

## 🐛 Troubleshooting - Problemas Comuns

### ❌ Erro: "Não foi possível carregar dados da planilha"

**Causa:** Variáveis de ambiente incorretas ou faltando

**Solução:**
1. Verifique `/api/debug-env` no navegador
2. Confirme que todas as variáveis estão corretas no Vercel
3. Refaça o deploy (Passo 2)

---

### ❌ Erro 500 nas APIs

**Causa:** Credenciais Supabase incorretas ou faltando

**Solução:**
1. Verifique se VITE_SUPABASE_URL e SUPABASE_SERVICE_KEY estão configuradas no Vercel
2. Teste localmente primeiro com `.\start.ps1`
3. Verifique as tabelas do Supabase (products e inventory_history) existem

---

### ❌ Dashboard carrega mas não mostra produtos

**Causa:** API retorna array vazio ou Supabase sem dados

**Solução:**
1. Abra `/api/inventory-supabase` no navegador
2. Verifique se `products: []` está vazio
3. Verifique se o scraper está enviando dados para o Supabase
4. Confirme que as tabelas products e inventory_history têm dados

---

### ❌ Página não atualiza após mudanças

**Causa:** Cache do navegador

**Solução:**
1. Pressione `Ctrl + Shift + R` (hard refresh)
2. Ou limpe o cache do navegador
3. No Vercel, force um novo deploy sem cache (Passo 2A)

---

## 📊 Estrutura de Dados do Supabase

Para funcionar corretamente, seu Supabase deve ter:

**Tabela `products`:**
- id (text, primary key)
- name (text)
- stock (integer)
- price (numeric)
- url (text, optional)
- created_at (timestamp)

**Tabela `inventory_history`:**
- id (uuid, primary key)
- product_id (text, foreign key)
- date (date)
- quantity (integer)
- price (numeric)
- created_at (timestamp)

---

## 🎯 Funcionalidades Disponíveis

Quando tudo estiver funcionando, você terá:

✅ Dashboard sempre online (24/7)  
✅ Acesso de qualquer lugar (só precisa do link)  
✅ Dados atualizados do Supabase (cache de 1 minuto)  
✅ Filtro por data automático  
✅ Métricas e gráficos em tempo real  
✅ Top vendas por período  
✅ Alertas de estoque baixo  

---

## 🔄 Atualizar o Dashboard

### Para mudanças no código (após editar App.tsx, etc):
```powershell
git add .
git commit -m "Descrição da mudança"
git push origin main
```

O Vercel fará deploy automaticamente em ~1 minuto.

---

## 📱 Acesso Mobile

O dashboard é responsivo! Funciona perfeitamente em:
- 📱 Celular
- 📱 Tablet
- 💻 Desktop

Basta acessar o mesmo link: `https://seu-projeto.vercel.app/`

---

## 🆘 Suporte

Se continuar com problemas:

1. **Logs do Vercel**: Settings → Functions → Ver logs das APIs
2. **Console do navegador**: F12 → Console (verifique erros)
3. **Teste local primeiro**: `.\start.ps1` deve funcionar sem erros

---

## ✨ Está Tudo Certo Quando:

- ✅ `/api/inventory-supabase` retorna array de produtos
- ✅ Dashboard carrega sem mensagem de erro
- ✅ Dados do Supabase aparecem na tabela
- ✅ Pode acessar de qualquer navegador/dispositivo

**Pronto! Seu dashboard está 100% operacional no Vercel! 🎉**
