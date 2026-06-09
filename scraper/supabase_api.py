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
        """Insert or update products in Supabase"""
        url = f"{self.supabase_url}/rest/v1/products"
        
        results = []
        batch_size = 25  # Enviar em lotes de 25
        total = len(products)
        
        for i in range(0, total, batch_size):
            batch = products[i:i + batch_size]
            print(f"📦 Enviando lote {i//batch_size + 1}/{(total + batch_size - 1)//batch_size} ({len(batch)} produtos)...")
            
            # Preparar dados
            batch_data = []
            for product in batch:
                batch_data.append({
                    'id': product.get('id'),
                    'index_num': product.get('index'),
                    'user_id': self.user_id,
                    'name': product.get('name'),
                    'stock': product.get('stock', 0),
                    'price': product.get('price', 0),
                    'url': product.get('url'),
                    'image': product.get('image', ''),
                    'color': product.get('color', ''),
                    'size': product.get('size', ''),
                    'updated_at': datetime.utcnow().isoformat()
                })
            
            # Tentar enviar em lote
            try:
                response = requests.post(url, headers=self.headers, json=batch_data, timeout=30)
                
                if response.status_code in [200, 201]:
                    results.extend([p['id'] for p in batch])
                    print(f"  ✅ Lote {i//batch_size + 1} enviado com sucesso")
                else:
                    print(f"  ❌ Erro no lote {i//batch_size + 1}: {response.status_code}")
                    # Tentar um por um
                    for product in batch:
                        try:
                            data = {
                                'id': product.get('id'),
                                'index_num': product.get('index'),
                                'user_id': self.user_id,
                                'name': product.get('name'),
                                'stock': product.get('stock', 0),
                                'price': product.get('price', 0),
                                'url': product.get('url'),
                                'image': product.get('image', ''),
                                'color': product.get('color', ''),
                                'size': product.get('size', ''),
                                'updated_at': datetime.utcnow().isoformat()
                            }
                            
                            # Tentar PATCH (update) primeiro
                            patch_url = f"{url}?id=eq.{product.get('id')}"
                            response = requests.patch(patch_url, headers=self.headers, json=data, timeout=30)
                            
                            if response.status_code in [200, 204]:
                                results.append(product.get('id'))
                            else:
                                # Se PATCH falhar, tentar POST (insert)
                                response = requests.post(url, headers=self.headers, json=data, timeout=30)
                                if response.status_code in [200, 201]:
                                    results.append(product.get('id'))
                                else:
                                    print(f"  ❌ Erro produto {product.get('id')}: {response.status_code}")
                        except Exception as e:
                            print(f"  ❌ Erro produto {product.get('id')}: {e}")
                    
            except Exception as e:
                print(f"  ❌ Erro no lote {i//batch_size + 1}: {e}")
        
        return results

    def insert_inventory_history(self, history_data):
        """Insert inventory history records using batch operations"""
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
                    'date': item.get('date', datetime.utcnow().isoformat().split('T')[0]),
                    'quantity': item.get('quantity', 0),
                    'price': item.get('price', 0)
                })
            
            try:
                response = requests.post(url, headers=self.headers, json=batch_data, timeout=30)
                if response.status_code in [200, 201]:
                    print(f"  ✅ Histórico lote {i//batch_size + 1} enviado com sucesso")
                else:
                    print(f"  ❌ Erro no histórico lote {i//batch_size + 1}: {response.status_code}")
            except requests.exceptions.Timeout:
                print(f"  ⏱️  Timeout no histórico lote {i//batch_size + 1}, tentando novamente...")
                time.sleep(2)
                try:
                    response = requests.post(url, headers=self.headers, json=batch_data, timeout=60)
                    if response.status_code in [200, 201]:
                        print(f"  ✅ Histórico lote {i//batch_size + 1} enviado no retry")
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
