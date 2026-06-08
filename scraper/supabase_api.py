import os
import requests
import json
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
        for product in products:
            # Check if product exists
            check_url = f"{self.supabase_url}/rest/v1/products?id=eq.{product.get('id', '')}&select=id"
            response = requests.get(check_url, headers=self.headers)
            
            if response.status_code == 200 and response.json():
                # Update existing product
                product_id = product.get('id')
                update_url = f"{self.supabase_url}/rest/v1/products?id=eq.{product_id}"
                response = requests.patch(update_url, headers=self.headers, json={
                    'name': product.get('name'),
                    'stock': product.get('stock', 0),
                    'price': product.get('price', 0),
                    'url': product.get('url'),
                    'updated_at': datetime.utcnow().isoformat()
                })
            else:
                # Insert new product
                response = requests.post(url, headers=self.headers, json={
                    'id': product.get('id'),
                    'user_id': self.user_id,
                    'name': product.get('name'),
                    'stock': product.get('stock', 0),
                    'price': product.get('price', 0),
                    'url': product.get('url'),
                    'created_at': datetime.utcnow().isoformat()
                })
            
            if response.status_code in [200, 201]:
                results.append(product.get('id'))
        
        return results

    def insert_inventory_history(self, history_data):
        """Insert inventory history records"""
        url = f"{self.supabase_url}/rest/v1/inventory_history"
        
        for item in history_data:
            data = {
                'product_id': item.get('product_id'),
                'date': item.get('date', datetime.utcnow().isoformat().split('T')[0]),
                'quantity': item.get('quantity', 0),
                'price': item.get('price', 0)
            }
            requests.post(url, headers=self.headers, json=data)

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
