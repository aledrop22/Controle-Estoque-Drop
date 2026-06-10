import json
from pathlib import Path

OUTPUT_FILE = "seuarmazemdrop_data.json"

def remove_duplicates():
    """Remove produtos duplicados baseado no ID"""
    with open(OUTPUT_FILE, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    print(f"📊 Total de produtos: {len(data)}")
    
    # Remover duplicatas baseado no ID
    seen = set()
    unique_data = []
    for product in data:
        if product['id'] not in seen:
            seen.add(product['id'])
            unique_data.append(product)
    
    # Salvar dados únicos
    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        json.dump(unique_data, f, indent=2, ensure_ascii=False)
    
    print(f"✅ Removidas {len(data) - len(unique_data)} duplicatas")
    print(f"📦 Total único: {len(unique_data)}")
    
    return unique_data

if __name__ == "__main__":
    remove_duplicates()
