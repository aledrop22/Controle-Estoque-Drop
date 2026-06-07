// supabase/products.ts
import { supabase } from './client';
import { Product, InventoryHistory } from './types';

// Products
export async function getProducts(userId: string) {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('user_id', userId)
    .order('name', { ascending: true });
  
  if (error) throw error;
  return data as Product[];
}

export async function addProduct(product: Omit<Product, 'id' | 'created_at' | 'updated_at'>) {
  const { data, error } = await supabase
    .from('products')
    .insert([product])
    .select();
  
  if (error) throw error;
  return data?.[0] as Product;
}

export async function updateProduct(id: string, updates: Partial<Product>) {
  const { data, error } = await supabase
    .from('products')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select();
  
  if (error) throw error;
  return data?.[0] as Product;
}

// Inventory History
export async function getInventoryHistory(userId: string, productId?: string) {
  let query = supabase
    .from('inventory_history')
    .select('*')
    .eq('user_id', userId);
  
  if (productId) {
    query = query.eq('product_id', productId);
  }
  
  const { data, error } = await query.order('date', { ascending: false });
  
  if (error) throw error;
  return data as InventoryHistory[];
}

export async function addInventoryRecord(record: Omit<InventoryHistory, 'id' | 'created_at'>) {
  const { data, error } = await supabase
    .from('inventory_history')
    .insert([record])
    .select();
  
  if (error) throw error;
  return data?.[0] as InventoryHistory;
}

// Bulk insert (para scraper)
export async function bulkInsertProducts(products: Omit<Product, 'id' | 'created_at' | 'updated_at'>[], userId: string) {
  const productsWithUser = products.map(p => ({ ...p, user_id: userId }));
  
  const { data, error } = await supabase
    .from('products')
    .insert(productsWithUser)
    .select();
  
  if (error) throw error;
  return data as Product[];
}
