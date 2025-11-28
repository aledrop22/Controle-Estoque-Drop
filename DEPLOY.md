# Deploy na Vercel

Este projeto está preparado para deploy na Vercel utilizando Serverless Functions em `api/*` e build do frontend com Vite.

## Passos de Deploy

### 1) Criar/Linkar Projeto na Vercel
- Crie um projeto na Vercel e **importe do GitHub** o repositório `Controle-Estoque-Drop`.
- Confirme o framework detectado (Vite) e o diretório de saída `dist` (já definido em `vercel.json`).

### 2) Configurar Variáveis de Ambiente
Adicione no dashboard da Vercel (Environment: Production/Preview):

```
SHEET_ID=seu_sheet_id_aqui
SHEET_TAB=nome_da_aba (opcional)
SHEET_RANGE=A:E (padrão)
GOOGLE_SERVICE_ACCOUNT_EMAIL=seu_email_service_account
GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY=sua_chave_privada_completa
VITE_GEMINI_API_KEY=sua_chave_gemini (opcional)
```

- Cole a `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` **com cabeçalhos completos**:
  - `-----BEGIN PRIVATE KEY-----`
  - conteúdo da chave
  - `-----END PRIVATE KEY-----`
- Caso tenha copiado a chave com `\n`, **mantenha como foi gerada**; o código já converte `\n` para quebra de linha real.
- Garanta que a Service Account tem acesso de leitura à planilha (`SHEET_ID`).

### 3) Push para GitHub

```powershell
git add .
git commit -m "Preparar deploy Vercel"
git push
```

### 4) Deploy Automático
- A Vercel irá buildar o frontend (`npm run build`) e disponibilizar as funções em `/api/*`.
- O `vercel.json` já define `outputDirectory: dist`, rewrites de `/api`, e `maxDuration` para funções.

## Endpoints da API

- `https://<seu-projeto>.vercel.app/api/inventory` — Lista agregada de produtos
- `https://<seu-projeto>.vercel.app/api/inventory?today=1` — Produtos filtrados pela data atual
- `https://<seu-projeto>.vercel.app/api/health` — Health check
- `https://<seu-projeto>.vercel.app/api/debug-env` — Diagnóstico de variáveis

## Estrutura do Projeto

```
/api/              # Serverless Functions
  inventory.js     # Endpoint principal
  health.js        # Health check
  debug-env.js     # Debug de configuração
/src/              # Frontend React
vercel.json        # Configuração da Vercel
```

## Testes Locais

- Desenvolvimento:
```powershell
PowerShell -ExecutionPolicy Bypass -File .\start.ps1
```
- Build de produção:
```powershell
npm run build
```

## Pós-Deploy: Checks Rápidos
- Abra `https://<seu-projeto>.vercel.app/api/health` e confirme `{ ok: true }`.
- Visite `.../api/debug-env` e verifique:
  - `SHEET_ID` presente
  - `PRIVATE_KEY_PRESENT: true`
  - `JWT_INITIALIZED: true`
- Teste `.../api/inventory?today=1` e valide `filterDate` e lista de produtos.

## Troubleshooting
- **Credenciais**: Falhas 500 geralmente indicam variáveis ausentes ou chave inválida.
- **Permissões**: Garanta que a Service Account está compartilhada na planilha (somente leitura).
- **Datas**: A função normaliza datas; se o histórico vier com formatos diferentes, `inventory.js` trata `YYYY-MM-DD` e converte para ISO.
- **Logs**: Use o dashboard de logs da Vercel nas funções `api/*` para investigar erros.
