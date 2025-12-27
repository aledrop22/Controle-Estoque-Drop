# Sistema de Rastreamento de Estoque Crítico

## 📋 Visão Geral

Este sistema rastreia automaticamente SKUs com 1 unidade em estoque, mantendo registro mesmo após serem vendidos (estoque = 0), e os remove automaticamente após 3 dias zerados.

## 🎯 Funcionalidades

### 1. Rastreamento Automático
- **SKUs com 1 unidade** são automaticamente registrados no sistema
- **SKUs com 2 unidades** também são monitorados (threshold configurável)
- Quando um SKU **zera**, ele não desaparece imediatamente
- O sistema conta **3 dias** a partir da data em que zerou

### 2. Alertas Progressivos

#### 🟡 SKU com 1 unidade
- Produto entra no rastreamento
- Mensagem: "⚠️ RASTREADO"

#### 🟠 SKU zerou (Dia 0-1)
- Produto vendido, estoque = 0
- Mensagem: "🟠 ZERADO (X dia(s))"
- Mantido na tabela de estoque crítico

#### ⚠️ SKU no Dia 2
- Alerta: "⚠️ CRÍTICO (remove amanhã)"
- Notificação preventiva enviada

#### 🔴 SKU no Dia 3+
- Mensagem: "🔴 SERÁ REMOVIDO (3+ dias zerado)"
- Notificação de remoção enviada
- SKU removido do rastreamento

### 3. Comportamento com Reposição

Se um SKU zerado **receber estoque novamente**:
- ✅ Contador de dias é resetado
- ✅ Se voltar com 1 unidade, continua rastreado
- ✅ Se voltar com 3+ unidades, sai do rastreamento

## 📡 Endpoints da API

### 1. `/api/check-low-stock`
**Verifica estoque baixo e atualiza rastreamento**

```bash
# GET
curl https://seu-dominio.vercel.app/api/check-low-stock
```

**Resposta:**
```json
{
  "success": true,
  "lowStockProducts": 5,
  "tracking": {
    "totalTracked": 12,
    "withOneUnit": 3,
    "atZero": 9,
    "day1AtZero": 4,
    "day2AtZero": 3,
    "pendingRemoval": 2,
    "removedThisCheck": 1
  },
  "details": [
    {
      "id": "SKU123",
      "name": "Produto Exemplo",
      "stock": 0,
      "status": "OUT_OF_STOCK",
      "tracked": true,
      "daysAtZero": 2
    }
  ]
}
```

**Execução Automática:**
- ⏰ A cada 6 horas via cron job
- Atualiza status de todos os SKUs
- Envia notificações para estoque baixo

---

### 2. `/api/critical-stock-registry`
**Consulta SKUs rastreados**

```bash
# GET - Listar todos
curl https://seu-dominio.vercel.app/api/critical-stock-registry

# GET - Filtrar por status
curl "https://seu-dominio.vercel.app/api/critical-stock-registry?filter=zero"
# Filtros: 'zero' | 'one' | 'low' | 'all'

# GET - SKUs que serão removidos
curl "https://seu-dominio.vercel.app/api/critical-stock-registry?shouldRemove=true"

# GET - Visualização HTML
curl "https://seu-dominio.vercel.app/api/critical-stock-registry?format=html"

# DELETE - Remover SKU específico do rastreamento
curl -X DELETE "https://seu-dominio.vercel.app/api/critical-stock-registry?sku=SKU123"
```

**Resposta (JSON):**
```json
{
  "success": true,
  "stats": {
    "total": 12,
    "withOneUnit": 3,
    "atZero": 9,
    "day1AtZero": 4,
    "day2AtZero": 3,
    "pendingRemoval": 2
  },
  "count": 12,
  "skus": [
    {
      "sku": "SKU123",
      "name": "Produto Exemplo",
      "currentStock": 0,
      "firstSeenWithOne": "2025-12-24T10:00:00.000Z",
      "zeroDate": "2025-12-25T08:00:00.000Z",
      "daysAtZero": 2,
      "shouldRemove": false,
      "daysUntilRemoval": 1,
      "status": "⚠️ CRÍTICO (remove amanhã)",
      "lastUpdate": "2025-12-27T12:00:00.000Z"
    }
  ]
}
```

