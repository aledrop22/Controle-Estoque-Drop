-- SQL Schema para Supabase
-- Copie e execute isso no Supabase SQL Editor

-- 0. Drop existing tables and indexes (clean slate)
drop table if exists inventory_history cascade;
drop table if exists products cascade;
drop table if exists scraper_logs cascade;

-- 1. Enable UUID extension
create extension if not exists "uuid-ossp";

-- 2. Products table
create table if not exists products (
  id text primary key,
  index_num integer,
  user_id text default 'default-user',
  name text not null,
  sku text,
  color text,
  size text,
  price numeric(10, 2),
  stock integer default 0,
  url text,
  image text,
  created_at timestamp default now(),
  updated_at timestamp default now()
);

-- 3. Inventory history table
create table if not exists inventory_history (
  id uuid primary key default uuid_generate_v4(),
  user_id text default 'default-user',
  product_id text not null references products(id) on delete cascade,
  date date not null,
  quantity integer not null,
  price numeric(10, 2),
  created_at timestamp default now()
);

-- 4. Scraper logs table
create table if not exists scraper_logs (
  id uuid primary key default uuid_generate_v4(),
  user_id text default 'default-user',
  url text not null,
  status text check (status in ('success', 'error', 'pending')) default 'pending',
  items_count integer default 0,
  error_message text,
  created_at timestamp default now()
);

-- 5. Row Level Security (RLS) Policies
-- Desabilitado temporariamente para facilitar o setup inicial
-- alter table products enable row level security;
-- alter table inventory_history enable row level security;
-- alter table scraper_logs enable row level security;

-- 6. Create indexes for performance
create index if not exists products_user_id on products(user_id);
create index if not exists inventory_history_user_id on inventory_history(user_id);
create index if not exists inventory_history_product_id on inventory_history(product_id);
create index if not exists scraper_logs_user_id on scraper_logs(user_id);
