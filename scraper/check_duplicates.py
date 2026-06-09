import json
from collections import Counter

# Carregar dados
with open('seuarmazemdrop_data.json', 'r', encoding='utf-8') as f:
    products = json.load(f)

# Contar IDs
ids = [p['id'] for p in products if p.get('id')]
counter = Counter(ids)

# Mostrar duplicados
duplicates = {k: v for k, v in counter.items() if v > 1}
print(f"Total de produtos: {len(products)}")
print(f"Produtos únicos: {len(counter)}")
print(f"Produtos duplicados: {len(duplicates)}")
print(f"\nTop 20 IDs duplicados:")
for id, count in list(duplicates.items())[:20]:
    # Encontrar os produtos com este ID
    matching = [p for p in products if p.get('id') == id]
    print(f"\n  ID: {id} ({count} vezes)")
    for i, p in enumerate(matching[:3]):
        print(f"    {i+1}. {p.get('name', 'N/A')} - {p.get('price', 0)}")
