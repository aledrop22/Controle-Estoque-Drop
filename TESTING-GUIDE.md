# 🧪 Guia de Teste - Sistema de Rastreamento de Estoque Crítico

## 🎯 Objetivo

Este guia mostra como testar o sistema de rastreamento de SKUs críticos localmente e em produção.

## 📋 Pré-requisitos

1. ✅ Node.js instalado
2. ✅ Variáveis de ambiente configuradas
3. ✅ Google Sheets com dados de estoque
4. ✅ Pelo menos um canal de notificação (Telegram/Discord/Email)

## 🚀 Testes Locais

### 1. Instalar Dependências

```powershell
npm install
```

### 2. Configurar Variáveis de Ambiente

Crie um arquivo `.env` na raiz:

```env
# Google Sheets
GOOGLE_CREDENTIALS={"client_email":"...","private_key":"..."}
SPREADSHEET_ID=1abc...xyz
SHEET_NAME=Controle

# Telegram (opcional para teste)
TELEGRAM_BOT_TOKEN=123456:ABC-DEF...
TELEGRAM_CHAT_ID=123456789
```

### 3. Iniciar Servidor Local

```powershell
npm run dev
```

O servidor estará disponível em: `http://localhost:5173`

## 🧪 Cenários de Teste

### Cenário 1: Registrar SKU com 1 Unidade

**Setup:**
1. No Google Sheets, adicione um produto com estoque = 1
2. Exemplo:
   ```
   ID | Produto        | Estoque | Data da Coleta
   A1 | Teste SKU 1   | 1       | 2025-12-27
   ```

**Teste:**
```powershell
# Executar verificação de estoque
curl http://localhost:3000/api/check-low-stock
```

**Resultado Esperado:**
```json
{
  "success": true,
  "tracking": {
    "totalTracked": 1,
    "withOneUnit": 1,
    "atZero": 0
  },
  "details": [
    {
      "id": "A1",
      "name": "Teste SKU 1",
      "stock": 1,
      "tracked": true,
      "daysAtZero": 0
    }
  ]
}
```

**Verificar:**
```powershell
# Consultar registry
curl http://localhost:3000/api/critical-stock-registry
```

✅ **Sucesso:** SKU aparece com status "🟡 1 UNIDADE (rastreado)"

---

### Cenário 2: SKU Zera (Vendido)

**Setup:**
1. Altere o estoque do produto para 0 no Google Sheets
2. Mantenha a mesma data ou atualize para hoje

**Teste:**
```powershell
curl http://localhost:3000/api/check-low-stock
```

**Resultado Esperado:**
```json
{
  "tracking": {
    "totalTracked": 1,
    "withOneUnit": 0,
    "atZero": 1,
    "day1AtZero": 0
  },
  "details": [
    {
      "id": "A1",
      "stock": 0,
      "tracked": true,
      "daysAtZero": 0
    }
  ]
}
```

✅ **Sucesso:** SKU continua rastreado, mas com estoque 0

---

### Cenário 3: SKU Permanece Zerado (Dia 1)

**Simular Passagem de Tempo:**

Edite manualmente `critical-stock-tracker.js` para teste:

```javascript
// Temporariamente, para simular 1 dia depois
export function simulateDayPassed() {
    const registry = loadRegistry();
    for (const [sku, entry] of registry.entries()) {
        if (entry.zeroDate) {
            // Simula 1 dia
            entry.zeroDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
            registry.set(sku, entry);
        }
    }
    saveRegistry(registry);
}
```

**Teste:**
```powershell
# Chame a função simulateDayPassed() antes
curl http://localhost:3000/api/check-low-stock
```

**Resultado Esperado:**
```json
{
  "tracking": {
    "day1AtZero": 1
  },
  "details": [
    {
      "daysAtZero": 1
    }
  ]
}
```

✅ **Sucesso:** daysAtZero = 1

---

