# 📊 Google Sheets Integration - Guia de Setup

Neste diretório você encontrará ferramentas para enviar seus dados raspados para Google Sheets automaticamente.

## 📁 Arquivos Criados

### Scripts

1. **`send_to_google_sheets.py`** - Script principal para enviar dados
   ```bash
   python send_to_google_sheets.py [opções]
   ```

2. **`run_and_upload.sh`** - Script que raspa + envia para Sheets
   ```bash
   ./run_and_upload.sh
   ```

3. **`test_google_sheets.py`** - Valida se tudo está configurado corretamente
   ```bash
   python test_google_sheets.py
   ```

### Documentação

- **`GOOGLE_SHEETS_RAPIDO.md`** ⚡ **LEIA ISTO PRIMEIRO!**
  - Guia rápido em 3 passos
  - Troubleshooting comum
  - Exemplos práticos

- **`GOOGLE_SHEETS_SETUP.md`** 📚 Documentação Completa
  - Instruções detalhadas
  - Parâmetros disponíveis
  - Integração avançada

---

## ⚡ Quick Start (30 segundos)

```bash
# 1. Obtenha credenciais em https://console.cloud.google.com/
# 2. Salve como credentials.json nesta pasta
# 3. Execute:

python test_google_sheets.py    # Validar setup
python send_to_google_sheets.py # Enviar dados!
```

---

## 🎯 Casos de Uso

### Caso 1: Enviar dados após raspar

```bash
./run_and_upload.sh
```
→ Raspa automaticamente + envia para Google Sheets

### Caso 2: Enviar dados existentes

```bash
python send_to_google_sheets.py
```
→ Envia `data.json` para "MeuDrop" / "Dados_Brutos"

### Caso 3: Enviar com nome customizado

```bash
python send_to_google_sheets.py \
  --sheet-name "Minha Loja" \
  --worksheet "Produtos Premium"
```

### Caso 4: Dividir em múltiplas abas

```bash
# Em estoque
python send_to_google_sheets.py \
  --data-file data_instock.json \
  --worksheet "Em Estoque"

# Fora de estoque
python send_to_google_sheets.py \
  --data-file data_outofstock.json \
  --worksheet "Fora de Estoque"
```

---

## 🔧 Configuração Completa

### Passo 1: Google Cloud Console
1. Crie projeto em https://console.cloud.google.com/
2. Ative "Google Sheets API"
3. Crie "Conta de Serviço"
4. Gere chave JSON
5. Salve como `credentials.json`

### Passo 2: Compartilhar Planilha
1. Abra `credentials.json`
2. Copie o `client_email`
3. Crie/abra planilha em Google Sheets
4. Clique "Compartilhar" → Cole o email → Salve

### Passo 3: Enviar Dados
```bash
python send_to_google_sheets.py
```

---

## 📊 Campos Enviados

Todos os campos presentes no `data.json` serão enviados:

- title, price, stock, product_id, url, scrape_time
- ncm, peso, altura, largura, comprimento, profundidade
- status_liquidacao, numero_vendas
- Qualquer outro campo que o scraper gere

---

## ✅ Checklist

- [ ] Credenciais Google obtidas
- [ ] Arquivo `credentials.json` copiado
- [ ] Planilha criada no Google Sheets
- [ ] Planilha compartilhada com email da credencial
- [ ] `test_google_sheets.py` passou
- [ ] `send_to_google_sheets.py` executado com sucesso

---

## 🚀 Próximas Etapas

1. **Automação Diária**
   - Configure um cron job para executar `./run_and_upload.sh` diariamente
   
2. **Backup**
   - Os dados são salvos em `data.json` como backup local
   
3. **Análise**
   - Use Google Sheets para gráficos, filtros e análises
   
4. **Integração com Apps Script**
   - Crie automações customizadas dentro do Google Sheets

---

## 📞 Suporte

**Problema?** Veja as respostas em:
1. `GOOGLE_SHEETS_RAPIDO.md` (Troubleshooting)
2. Execute `python test_google_sheets.py` para diagnóstico
3. Verifique os logs de erro

---

**Desenvolvido para**: Scrapy Drop Brasil 🇧🇷

Perguntas? Consulte os arquivos de documentação ou o arquivo `requirements.txt` para dependências.
