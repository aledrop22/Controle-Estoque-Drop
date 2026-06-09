import json

# Carregar dados
with open('seuarmazemdrop_data.json', 'r', encoding='utf-8') as f:
    products = json.load(f)

print(f"Total de produtos: {len(products)}")

# Agrupar por ID para ver duplicados
from collections import defaultdict
by_id = defaultdict(list)
for p in products:
    pid = p.get('id', '')
    by_id[pid].append(p)

print(f"\nProdutos com ID vazio: {len(by_id.get('', []))}")
print(f"IDs únicos: {len([k for k in by_id.keys() if k])}")

# Mostrar exemplos de produtos com ID vazio
empty_id_products = by_id.get('', [])
if empty_id_products:
    print(f"\nExemplos de produtos com ID vazio:")
    for i, p in enumerate(empty_id_products[:5]):
        print(f"  {i+1}. {p.get('name', 'N/A')[:50]}...")

# Verificar se há produtos duplicados com o mesmo nome
by_name = defaultdict(list)
for p in products:
    name = p.get('name', '')
    if name:
        by_name[name].append(p)

duplicates_by_name = {k: v for k, v in by_name.items() if len(v) > 1}
print(f"\nProdutos duplicados por nome: {len(duplicates_by_name)}")

if duplicates_by_name:
    print(f"\nTop 10 nomes duplicados:")
    for name, prods in list(duplicates_by_name.items())[:10]:
        print(f"  {name} ({len(prods)} vezes)")
        for p in prods[:2]:
            print(f"    - ID: {p.get('id', 'N/A')}, Preço: {p.get('price', 0)}")
