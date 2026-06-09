# Configurar Secrets no GitHub

## Opção 1: Interface Web (Recomendado)

1. Acesse: https://github.com/aledrop22/Controle-Estoque-Drop/settings/secrets/actions
2. Clique em "New repository secret"
3. Adicione os seguintes secrets:

### Secrets Necessários:

| Nome | Valor |
|------|-------|
| `EMAIL` | Seu email de login no SeuArmazemDrop |
| `PASSWORD` | Sua senha do SeuArmazemDrop |
| `VITE_SUPABASE_URL` | `https://lroxouwlciplbvitqzmh.supabase.co` |
| `SUPABASE_SERVICE_KEY` | Sua chave service role do Supabase |
| `SUPABASE_USER_ID` | `default-user` (ou seu user ID do Supabase) |

## Opção 2: Script PowerShell

Execute o script:
```powershell
.\setup-github-secrets.ps1
```

O script irá:
1. Pedir seu GitHub Personal Access Token
2. Ler valores do .env (se existir)
3. Criptografar e enviar os secrets para o GitHub

## Como obter GitHub Personal Access Token:

1. Acesse: https://github.com/settings/tokens
2. Clique em "Generate new token" → "Generate new token (classic)"
3. Dê um nome (ex: "GitHub Actions Secrets")
4. Selecione a permissão: `repo` (Full control of private repositories)
5. Clique em "Generate token"
6. Copie o token (você não verá novamente)

## Como obter SUPABASE_SERVICE_KEY:

1. Acesse: https://supabase.com/dashboard/project/lroxouwlciplbvitqzmh/settings/api
2. Copie a `service_role` secret
3. ⚠️ **Nunca compartilhe esta chave!**

## Após configurar:

O GitHub Actions irá rodar automaticamente todos os dias à meia-noite (UTC-3) e:
- Fazer login no SeuArmazemDrop
- Coletar dados dos produtos
- Enviar para o Supabase
- Commit e push das mudanças
- Vercel fará deploy automático
- Dashboard atualizado
