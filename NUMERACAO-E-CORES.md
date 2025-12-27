# 🔢 Sistema de Numeração e Cores - Estoque Crítico

## ✨ Novas Funcionalidades Implementadas

### 1. Rastreamento de 2 Níveis de Criticidade

O sistema agora rastreia **dois níveis** de estoque crítico:

| Nível | Quantidade | Cor | Emoji |
|-------|-----------|-----|-------|
| **Crítico** | 1 unidade | 🔴 Vermelho | 🔴 |
| **Baixo** | 2 unidades | 🟡 Amarelo | 🟡 |

### 2. Numeração Separada

No banner de alerta e nas notificações, os SKUs são **contados separadamente**:

```
🔴 10 SKU (1UNID.)  e  🟡 3 SKU (2UNID.)
```

### 3. Data de Entrada

Cada SKU agora registra:
- **Data de entrada** no rastreamento
- **Quantidade inicial** quando entrou (1 ou 2 unidades)

## 📊 Banner de Alerta Atualizado

### Antes:
```
⚠️ ALERTA: Estoque Crítico
13 produto(s) com ≤ 2 unidades
```

### Agora:
```
⚠️ ALERTA: Estoque Crítico
🔴 10 SKU (1UNID.)  |  🟡 3 SKU (2UNID.)
[ZERADO(S) se houver]
```

## 🔔 Notificações Telegram/Discord/Email

### Formato Atualizado:

```
🚨 ALERTA DE ESTOQUE CRÍTICO

📊 Resumo: 13 produto(s) com ≤ 2 unidades
🔍 Rastreados: 3 SKU (2UNID.) e 10 SKU (1UNID.)

🔴 1 UNIDADE (10): ⚠️ CRÍTICO
• Produto A (SKU001) | Entrada: 25/12/2025
• Produto B (SKU002) | Entrada: 26/12/2025
...

🟡 2 UNIDADES (3):
• Produto X (SKU010) | Entrada: 27/12/2025
• Produto Y (SKU011) | Entrada: 27/12/2025
...
```

## 📋 Dashboard HTML (critical-stock-registry)

### Cards de Estatísticas com Cores:

| Card | Cor | Informação |
|------|-----|-----------|
| Total Rastreados | Azul | Todos os SKUs |
| 🟡 Com 2 Unidades | **Amarelo** | SKUs com 2 unid. |
| 🔴 Com 1 Unidade | **Vermelho** | SKUs com 1 unid. |
| Zerados | Cinza | SKUs com 0 |
| Dia 2 | Laranja | Remove amanhã |
| Pendente Remoção | Vermelho | 3+ dias |

### Tabela Atualizada:

| Coluna | Descrição |
|--------|-----------|
| SKU | Identificador do produto |
| Produto | Nome do produto |
| Estoque Atual | Quantidade atual em estoque |
| Status | Badge colorido com status |
| **Data de Entrada** | Quando entrou no rastreamento |
| Dias no Zero | Dias desde que zerou |
| Data que Zerou | Quando o estoque foi zerado |

### Exemplo de Linha na Tabela:

```
SKU001 | Produto Exemplo | 1 | 🔴 1 UNIDADE | 25/12/2025 (2 unid.) | - | -
```

## 🎨 Cores e Identificação Visual

### No Frontend (App.tsx):

```tsx
<span className="bg-red-700/50 px-2 py-0.5 rounded">
  🔴 10 SKU (1UNID.)
</span>

<span className="bg-yellow-500/50 px-2 py-0.5 rounded">
  🟡 3 SKU (2UNID.)
</span>
```

### No Dashboard HTML:

- **Card 2 Unidades:** Gradiente amarelo-ouro
- **Card 1 Unidade:** Gradiente vermelho
- **Badges na tabela:** Cores por criticidade

## 🔄 Fluxo de Rastreamento Atualizado

```
┌─────────────────────────────────────┐
│ Produto com 2 unidades              │
│ → Rastreado (🟡)                    │
│ → Data de entrada registrada        │
└────────────┬────────────────────────┘
             │
             ▼
┌─────────────────────────────────────┐
│ Vende 1 unidade → Fica com 1        │
│ → Muda para crítico (🔴)            │
│ → firstSeenWithOne registrado       │
└────────────┬────────────────────────┘
             │
             ▼
┌─────────────────────────────────────┐
│ Vende última unidade → Zero         │
│ → zeroDate registrada               │
│ → Contagem de 3 dias inicia         │
└────────────┬────────────────────────┘
             │
             ▼
        (3 dias depois)
             │
             ▼
┌─────────────────────────────────────┐
│ Remoção do rastreamento             │
│ → Notificação enviada               │
│ → SKU removido                      │
└─────────────────────────────────────┘
```

## 📡 API Response Atualizada

### GET /api/critical-stock-registry