### Cenário 4: SKU no Dia 2 (Alerta)

**Simular 2 dias:**

```javascript
// Simula 2 dias
entry.zeroDate = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
```

**Teste:**
```powershell
curl http://localhost:3000/api/check-low-stock
```

**Resultado Esperado:**
- ⚠️ Notificação enviada: "ALERTA: Removidos amanhã (2 dias zerados)"
- Status: "⚠️ CRÍTICO (remove amanhã)"

```json
{
  "tracking": {
    "day2AtZero": 1
  }
}
```

✅ **Sucesso:** Alerta preventivo enviado

---

### Cenário 5: SKU no Dia 3 (Remoção)

**Simular 3 dias:**

```javascript
entry.zeroDate = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
```

**Teste:**
```powershell
# Executar notificação de remoção
curl http://localhost:3000/api/notify-removed-skus
```

**Resultado Esperado:**
```json
{
  "success": true,
  "removed": 1,
  "removedSkus": [
    {
      "sku": "A1",
      "name": "Teste SKU 1",
      "daysAtZero": 3
    }
  ]
}
```

**Verificar:**
```powershell
curl http://localhost:3000/api/critical-stock-registry
```

✅ **Sucesso:** SKU não aparece mais no registry

---

### Cenário 6: Reposição de Estoque

**Setup:**
1. SKU estava zerado há 2 dias
2. Altere estoque no Google Sheets para 5 unidades

**Teste:**
```powershell
curl http://localhost:3000/api/check-low-stock
```

**Resultado Esperado:**
```json
{
  "tracking": {
    "atZero": 0
  },
  "details": []
}
```

**Verificar Registry:**
```powershell
curl http://localhost:3000/api/critical-stock-registry
```

✅ **Sucesso:** SKU removido do rastreamento (estoque > 2)

---

### Cenário 7: Reposição com 1 Unidade

**Setup:**
1. SKU estava zerado há 1 dia
2. Altere estoque para 1 unidade

**Teste:**
```powershell
curl http://localhost:3000/api/check-low-stock
```

**Resultado Esperado:**
- daysAtZero resetado para 0
- SKU continua rastreado
- firstSeenWithOne atualizado

```json
{
  "tracking": {
    "withOneUnit": 1,
    "atZero": 0
  },
  "details": [
    {
      "stock": 1,
      "tracked": true,
      "daysAtZero": 0
    }
  ]
}
```

✅ **Sucesso:** Contador resetado, SKU continua rastreado

---

## 🌐 Testes em Produção (Vercel)

### 1. Deploy

```powershell
# Fazer deploy
vercel --prod

# Ou via Git
git add .
git commit -m "Adicionar sistema de rastreamento crítico"
git push origin main
```

### 2. Configurar Cron Jobs

No Vercel Dashboard:
1. Settings → Cron Jobs
2. Verificar:
   - ✅ `/api/check-low-stock` - 0 */6 * * *
   - ✅ `/api/notify-removed-skus` - 0 9 * * *

### 3. Testar Endpoints em Produção

```powershell
# Substituir pelo seu domínio
$domain = "https://seu-projeto.vercel.app"

# Teste 1: Verificar estoque
Invoke-RestMethod "$domain/api/check-low-stock"

# Teste 2: Ver registry
Invoke-RestMethod "$domain/api/critical-stock-registry"

# Teste 3: Ver HTML
Start-Process "$domain/api/critical-stock-registry?format=html"

# Teste 4: Forçar notificação de remoção
Invoke-RestMethod "$domain/api/notify-removed-skus"
```

### 4. Verificar Notificações

#### Telegram
1. Abra o chat do bot
2. Verifique mensagens de:
   - 🔴 SKUs zerados
   - 🟠 SKUs com 1 unidade
   - ⚠️ Alertas dia 2
   - ⏰ Remoções dia 3

#### Discord
1. Abra o canal configurado
2. Verifique embeds com:
   - Cores por status
   - Campos detalhados
   - Timestamps

