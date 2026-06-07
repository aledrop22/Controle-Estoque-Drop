# 📊 Enviador de Dados para Google Sheets

Este script envia automaticamente os dados raspados do arquivo `data.json` para uma planilha Google Sheets.

## ✅ Pré-requisitos

### 1. Criar Credenciais no Google Cloud Console

1. Acesse [Google Cloud Console](https://console.cloud.google.com/)
2. Crie um novo projeto (ou use um existente)
3. Ative a API do Google Sheets:
   - Vá para "APIs e serviços" > "Biblioteca"
   - Procure por "Google Sheets API"
   - Clique em "Ativar"

4. Crie uma credencial de conta de serviço:
   - Vá para "APIs e serviços" > "Credenciais"
   - Clique em "Criar credenciais" > "Conta de Serviço"
   - Preencha os detalhes (nome, descrição)
   - Clique em "Criar e continuar"
   - Pule as próximas seções e clique em "Concluído"

5. Crie uma chave JSON:
   - Na página de credenciais, clique na conta de serviço criada
   - Vá para a aba "Chaves"
   - Clique em "Adicionar chave" > "Criar nova chave"
   - Escolha "JSON"
   - O arquivo será baixado automaticamente como `credentials.json`

### 2. Compartilhar a Planilha

1. Copie o `client_email` do arquivo `credentials.json` (será algo como `service-account@project.iam.gserviceaccount.com`)
2. Crie uma nova planilha no Google Sheets ou use uma existente
3. Clique em "Compartilhar" e adicione o email da conta de serviço com permissão de edição

## 🚀 Como Usar

### Opção 1: Comando Simples (usa valores padrão)

```bash
# Coloque o arquivo credentials.json no mesmo diretório e execute:
python send_to_google_sheets.py
```

Isso enviará os dados para uma planilha chamada **"MeuDrop"** na aba **"Dados_Brutos"**.

### Opção 2: Especificar Nomes Personalizados

```bash
python send_to_google_sheets.py \
  --sheet-name "Minha Loja" \
  --worksheet "Produtos" \
  --creds "credentials.json"
```

### Opção 3: Usar Arquivo de Dados Customizado

```bash
python send_to_google_sheets.py \
  --data-file "data_instock.json" \
  --sheet-name "MeuDrop" \
  --worksheet "Em Estoque"
```

## 📋 Parâmetros

| Parâmetro | Padrão | Descrição |
|-----------|--------|-----------|
| `--sheet-name` | `MeuDrop` | Nome da planilha no Google Sheets |
| `--worksheet` | `Dados_Brutos` | Nome da aba dentro da planilha |
| `--creds` | `credentials.json` | Caminho do arquivo de credenciais |
| `--data-file` | `data.json` | Arquivo JSON com dados a enviar |

## 🔄 Integração Automática

Se quiser que os dados sejam enviados automaticamente após cada execução do scraper, adicione ao `setup_and_run.sh`:

```bash
# Após a linha que executa o Scrapy
python -m scrapy crawl meudrop -O data.json

# Adicione:
python send_to_google_sheets.py --sheet-name "MeuDrop" --worksheet "Dados_Brutos"
```

## 📊 Estrutura dos Dados

O script enviará os seguintes campos para a planilha (conforme disponíveis):

- `title` - Título do produto
- `price` - Preço
- `stock` - Quantidade em estoque
- `product_id` - ID do produto
- `url` - URL do produto
- `scrape_time` - Data/hora da raspagem
- `ncm` - Código NCM
- `peso` - Peso
- `status_liquidacao` - Status de liquidação
- `numero_vendas` - Número de vendas
- E outros campos presentes no JSON

## ⚠️ Troubleshooting

### Erro: "Planilha não encontrada"
- Verifique se o nome exato da planilha está correto
- Verifique se a planilha foi compartilhada com o e-mail da credencial

### Erro: "Permissão negada"
- Verifique se a conta de serviço tem permissão de edição na planilha
- Recheck que o e-mail foi adicionado como editor

### Erro: "Arquivo de credenciais não encontrado"
- Coloque o arquivo `credentials.json` na pasta raiz do projeto
- Ou use `--creds` para especificar o caminho

## 🔐 Segurança

⚠️ **IMPORTANTE**: Nunca faça commit do arquivo `credentials.json` no Git!

Adicione ao `.gitignore`:
```
credentials.json
```

## 📝 Exemplo Completo

```bash
# 1. Raspar dados
python -m scrapy crawl meudrop -O data.json

# 2. Enviar para Google Sheets
python send_to_google_sheets.py

# Ou em um comando só:
python -m scrapy crawl meudrop -O data.json && python send_to_google_sheets.py
```

## 💡 Dicas

1. **Múltiplas abas**: Você pode enviar dados diferentes para abas diferentes:
   ```bash
   python send_to_google_sheets.py --data-file data_instock.json --worksheet "Em Estoque"
   python send_to_google_sheets.py --data-file data_outofstock.json --worksheet "Fora de Estoque"
   ```

2. **Atualizar dados**: O script limpa a aba antes de enviar, então cada execução sobrescreve os dados antigos.

3. **Monitorar progresso**: O script mostra a porcentagem de conclusão conforme envia os dados.

## 📞 Suporte

Se encontrar problemas:
1. Verifique os logs de erro
2. Confirme que credentials.json está correto
3. Verifique a conexão com a internet
4. Teste com um `data.json` pequeno primeiro

---

Desenvolvido para o projeto Scrapy Drop Brasil 🇧🇷
