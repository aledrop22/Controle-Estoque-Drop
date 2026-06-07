// supabase/types.ts
export interface User {
  id: string;
  email: string;
  role: 'admin' | 'viewer';
  created_at: string;
}

export interface Product {
  id: string;
  name: string;
  sku: string;
  color?: string;
  size?: string;
  price: number;
  stock: number;
  image_url?: string;
  user_id: string;
  created_at: string;
  updated_at: string;
}

export interface InventoryHistory {
  id: string;
  product_id: string;
  date: string;
  quantity: number;
  notes?: string;
  user_id: string;
  created_at: string;
}

export interface ScraperLog {
  id: string;
  url: string;
  status: 'success' | 'error' | 'pending';
  items_count: number;
  error_message?: string;
  user_id: string;
  created_at: string;
}
