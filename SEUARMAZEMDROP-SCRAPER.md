# Scraper - SeuArmazemDrop.com.br

## Descrição
Script para fazer scraping do catálogo de produtos em https://app.seuarmazemdrop.com.br/dashboard/catalog

## Seletores HTML Utilizados

### Configuração de Paginação
- **Elemento:** `<select id="perPage">`
- **Valor utilizado:** 100 itens por página
- **Total de páginas:** 8 (para capturar todos os produtos)

### Dados Coletados por Produto

#### 1. **Imagem**
```html
<img src="https://app.seuarmazemdrop.com.br/uploads/1780685735-0.png" alt="product-pic" class="img-fluidx">
```
**Seletor:** `img[alt='product-pic']` → atributo `src`

#### 2. **Descrição**
```html
<a href="https://app.seuarmazemdrop.com.br/dashboard/product/create/48829" class="text-dark">
  (SAD14123) Prata - Cortina Franja Metálica 1x2m Painel Decoração Festa Fundo Fotográfico Cenário
</a>
```
**Seletor:** `a.text-dark` → inner_text

#### 3. **Preço**
```html
<div class="product-price-tag">
  R$ 5,00
</div>
```
**Seletor:** `div.product-price-tag` → inner_text

#### 4. **Cor**
```html
<h5 class="m-0"> <span class="text-muted"> Cor : Prata</span></h5>
```
**Seletor:** `h5.m-0 span.text-muted` contendo "Cor :" → extrair valor

#### 5. **Tamanho**
```html
<h5 class="m-0"> <span class="text-muted"> Tamanho : Unico</span></h5>
```
**Seletor:** `h5.m-0 span.text-muted` contendo "Tamanho :" → extrair valor

#### 6. **Estoque**
```html
<h5 class="m-0"> <span class="text-muted"> Estoque : 300 pcs</span></h5>
```
**Seletor:** `h5.m-0 span.text-muted` contendo "Estoque :" → extrair valor

## Como Usar

### 1. Pré-requisitos
```bash
# Certifique-se que está na pasta SCRAP_DROP_WSL-UBUNTU
cd SCRAP_DROP_WSL-UBUNTU

# Instalar dependências
pip install -r requirements.txt
```

### 2. Obter Cookie de Autenticação
```bash
python obter_cookie.py
```
Isso criará um arquivo `storage_state.json` com as credenciais de autenticação.

### 3. Executar o Scraper
```bash
python scrape_seuarmazemdrop.py
```

### 4. Saída
Os dados serão salvos em `seuarmazemdrop_data.json` com a seguinte estrutura:

```json
[
  {
    "image": "https://app.seuarmazemdrop.com.br/uploads/1780685735-0.png",
    "description": "(SAD14123) Prata - Cortina Franja Metálica 1x2m Painel Decoração Festa Fundo Fotográfico Cenário",
    "color": "Prata",
    "size": "Unico",
    "stock": "300 pcs",
    "price": "R$ 5,00",
    "product_url": "https://app.seuarmazemdrop.com.br/dashboard/product/create/48829"
  },
  ...
]
```

## Características do Script

✅ **Paginação automática** - Scrapa todas as 8 páginas (100 itens cada)  
✅ **Coleta de imagens** - URL da imagem do produto  
✅ **Dados estruturados** - Cor, tamanho, estoque em campos separados  
✅ **Tratamento de erros** - Continua mesmo se um produto falhar  
✅ **Log detalhado** - Mostra progresso de cada página  
✅ **Autenticação** - Usa cookies salvos para acesso autenticado  

## Requisitos

- Python 3.8+
- Playwright
- Acesso autenticado ao dashboard

## Configuração de Paginação

O script foi configurado para:
- **per_page**: 100 (alterado de 12)
- **Total de páginas**: 8
- **Total esperado de produtos**: até 800 itens

Para alterar, modifique as variáveis no script:
```python
TOTAL_PAGES = 8  # Número de páginas
PER_PAGE = 100   # Itens por página
```
