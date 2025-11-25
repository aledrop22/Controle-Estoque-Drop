# Configuração de Deploy na Vercel

Este projeto está configurado para deploy na Vercel com Serverless Functions.

## Passo a Passo para Deploy

### 1. Configurar Variáveis de Ambiente na Vercel

Acesse o dashboard da Vercel e adicione as seguintes variáveis de ambiente:

```
SHEET_ID=seu_sheet_id_aqui
SHEET_TAB=nome_da_aba (opcional)
SHEET_RANGE=A:E (padrão)
GOOGLE_SERVICE_ACCOUNT_EMAIL=seu_email_service_account
GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY=sua_chave_privada_completa
VITE_GEMINI_API_KEY=sua_chave_gemini (opcional)
```

**IMPORTANTE:** Para a `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY`, cole a chave completa incluindo:
- `-----BEGIN PRIVATE KEY-----`
- Todo o conteúdo
- `-----END PRIVATE KEY-----`

### 2. Fazer Push para o GitHub

```bash
git add .
git commit -m "Configuração para Vercel"
git push
```

### 3. Deploy Automático

A Vercel irá detectar automaticamente as mudanças e fazer o deploy.

## Endpoints da API

Depois do deploy, sua API estará disponível em:

- `https://seu-projeto.vercel.app/api/inventory` - Lista de produtos
- `https://seu-projeto.vercel.app/api/inventory?today=1` - Produtos de hoje
- `https://seu-projeto.vercel.app/api/health` - Health check
- `https://seu-projeto.vercel.app/api/debug-env` - Debug de variáveis

## Estrutura do Projeto

```
/api/              # Serverless Functions
  inventory.js     # Endpoint principal
  health.js        # Health check
  debug-env.js     # Debug de configuração
/src/              # Frontend React
vercel.json        # Configuração da Vercel
```

## Testando Localmente

Para desenvolvimento local, continue usando:
```bash
.\start.ps1
```

## Troubleshooting

Se a API não funcionar na Vercel:

1. Verifique as variáveis de ambiente no dashboard
2. Acesse `/api/debug-env` para ver se as credenciais foram carregadas
3. Verifique os logs no dashboard da Vercel
4. Certifique-se que a Service Account tem permissão na planilha
