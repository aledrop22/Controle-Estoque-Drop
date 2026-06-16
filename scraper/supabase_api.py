import os
import requests
import json
import time
from datetime import datetime

class SupabaseAPI:
    def __init__(self, supabase_url, service_key, user_id='default-user'):
        self.supabase_url = supabase_url
        self.service_key = service_key
        self.user_id = user_id
        self.headers = {
            'apikey': service_key,
            'Authorization': f'Bearer {service_key}',
            'Content-Type': 'application/json'
        }

    def insert_products(self, products):
        """Insert or update products in Supabase usando upsert em lote"""
        url = f"{self.supabase_url}/rest/v1/products"
        
        results = []
        batch_size = 100  # Aumentado de 25 para 100 para maior velocidade
        total = len(products)
        
        for i in range(0, total, batch_size):
            batch = products[i:i + batch_size]
            print(f"📦 Enviando lote {i//batch_size + 1}/{(total + batch_size - 1)//batch_size} ({len(batch)} produtos)...")
            
            try:
                # Preparar dados em lote
                batch_data = []
                for product in batch:
                    batch_data.append({
                        'id': product.get('id'),
                        'user_id': self.user_id,
                        'name': product.get('name'),
                        'sku': product.get('id'),
                        'stock': product.get('stock', 0),
                        'price': product.get('price', 0),
                        'url': product.get('url'),
                        'image': product.get('image', ''),
                        'color': product.get('color', ''),
                        'size': product.get('size', '')
                    })
                
                # Usar POST com Prefer: resolution=merge-duplicates para upsert rápido
                headers_with_prefer = self.headers.copy()
                headers_with_prefer['Prefer'] = 'resolution=merge-duplicates'
                
                response = requests.post(url, headers=headers_with_prefer, json=batch_data, timeout=60)
                if response.status_code in [200, 201]:
                    results.extend([p.get('id') for p in batch])
                    print(f"  ✅ Lote {i//batch_size + 1} enviado ({len(batch)} produtos)")
                else:
                    print(f"  ❌ Erro no lote {i//batch_size + 1}: {response.status_code}")
                    print(f"     {response.text}")
            except Exception as e:
                print(f"  ❌ Erro no lote {i//batch_size + 1}: {e}")
        
        return results

    def insert_inventory_history(self, history_data):
        """Insert or update inventory history records using upsert to avoid duplicates"""
        url = f"{self.supabase_url}/rest/v1/inventory_history"
        
        batch_size = 100  # Enviar em lotes de 100
        total = len(history_data)
        
        for i in range(0, total, batch_size):
            batch = history_data[i:i + batch_size]
            print(f"📦 Enviando histórico lote {i//batch_size + 1}/{(total + batch_size - 1)//batch_size} ({len(batch)} registros)...")
            
            batch_data = []
            for item in batch:
                batch_data.append({
                    'product_id': item.get('product_id'),
                    'date': item.get('date', datetime.now().isoformat().split('T')[0]),
                    'quantity': item.get('quantity', 0),
                    'price': item.get('price', 0)
                })
            
            try:
                # Usar POST com Prefer: resolution=ignore-duplicates para evitar erro 409
                headers_with_prefer = self.headers.copy()
                headers_with_prefer['Prefer'] = 'resolution=ignore-duplicates'
                
                response = requests.post(url, headers=headers_with_prefer, json=batch_data, timeout=30)
                if response.status_code in [200, 201]:
                    print(f"  ✅ Histórico lote {i//batch_size + 1} enviado com sucesso")
                elif response.status_code == 409:
                    print(f"  ⏭️  Histórico lote {i//batch_size + 1}: registros já existem (ignorados)")
                else:
                    print(f"  ❌ Erro no histórico lote {i//batch_size + 1}: {response.status_code}")
            except requests.exceptions.Timeout:
                print(f"  ⏱️  Timeout no histórico lote {i//batch_size + 1}, tentando novamente...")
                time.sleep(2)
                try:
                    headers_with_prefer = self.headers.copy()
                    headers_with_prefer['Prefer'] = 'resolution=ignore-duplicates'
                    response = requests.post(url, headers=headers_with_prefer, json=batch_data, timeout=60)
                    if response.status_code in [200, 201]:
                        print(f"  ✅ Histórico lote {i//batch_size + 1} enviado no retry")
                    elif response.status_code == 409:
                        print(f"  ⏭️  Histórico lote {i//batch_size + 1}: registros já existem (ignorados)")
                except Exception as e:
                    print(f"  ❌ Falha no retry do histórico lote {i//batch_size + 1}: {e}")
            except Exception as e:
                print(f"  ❌ Erro no histórico lote {i//batch_size + 1}: {e}")

    def log_scrape(self, url, status, items_count, error_message=None):
        """Log scrape execution"""
        log_url = f"{self.supabase_url}/rest/v1/scraper_logs"
        data = {
            'url': url,
            'status': status,
            'items_count': items_count,
            'error_message': error_message
        }
        requests.post(log_url, headers=self.headers, json=data)

    def clear_all_products(self):
        """Delete all products from Supabase"""
        url = f"{self.supabase_url}/rest/v1/products"
        response = requests.delete(url, headers=self.headers, timeout=30)
        return response.status_code in [200, 204]

    def clear_all_history(self):
        """Delete all inventory history from Supabase"""
        url = f"{self.supabase_url}/rest/v1/inventory_history"
        response = requests.delete(url, headers=self.headers, timeout=30)
        return response.status_code in [200, 204]
