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

## Integração com Supabase

O dashboard usa Supabase como banco de dados principal. Configure as credenciais no `.env`:

```
VITE_SUPABASE_URL=https://seu-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=sua-chave-anon
SUPABASE_SERVICE_KEY=sua-chave-service
```

### API Endpoints
- `GET /api/inventory-supabase` -> `{ source, filterDate, products }`
- `GET /api/health` -> Status do servidor

### Teste
```powershell
Invoke-WebRequest http://localhost:4000/api/health
Invoke-WebRequest http://localhost:4000/api/inventory-supabase
```

---
View your app in AI Studio: https://ai.studio/apps/drive/1YZvAZP3rTI1jOJgkejIQrbgCN2dwzphS