**Formato HTML:**
Acesse no navegador para ver uma dashboard visual com:
- 📊 Estatísticas em cards
- 📋 Tabela com todos os SKUs
- 🎨 Cores indicando status
- ⏰ Contagem de dias

---

### 3. `/api/notify-removed-skus`
**Notifica e remove SKUs que completaram 3 dias zerados**

```bash
# GET
curl https://seu-dominio.vercel.app/api/notify-removed-skus
```

**Resposta:**
```json
{
  "success": true,
  "message": "2 SKU(s) removido(s), 3 notificação(ões) enviada(s)",
  "removed": 2,
  "day2Alert": 3,
  "notifications": {
    "telegram": true,
    "discord": true,
    "email": true
  },
  "removedSkus": [
    {
      "sku": "SKU123",
      "name": "Produto Exemplo",
      "daysAtZero": 3,
      "zeroDate": "2025-12-24T08:00:00.000Z",
      "firstSeenWithOne": "2025-12-20T10:00:00.000Z"
    }
  ],
  "day2Skus": [
    {
      "sku": "SKU456",
      "name": "Outro Produto",
      "daysAtZero": 2
    }
  ]
}
```

**Execução Automática:**
- ⏰ Diariamente às 09:00 via cron job
- Remove SKUs com 3+ dias zerados
- Envia alertas preventivos (dia 2)

## 🔔 Notificações

### Telegram
Mensagens formatadas com:
- 🔴 SKUs zerados com contagem de dias
- 🟠 SKUs com 1 unidade marcados como RASTREADO
- ⚠️ Alertas de remoção iminente (dia 2)
- ⏰ Confirmação de remoção (dia 3)

### Discord
Embeds ricos com:
- Cores por status (vermelho/laranja/amarelo)
- Campos detalhados (SKU, dias zerado, datas)
- Timestamp de envio
- Limite de 10 embeds por mensagem

### Email (SendGrid)
Emails HTML com:
- Tabelas formatadas
- Cores por criticidade
- Links para produtos (se disponível)
- Resumo estatístico

## ⚙️ Configuração

### Variáveis de Ambiente

```env
# Google Sheets (obrigatório)
GOOGLE_CREDENTIALS={"client_email":"...","private_key":"..."}
SPREADSHEET_ID=your_sheet_id
SHEET_NAME=Controle

# Telegram (opcional)
TELEGRAM_BOT_TOKEN=123456:ABC-DEF...
TELEGRAM_CHAT_ID=123456789

# Discord (opcional)
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/...

# Email (opcional)
SENDGRID_API_KEY=SG.xxx...
NOTIFICATION_EMAIL=seu-email@dominio.com
EMAIL_FROM=noreply@estoque.com
```

### Cron Jobs (vercel.cron.json)

```json
{
  "crons": [
    {
      "path": "/api/check-low-stock",
      "schedule": "0 */6 * * *",
      "comment": "Verifica estoque a cada 6 horas"
    },
    {
      "path": "/api/notify-removed-skus",
      "schedule": "0 9 * * *",
      "comment": "Remove SKUs zerados há 3 dias (diário às 09:00)"
    }
  ]
}
```

## 🎨 Interface Visual

Acesse `/api/critical-stock-registry?format=html` para ver:

### Dashboard com:
- **Cards de Estatísticas**
  - Total rastreados
  - Com 1 unidade
  - Zerados
  - Dia 2 (remove amanhã)
  - Pendente remoção

- **Tabela Detalhada**
  - SKU e nome do produto
  - Estoque atual (destaque)
  - Status com badges coloridos
  - Dias no zero
  - Datas importantes