#### Email
1. Verifique inbox
2. Confirme recebimento de HTML formatado

---

## 📊 Dashboard Visual

Acesse no navegador:
```
https://seu-projeto.vercel.app/api/critical-stock-registry?format=html
```

**Verificar:**
- ✅ Cards de estatísticas carregam
- ✅ Tabela mostra todos os SKUs
- ✅ Cores corretas por status
- ✅ Datas formatadas em pt-BR
- ✅ Responsivo em mobile

---

## 🔍 Debugging

### Ver Logs em Produção

1. Vercel Dashboard → Projeto
2. Functions → Logs
3. Filtrar por `/api/check-low-stock` ou `/api/notify-removed-skus`

**Logs esperados:**
```
[TRACKER] Novo SKU crítico registrado: SKU123 - Produto Exemplo
[TRACKER] SKU zerou: SKU123 - Produto Exemplo
[TRACKER] SKU completou 3 dias zerado: SKU123 - Produto Exemplo
[TRACKER] SKU removido após 3 dias zerado: SKU123 - Produto Exemplo
```

### Verificar Estado do Registry

```powershell
# Ver estado completo
curl https://seu-projeto.vercel.app/api/critical-stock-registry | ConvertFrom-Json | ConvertTo-Json -Depth 10

# Ver apenas estatísticas
curl "https://seu-projeto.vercel.app/api/critical-stock-registry" | Select-Object -ExpandProperty stats
```

### Limpar Registry para Novo Teste

```powershell
# Remover SKU específico
Invoke-RestMethod -Method DELETE "https://seu-projeto.vercel.app/api/critical-stock-registry?sku=A1"
```

---

## ✅ Checklist de Validação

### Funcionalidades Básicas
- [ ] SKU com 1 unidade é rastreado automaticamente
- [ ] SKU zerado permanece no registry
- [ ] Contador de dias incrementa corretamente
- [ ] Alerta dia 2 é enviado
- [ ] SKU é removido no dia 3
- [ ] Reposição de estoque reseta contadores

### Notificações
- [ ] Telegram recebe alertas
- [ ] Discord recebe embeds
- [ ] Email é enviado com HTML
- [ ] Cooldown funciona (não spam)

### API
- [ ] `/api/check-low-stock` retorna dados corretos
- [ ] `/api/critical-stock-registry` lista SKUs
- [ ] `/api/notify-removed-skus` remove e notifica
- [ ] Filtros funcionam (`?filter=zero`)
- [ ] DELETE remove SKU

### Interface
- [ ] HTML dashboard carrega
- [ ] Estatísticas corretas
- [ ] Tabela ordenada por criticidade
- [ ] Cores corretas por status
- [ ] Responsivo

### Cron Jobs
- [ ] check-low-stock executa a cada 6h
- [ ] notify-removed-skus executa diariamente às 9h
- [ ] Logs aparecem no Vercel

---

## 🐛 Problemas Comuns

### SKU não é rastreado
**Causa:** Estoque > 2 ou não aparece na planilha
**Solução:** Verificar Google Sheets e threshold

### Contador não incrementa
**Causa:** Data não mudou ou cron não executou
**Solução:** Forçar execução manual

### Notificações não chegam
**Causa:** Variáveis de ambiente incorretas
**Solução:** Verificar Vercel → Settings → Environment Variables

### Registry reseta
**Causa:** Deploy novo apaga memória
**Solução:** Implementar Vercel KV (veja documentação principal)

---

## 📈 Próximos Testes

1. **Teste de Carga:** Simular 100+ SKUs
2. **Teste de Concorrência:** Múltiplas requisições simultâneas
3. **Teste de Falha:** Simular Google Sheets offline
4. **Teste de Notificação em Massa:** 50+ SKUs removidos de uma vez

---

**Boa sorte com os testes! 🚀**
