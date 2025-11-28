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
SHEET_ID=seu_sheet_id_da_planilha_aqui
GOOGLE_SERVICE_ACCOUNT_EMAIL=seu_email@projeto.iam.gserviceaccount.com
GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----
sua_chave_privada_completa_aqui_com_quebras_de_linha
-----END PRIVATE KEY-----
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

- **SHEET_ID**: ID da sua planilha Google (está no `.env` local)
- **GOOGLE_SERVICE_ACCOUNT_EMAIL**: Email da conta de serviço
- **GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY**: 
  - Cole a chave **COMPLETA** incluindo `-----BEGIN PRIVATE KEY-----` e `-----END PRIVATE KEY-----`
  - Se tiver `\n` no texto, **mantenha** (o código já converte)
- **VITE_GEMINI_API_KEY**: 
  - **OBRIGATÓRIO** estar nas 3 environments (Production, Preview, Development)
  - Ou configure como secret (veja acima)
  - Sem ela, os insights de IA não funcionarão

#### 🔐 Permissões da Planilha
Certifique-se que o email da Service Account tem acesso à planilha:
1. Abra sua planilha no Google Sheets
2. Clique em **Compartilhar**
3. Adicione o email `GOOGLE_SERVICE_ACCOUNT_EMAIL`
4. Defina permissão como **Visualizador**

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
https://seu-projeto.vercel.app/api/debug-env
```

**Verifique:**
- `SHEET_ID: presente`
- `PRIVATE_KEY_PRESENT: true`
- `JWT_INITIALIZED: true`

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

**Causa:** Chave privada malformatada ou permissões da planilha

**Solução:**
1. Verifique se a chave tem `-----BEGIN` e `-----END`
2. Confirme que a Service Account está compartilhada na planilha
3. Teste localmente primeiro com `.\start.ps1`

---

### ❌ Dashboard carrega mas não mostra produtos

**Causa:** API retorna array vazio

**Solução:**
1. Abra `/api/inventory?today=1` no navegador
2. Verifique se `products: []` está vazio
3. Teste sem o filtro: `/api/inventory`
4. Verifique se os dados na planilha têm a coluna "Data da Coleta" preenchida

---

### ❌ Página não atualiza após mudanças

**Causa:** Cache do navegador

**Solução:**
1. Pressione `Ctrl + Shift + R` (hard refresh)
2. Ou limpe o cache do navegador
3. No Vercel, force um novo deploy sem cache (Passo 2A)

---

## 📊 Estrutura de Dados da Planilha

Para funcionar corretamente, sua planilha deve ter:

| Data da Coleta | ID do Produto | Produto | Estoque | Preço |
|----------------|---------------|---------|---------|-------|
| 2025-11-28     | 001           | Item A  | 100     | 10.50 |
| 2025-11-27     | 001           | Item A  | 95      | 10.50 |

**Colunas obrigatórias:**
- Data da Coleta (formato: YYYY-MM-DD)
- Produto (nome)
- Estoque (número)
- Preço (número)

---

## 🎯 Funcionalidades Disponíveis

Quando tudo estiver funcionando, você terá:

✅ Dashboard sempre online (24/7)  
✅ Acesso de qualquer lugar (só precisa do link)  
✅ Dados atualizados da planilha (cache de 1 minuto)  
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

- ✅ `/api/health` retorna `{"ok": true}`
- ✅ `/api/inventory` retorna array de produtos
- ✅ Dashboard carrega sem mensagem de erro
- ✅ Dados da planilha aparecem na tabela
- ✅ Pode acessar de qualquer navegador/dispositivo

**Pronto! Seu dashboard está 100% operacional no Vercel! 🎉**