- **Design Responsivo**
  - Funciona em mobile
  - Cores gradient
  - Sombras e bordas arredondadas

## 📊 Fluxo de Dados

```
┌─────────────────────────────────────────────────┐
│  1. Produto entra com 1 unidade                 │
│     → Registrado automaticamente                │
└─────────────────────┬───────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────┐
│  2. Produto é vendido (estoque = 0)             │
│     → zeroDate registrada                       │
│     → daysAtZero = 0                            │
└─────────────────────┬───────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────┐
│  3. A cada verificação (6h):                    │
│     → Conta dias desde zeroDate                 │
│     → daysAtZero incrementa                     │
└─────────────────────┬───────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────┐
│  4. Dia 2: Alerta preventivo                    │
│     → "Remove amanhã"                           │
│     → Notificação enviada                       │
└─────────────────────┬───────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────┐
│  5. Dia 3+: Remoção                             │
│     → shouldRemove = true                       │
│     → Notificação de remoção                    │
│     → SKU removido do registry                  │
└─────────────────────────────────────────────────┘

        ┌──────────────────────────┐
        │  REPOSIÇÃO DE ESTOQUE    │
        │  (a qualquer momento)    │
        │  → Reset contadores      │
        │  → Volta ao início       │
        └──────────────────────────┘
```

## 🔧 Manutenção

### Limpar SKU Específico
```bash
curl -X DELETE "https://seu-dominio.vercel.app/api/critical-stock-registry?sku=SKU123"
```

### Forçar Verificação Manual
```bash
curl https://seu-dominio.vercel.app/api/check-low-stock
```

### Forçar Remoção Imediata
```bash
curl https://seu-dominio.vercel.app/api/notify-removed-skus
```

## ⚠️ Limitações Atuais

### Storage em Memória
- ⚠️ Os dados são armazenados em memória (Map)
- ⚠️ Resetam a cada deploy no Vercel
- ✅ **Solução recomendada:** Migrar para Vercel KV

### Para Produção com Persistência:

1. **Instalar Vercel KV:**
```bash
npm install @vercel/kv
```

2. **Atualizar critical-stock-tracker.js:**
```javascript
import { kv } from '@vercel/kv';

async function loadRegistry() {
    const data = await kv.get('critical_stock_registry');
    if (!data) return new Map();
    return new Map(JSON.parse(data));
}

async function saveRegistry(registry) {
    const data = JSON.stringify(Array.from(registry.entries()));
    await kv.set('critical_stock_registry', data);
}
```

3. **Configurar no Vercel Dashboard:**
   - Storage → Create KV Database
   - Conectar ao projeto
   - As variáveis de ambiente são adicionadas automaticamente

## 📈 Métricas e Monitoramento

O sistema fornece métricas em tempo real:
- Total de SKUs rastreados
- Distribuição por status (1 un, zerado, dia 1, dia 2, dia 3+)
- Taxa de remoção diária
- Histórico de reposição

## 🚀 Próximos Passos

1. ✅ Implementar persistência com Vercel KV
2. ✅ Adicionar webhook para reposição de estoque
3. ✅ Dashboard React interativo
4. ✅ Relatórios semanais automáticos
5. ✅ Integração com WhatsApp Business API
6. ✅ Machine Learning para previsão de estoque

## 📝 Logs e Debug

O sistema gera logs detalhados:
```javascript
[TRACKER] Novo SKU crítico registrado: SKU123 - Produto Exemplo
[TRACKER] SKU zerou: SKU123 - Produto Exemplo
[TRACKER] SKU completou 3 dias zerado: SKU123 - Produto Exemplo (será removido)
[TRACKER] SKU removido após 3 dias zerado: SKU123 - Produto Exemplo
[TRACKER] SKU voltou ao estoque: SKU123 - Produto Exemplo (5 unidades)
```

Verifique os logs no Vercel Dashboard → Functions → Logs

---

**Desenvolvido para Controle de Estoque Drop** 🎯