```json
{
  "success": true,
  "stats": {
    "total": 13,
    "withTwoUnits": 3,
    "withOneUnit": 10,
    "atZero": 0,
    "day2AtZero": 0,
    "pendingRemoval": 0
  },
  "skus": [
    {
      "sku": "SKU001",
      "name": "Produto A",
      "currentStock": 1,
      "entryDate": "2025-12-25T10:00:00.000Z",
      "entryStock": 2,
      "firstSeenWithOne": "2025-12-26T14:30:00.000Z",
      "daysAtZero": 0,
      "status": "🟡 1 UNIDADE (rastreado)"
    }
  ]
}
```

### GET /api/check-low-stock

```json
{
  "tracking": {
    "totalTracked": 13,
    "withTwoUnits": 3,
    "withOneUnit": 10,
    "atZero": 0
  },
  "details": [
    {
      "id": "SKU001",
      "stock": 1,
      "tracked": true,
      "daysAtZero": 0
    }
  ]
}
```

## 🎯 Casos de Uso

### Caso 1: Novo Produto com 2 Unidades
1. Produto entra no sistema com 2 unidades
2. **Rastreamento iniciado** automaticamente
3. Aparece no contador: "🟡 1 SKU (2UNID.)"
4. Data de entrada: 27/12/2025 (2 unid.)

### Caso 2: Passa de 2 para 1 Unidade
1. Uma unidade é vendida
2. **Muda para crítico**: 🔴
3. Contador atualiza: "🟡 0 SKU (2UNID.)" → "🔴 1 SKU (1UNID.)"
4. `firstSeenWithOne` é registrado

### Caso 3: Novo Produto Direto com 1 Unidade
1. Produto entra já com 1 unidade
2. Rastreado como 🔴 crítico
3. `entryStock = 1`
4. `entryDate` e `firstSeenWithOne` são iguais

### Caso 4: Reposição
- **De 1 para 2:** Permanece rastreado (🟡)
- **De 1 para 3+:** Sai do rastreamento
- **De 0 para 1:** Contadores resetam, continua crítico
- **De 0 para 2:** Contadores resetam, volta para baixo

## 📊 Comparação Visual

### Tabela de Comparação:

| Aspecto | Antes | Agora |
|---------|-------|-------|
| **Rastreamento** | Só 1 unidade | 1 ou 2 unidades |
| **Contadores** | Único | Separados por cor |
| **Data** | Só firstSeenWithOne | entryDate + entryStock |
| **Dashboard** | 1 card "Com 1 Unidade" | 2 cards: 2 e 1 unidades |
| **Notificação** | "X produto(s)" | "🔴 X SKU (1UNID.) e 🟡 Y SKU (2UNID.)" |

## 🎨 Estilos e Cores

### Paleta de Cores:

```css
/* 1 Unidade - Crítico */
background: #ff6b6b; /* Vermelho vibrante */
color: white;

/* 2 Unidades - Baixo */
background: #ffd700; /* Amarelo ouro */
color: #856404; /* Marrom escuro */

/* Zerado */
background: #000; /* Preto */
color: white;
```

### Badges:

```html
🔴 1 UNIDADE - badge-danger (vermelho)
🟡 2 UNIDADES - badge-warning (amarelo)
⚠️ CRÍTICO - badge-warning (laranja)
🔴 ZERADO - badge-danger (vermelho escuro)
```

## 🚀 Deployment

As alterações estão prontas para deploy:

```bash
git add .
git commit -m "feat: numeração separada e cores para SKUs críticos (1 e 2 unid)"
git push origin main
```

Vercel irá:
1. ✅ Atualizar APIs automaticamente
2. ✅ Recompilar frontend com novo banner
3. ✅ Manter cron jobs ativos

## 📝 Changelog

### v2.0 - Sistema de Numeração e Cores

**Adicionado:**
- ✅ Rastreamento de SKUs com 2 unidades
- ✅ Campo `entryDate` (data de entrada)
- ✅ Campo `entryStock` (estoque inicial)
- ✅ Contadores separados: `withTwoUnits` e `withOneUnit`
- ✅ Cores distintas no banner: 🔴 vermelho, 🟡 amarelo
- ✅ Data de entrada na tabela HTML
- ✅ Numeração separada nas notificações

**Modificado:**
- ✅ Banner de alerta com contadores separados
- ✅ Dashboard HTML com 2 cards coloridos
- ✅ Mensagens Telegram/Discord com contagem
- ✅ Estrutura de dados do tracker

**Mantido:**
- ✅ Sistema de 3 dias para remoção
- ✅ Notificações automáticas
- ✅ Cron jobs
- ✅ Compatibilidade com sistema anterior

---

**Sistema pronto para produção! 🎉**

Agora você tem visibilidade completa de:
- **🟡 SKUs com 2 unidades** (baixo)
- **🔴 SKUs com 1 unidade** (crítico)
- **Data de entrada** de cada SKU
- **Contagem separada** por nível de criticidade
