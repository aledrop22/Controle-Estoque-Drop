# 📊 Guia Rápido: Enviar Dados para Google Sheets

## ⚡ TL;DR (Resumido)

1. **Obtenha credenciais do Google**
   - Vá para https://console.cloud.google.com/
   - Crie uma conta de serviço
   - Baixe o arquivo JSON (será o seu `credentials.json`)

2. **Coloque o arquivo `credentials.json` nesta pasta**

3. **Execute:**
   ```bash
   python send_to_google_sheets.py
   ```

Pronto! Os dados serão enviados para uma planilha chamada "MeuDrop".

---

## 📝 Detalhes Completos

### Passo 1: Criar Credenciais Google

**Siga este vídeo**: https://www.youtube.com/watch?v=4SSigWDpDJo (Google Sheets API Setup)

Ou siga manualmente:

1. Acesse [Google Cloud Console](https://console.cloud.google.com/)
2. Novo Projeto → Digite um nome → Criar
3. Busque "Google Sheets API" → Ativar
4. Credenciais → Criar Credencial → Conta de Serviço
5. Nome: "drop-scraper" → Criar
6. Chaves → Adicionar Chave → JSON
7. **Salve em**: `/home/alexandre/Scrapy-Drop-Brasil/Drop/credentials.json`

### Passo 2: Compartilhar Planilha com a Conta de Serviço

1. Abra o arquivo `credentials.json` com um editor de texto
2. Procure por `"client_email": "xxx@xxx.iam.gserviceaccount.com"`
3. Copie esse email
4. Vá para [Google Sheets](https://sheets.google.com/)
5. Crie uma nova planilha (ou use uma existente)
6. Clique em "Compartilhar" → Cole o email → Permissão de edição
7. **Copie o ID da planilha da URL** (entre `/d/` e `/edit`)

### Passo 3: Enviar Dados

**Opção A: Nome de planilha padrão (recomendado)**
```bash
python send_to_google_sheets.py
```
→ Enviará para planilha chamada "MeuDrop"

**Opção B: Planilha customizada**
```bash
python send_to_google_sheets.py --sheet-name "Minha Loja"
```

**Opção C: Com abas diferentes**
```bash
# Produtos em estoque
python send_to_google_sheets.py \
  --data-file data_instock.json \
  --worksheet "Em Estoque"

# Produtos fora de estoque
python send_to_google_sheets.py \
  --data-file data_outofstock.json \
  --worksheet "Fora de Estoque"
```

---

## 🔄 Automático (Scraper + Upload)

Se quer que os dados sejam enviados automaticamente após raspar:

```bash
./run_and_upload.sh
```

Isso vai:
1. ✅ Raspar dados
2. ✅ Salvar em data.json
3. ✅ Copiar para Windows (se em WSL)
4. ✅ Enviar para Google Sheets

---

## 🧪 Testar Credenciais

```bash
python -c "
import json
from pathlib import Path

try:
    with open('credentials.json') as f:
        creds = json.load(f)
    print('✅ Arquivo credentials.json válido!')
    print(f'   Email: {creds.get(\"client_email\")}')
    print(f'   Projeto: {creds.get(\"project_id\")}')
except Exception as e:
    print(f'❌ Erro: {e}')
"
```

---

## ❓ Problemas Comuns

| Problema | Solução |
|----------|---------|
| `Planilha não encontrada` | Verifique o nome exato da planilha |
| `Permissão negada` | Compartilhe a planilha com o email da credencial |
| `credentials.json não encontrado` | Coloque na pasta `/home/alexandre/Scrapy-Drop-Brasil/Drop/` |
| `ModuleNotFoundError: gspread` | Execute `pip install gspread oauth2client` |
| `Rate limit` | Espere um pouco e tente novamente (Google limita a ~60 reqs/min) |

---

## 📚 Referências

- [Google Sheets API Docs](https://developers.google.com/sheets/api)
- [gspread Documentation](https://docs.gspread.org/)
- [Service Account Documentation](https://cloud.google.com/iam/docs/service-accounts)

---

## 🔐 Segurança

⚠️ **NUNCA** compartilhe ou commite o arquivo `credentials.json`!

Adicione ao `.gitignore`:
```
credentials.json
```

---

Pronto! Agora você tem automação completa: Scraper → JSON → Google Sheets 🚀
