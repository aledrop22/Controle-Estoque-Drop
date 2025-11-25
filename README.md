<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1YZvAZP3rTI1jOJgkejIQrbgCN2dwzphS

## Executar Localmente

**Pré-requisitos:** Node.js >= 18 (recomendado LTS) e uma chave da API Gemini.

### Passo 1: Instalar dependências
`npm install`

### Passo 2: Obter a chave Gemini
1. Acesse https://ai.google.dev/ e faça login.
2. Vá em "Get API Key" / Credenciais e gere uma nova chave.
3. Copie a chave gerada.

### Passo 3: Criar arquivo de ambiente
Crie um arquivo `.env` na raiz do projeto (mesmo nível de `package.json`) com:
```
VITE_GEMINI_API_KEY=SUA_CHAVE_AQUI
```
O prefixo `VITE_` é obrigatório para que o Vite exponha a variável no front-end.

Alternativa temporária (apenas sessão atual do PowerShell):
```powershell
$env:VITE_GEMINI_API_KEY="SUA_CHAVE_AQUI"
```

### Passo 4: Rodar o app
`npm run dev`

Abra a URL exibida (normalmente `http://localhost:5173`). Se a seção de insights de IA não carregar, confirme se a variável está definida e reinicie o processo.

### Variáveis de Ambiente
- `VITE_GEMINI_API_KEY`: chave necessária para chamadas à API Gemini. Sem ela, o serviço retorna mensagem de ausência de chave.

### Troubleshooting
- Mensagem "A chave da API Gemini não foi configurada": verifique `.env` e reinicie `npm run dev`.
- Erro 401/403: confirme se a chave é válida e não foi revogada.
- Mudou a chave: atualize `.env` e reinicie o servidor.

## Integração Segura com Google Sheets (Backend)

Para não expor sua planilha publicamente, use o servidor Node incluído que lê via **Google Sheets API** usando Service Account.

### Passos
1. Crie Service Account (Google Cloud) e ative API Sheets.
2. Compartilhe a planilha com o e-mail da Service Account (Leitura).
3. Copie `client_email` e `private_key` do JSON da credencial.
4. Configure `.env`:
```
SHEET_ID=ID_DA_PLANILHA
SHEET_TAB=NomeDaAba        # opcional
SHEET_RANGE=A:E            # opcional
GOOGLE_SERVICE_ACCOUNT_EMAIL=client_email
GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nLINHAS\n-----END PRIVATE KEY-----\n"
```
5. Instale dependências: `npm install`
6. Rode backend: `npm run api`
7. Rode front em outro terminal: `npm run dev`

O front tenta `/api/inventory`. Se falhar, mostra aviso e usa mock; você pode importar CSV manualmente pelo botão.

### Endpoint
- `GET /api/inventory` -> `{ source, products }`
- Cache interno de 1 minuto.

### Teste
```powershell
Invoke-WebRequest http://localhost:4000/api/health
Invoke-WebRequest http://localhost:4000/api/inventory
```

### Boas Práticas
- Não commitar `.env`.
- Rotacionar chave se suspeitar de vazamento.

---
View your app in AI Studio: https://ai.studio/apps/drive/1YZvAZP3rTI1jOJgkejIQrbgCN2dwzphS
