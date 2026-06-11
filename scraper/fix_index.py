import json
import os

INPUT_FILE = "seuarmazemdrop_data.json"

def fix_index():
    """Renumera todos os produtos sequencialmente de 1 até o total"""
    
    if not os.path.exists(INPUT_FILE):
        print(f"❌ Arquivo {INPUT_FILE} não encontrado")
        return
    
    # Carregar produtos do JSON
    with open(INPUT_FILE, 'r', encoding='utf-8') as f:
        products = json.load(f)
    
    print(f"📂 Carregados {len(products)} produtos do JSON")
    
    # Verificar se há coluna index
    if products and 'index' not in products[0]:
        print("⚠️  A coluna 'index' não existe nos produtos")
        print("💡 Adicionando coluna 'index' sequencial...")
    else:
        print("🔍 Verificando sequência do index atual...")
        # Mostrar alguns exemplos do index atual
        for i in range(min(10, len(products))):
            print(f"   Produto {i}: index = {products[i].get('index', 'N/A')}, id = {products[i].get('id', 'N/A')[:20]}")
    
    # Renumerar todos os produtos sequencialmente
    total_produtos = len(products)
    for i, product in enumerate(products):
        product['index'] = i + 1  # Index começa de 1
    
    # Salvar arquivo atualizado
    with open(INPUT_FILE, 'w', encoding='utf-8') as f:
        json.dump(products, f, indent=2, ensure_ascii=False)
    
    print(f"✅ Index corrigido: {total_produtos} produtos renumerados de 1 a {total_produtos}")
    print(f"💾 Arquivo salvo: {INPUT_FILE}")
    
    # Mostrar exemplos do index corrigido
    print("\n📋 Exemplos do index corrigido:")
    for i in range(min(10, len(products))):
        print(f"   Produto {i}: index = {products[i]['index']}, id = {products[i]['id'][:20]}")

if __name__ == "__main__":
    print("🔧 Corrigindo index do JSON...")
    fix_index()
