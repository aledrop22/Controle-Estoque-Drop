-- SQL Schema para Supabase
-- Copie e execute isso no Supabase SQL Editor

-- 1. Enable UUID extension
create extension if not exists "uuid-ossp";

-- 2. Products table
create table if not exists products (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  sku text,
  color text,
  size text,
  price numeric(10, 2),
  stock integer default 0,
  image_url text,
  created_at timestamp default now(),
  updated_at timestamp default now()
);

-- 3. Inventory history table
create table if not exists inventory_history (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  product_id uuid not null references products(id) on delete cascade,
  date date not null,
  quantity integer not null,
  notes text,
  created_at timestamp default now()
);

-- 4. Scraper logs table
create table if not exists scraper_logs (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  url text not null,
  status text check (status in ('success', 'error', 'pending')) default 'pending',
  items_count integer default 0,
  error_message text,
  created_at timestamp default now()
);

-- 5. Row Level Security (RLS) Policies
alter table products enable row level security;
alter table inventory_history enable row level security;
alter table scraper_logs enable row level security;

-- Products RLS
create policy "Users can view their own products" on products for select using (auth.uid() = user_id);
create policy "Users can insert their own products" on products for insert with check (auth.uid() = user_id);
create policy "Users can update their own products" on products for update using (auth.uid() = user_id);
create policy "Users can delete their own products" on products for delete using (auth.uid() = user_id);

-- Inventory history RLS
create policy "Users can view their own history" on inventory_history for select using (auth.uid() = user_id);
create policy "Users can insert their own history" on inventory_history for insert with check (auth.uid() = user_id);

-- Scraper logs RLS
create policy "Users can view their own logs" on scraper_logs for select using (auth.uid() = user_id);
create policy "Users can insert their own logs" on scraper_logs for insert with check (auth.uid() = user_id);

-- 6. Create indexes for performance
create index products_user_id on products(user_id);
create index inventory_history_user_id on inventory_history(user_id);
create index inventory_history_product_id on inventory_history(product_id);
create index scraper_logs_user_id on scraper_logs(user_id);
