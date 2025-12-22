# 🔔 Configuração de Notificações de Estoque Baixo

Este sistema monitora automaticamente produtos com **estoque ≤ 2 unidades** e envia notificações através de múltiplos canais.

## 📋 Funcionalidades

- ✅ Verificação automática a cada 6 horas (via Vercel Cron Jobs)
- ✅ Alerta para produtos com 0, 1 ou 2 unidades
- ✅ Notificações via Telegram, Discord e Email
- ✅ Sistema anti-spam (cooldown de 1 hora por produto)
- ✅ Mensagens detalhadas com links para produtos

## 🚀 Como Configurar

### 1. Habilitar Cron Jobs na Vercel

Adicione ao seu `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/check-low-stock",
      "schedule": "0 */6 * * *"
    }
  ]
}
```

**Importante:** Cron Jobs requerem um plano pago da Vercel (Pro ou Enterprise).

### 2. Configurar Variáveis de Ambiente

Acesse o dashboard da Vercel → Seu Projeto → Settings → Environment Variables

#### ✅ Obrigatórias (já configuradas):
- `GOOGLE_CREDENTIALS` - Credenciais do Google Sheets
- `SPREADSHEET_ID` - ID da planilha
- `SHEET_NAME` - Nome da aba (padrão: "Controle")

#### 📱 Telegram (Recomendado):

1. Crie um bot no Telegram:
   - Fale com [@BotFather](https://t.me/botfather)
   - Digite `/newbot` e siga as instruções
   - Copie o **token** fornecido

2. Obtenha o Chat ID:
   - Envie uma mensagem para seu bot
   - Acesse: `https://api.telegram.org/bot<SEU_TOKEN>/getUpdates`
   - Copie o valor de `chat.id`

3. Configure as variáveis:
   ```
   TELEGRAM_BOT_TOKEN=123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11
   TELEGRAM_CHAT_ID=123456789
   ```

#### 💬 Discord (Opcional):

1. No seu servidor Discord:
   - Vá em Configurações do Canal → Integrações → Webhooks
   - Clique em "Novo Webhook"
   - Copie a URL do Webhook

2. Configure:
   ```
   DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/...
   ```

#### 📧 Email via SendGrid (Opcional):

1. Crie uma conta no [SendGrid](https://sendgrid.com/)
2. Gere uma API Key
3. Configure:
   ```
   SENDGRID_API_KEY=SG.xxxxxxxxxxxxxxxxxxxxx
   NOTIFICATION_EMAIL=seu-email@exemplo.com
   EMAIL_FROM=noreply@seudominio.com
   ```

## 🧪 Testar Manualmente

### Opção 1: Via Browser/Postman
Acesse: `https://seu-projeto.vercel.app/api/check-low-stock`

### Opção 2: Via Terminal
```bash
curl https://seu-projeto.vercel.app/api/check-low-stock
```

### Opção 3: Adicionar botão no Dashboard
```tsx
// No seu App.tsx, adicione:
const testNotifications = async () => {
  try {
    const response = await fetch('/api/check-low-stock');
    const data = await response.json();
    alert(JSON.stringify(data, null, 2));
  } catch (error) {
    alert('Erro: ' + error.message);
  }
};

// No JSX:
<button onClick={testNotifications}>
  🔔 Testar Notificações
</button>
```

## 📊 Formato das Notificações

### Telegram
```
🚨 ALERTA DE ESTOQUE BAIXO

Total de produtos com estoque ≤ 2: 5

🔴 ZERADOS (2):
• Produto A (SKU-001)
• Produto B (SKU-002)

🟠 1 UNIDADE (2):
• Produto C (SKU-003)
• Produto D (SKU-004)

🟡 2 UNIDADES (1):
• Produto E (SKU-005)
```

### Discord
Embed card colorido com:
- 🔴 Vermelho: Estoque zerado
- 🟠 Laranja: 1 unidade
- 🟡 Amarelo: 2 unidades
- Links clicáveis para produtos

### Email
Tabela HTML formatada com cores e links

## ⏰ Frequências Disponíveis

Edite o `schedule` no `vercel.json`:

```javascript
"0 */6 * * *"   // A cada 6 horas (padrão)
"0 */3 * * *"   // A cada 3 horas
"0 */1 * * *"   // A cada 1 hora
"*/30 * * * *"  // A cada 30 minutos
"0 9,18 * * *"  // 2x ao dia (9h e 18h)
"0 9 * * *"     // 1x ao dia (9h)
```

## 🛡️ Sistema Anti-Spam

- Cada produto tem cooldown de 1 hora
- Evita notificações repetidas do mesmo produto
- Cache resetado automaticamente

## 📈 Ajustar Threshold

Para alterar o limite (padrão: 2 unidades), edite o arquivo `api/check-low-stock.js`:

```javascript
const LOW_STOCK_THRESHOLD = 3; // Notificar quando ≤ 3 unidades
```

## 🐛 Troubleshooting

### Não recebo notificações
1. Verifique se o Cron Job está configurado (requer plano pago)
2. Confira os logs da Vercel: Dashboard → Functions → Logs
3. Teste manualmente acessando `/api/check-low-stock`
4. Verifique as variáveis de ambiente

### Telegram não funciona
- Confirme que enviou pelo menos 1 mensagem para o bot antes
- Verifique o token e chat ID
- Teste diretamente: `https://api.telegram.org/bot<TOKEN>/sendMessage?chat_id=<CHAT_ID>&text=teste`

### Discord não funciona
- Confirme que o webhook está ativo
- Verifique as permissões do canal
- Teste o webhook direto com `curl` ou Postman

## 💰 Custos

- **Vercel Cron Jobs**: Incluído nos planos Pro ($20/mês) e Enterprise
- **Telegram**: Gratuito
- **Discord**: Gratuito
- **SendGrid**: Plano gratuito até 100 emails/dia

## 📞 Suporte

Em caso de dúvidas:
1. Consulte os logs na Vercel
2. Teste a API manualmente
3. Verifique a documentação do serviço de notificação usado
