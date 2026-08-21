-- ============================================================
-- OX WhatShop - Setup Supabase (ejecutar en el SQL Editor)
-- Crea tablas, triggers, buckets de Storage y datos iniciales.
-- Idempotente: se puede ejecutar mas de una vez sin errores.
-- ============================================================

-- ---------- Tabla settings (configuracion unica) ----------
create table if not exists public.settings (
  id int primary key default 1 check (id = 1),
  data jsonb not null,
  updated_at timestamptz default now()
);

-- ---------- Tabla admin (PIN) ----------
-- Guarda el hash SHA-256 del PIN. El cliente lo compara con crypto.subtle.
-- Hash de ejemplo = sha256("1234")
create table if not exists public.admin (
  id int primary key default 1 check (id = 1),
  pin_hash text not null
);

-- ---------- Tabla categorias ----------
create table if not exists public.categories (
  id bigserial primary key,
  name text not null,
  image text,
  color text default '#E8ECF0',
  position int default 0
);

-- ---------- Tabla productos ----------
create table if not exists public.products (
  id bigserial primary key,
  category_id bigint references public.categories(id) on delete set null,
  name text not null,
  description text default '',
  price numeric not null default 0,
  image text,
  stock int default 1,
  featured boolean default false,
  position int default 0
);
create index if not exists products_category_id_idx on public.products (category_id);

-- ---------- Tabla variantes ----------
create table if not exists public.product_variants (
  id bigserial primary key,
  product_id bigint not null references public.products(id) on delete cascade,
  name text not null,
  price numeric,
  stock int default 1
);
create index if not exists product_variants_product_id_idx on public.product_variants (product_id);

-- ---------- Tabla pedidos ----------
create table if not exists public.orders (
  id bigserial primary key,
  order_number int not null,
  name text not null,
  phone text,
  payment_method text,
  note text,
  items jsonb not null default '[]',
  total numeric not null default 0,
  status text default 'nuevo',
  created_at timestamptz default now()
);
create index if not exists orders_created_at_idx on public.orders (created_at);

-- ---------- Datos iniciales ----------
insert into public.settings (id, data)
values (1, '{
  "store": {
    "name": "WhatShop",
    "whatsapp": "",
    "currency": "$",
    "currencyPosition": "before",
    "open": true,
    "closedMessage": "La tienda esta cerrada en este momento",
    "paymentMethods": ["Efectivo", "Transferencia", "Pago movil", "Tarjeta"],
    "brandShowLogo": true,
    "brandShowName": true
  },
  "theme": {
    "primary": "#171717",
    "onPrimary": "#FFFFFF",
    "secondary": "#404040",
    "accent": "#A16207",
    "background": "#FFFFFF",
    "foreground": "#171717",
    "muted": "#E8ECF0",
    "border": "#E5E5E5",
    "destructive": "#DC2626",
    "ring": "#171717",
    "categoryBox": "#E8ECF0",
    "radius": 14,
    "fontHeading": "Plus Jakarta Sans",
    "fontBody": "Plus Jakarta Sans",
    "backgroundGradient": false,
    "gradientColor": "#FFFFFF"
  },
  "landing": {
    "logo": "./assets/logos/logoB.png",
    "title": "WhatShop",
    "subtitle": "Tu tienda online",
    "customText": "",
    "swipeHint": "Desliza para entrar"
  }
}'::jsonb)
on conflict (id) do nothing;

-- PIN por defecto: 1234 (sha256). Cambialo antes de publicar:
--   update public.admin set pin_hash = '<nuevo-hash-sha256>' where id = 1;
insert into public.admin (id, pin_hash)
values (1, '03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4')
on conflict (id) do nothing;

-- ---------- RLS: permitir lectura anonima ----------
alter table public.settings enable row level security;
alter table public.admin enable row level security;
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.product_variants enable row level security;
alter table public.orders enable row level security;

-- Lectura publica (anon) de datos de la tienda
drop policy if exists "anon leer settings" on public.settings;
create policy "anon leer settings" on public.settings for select using (true);

drop policy if exists "anon leer admin" on public.admin;
create policy "anon leer admin" on public.admin for select using (true);

drop policy if exists "anon leer categorias" on public.categories;
create policy "anon leer categorias" on public.categories for select using (true);

drop policy if exists "anon leer productos" on public.products;
create policy "anon leer productos" on public.products for select using (true);

drop policy if exists "anon leer variantes" on public.product_variants;
create policy "anon leer variantes" on public.product_variants for select using (true);

-- Escritura publica (anon crea pedidos)
drop policy if exists "anon insertar pedidos" on public.orders;
create policy "anon insertar pedidos" on public.orders for insert with check (true);

drop policy if exists "anon leer pedidos" on public.orders;
create policy "anon leer pedidos" on public.orders for select using (true);

-- NOTA: escritura del admin (settings, categorias, productos, ordenes-status)
-- permitida con anon para v1. El PIN del admin protege la UI.
-- Para produccion, cambia a RLS con auth roles (service_role / custom claims).
drop policy if exists "anon todo categorias" on public.categories;
create policy "anon todo categorias" on public.categories for all using (true) with check (true);

drop policy if exists "anon todo productos" on public.products;
create policy "anon todo productos" on public.products for all using (true) with check (true);

drop policy if exists "anon todo variantes" on public.product_variants;
create policy "anon todo variantes" on public.product_variants for all using (true) with check (true);

drop policy if exists "anon todo settings" on public.settings;
create policy "anon todo settings" on public.settings for all using (true) with check (true);

drop policy if exists "anon todo pedidos" on public.orders;
create policy "anon todo pedidos" on public.orders for all using (true) with check (true);

drop policy if exists "anon todo admin" on public.admin;
create policy "anon todo admin" on public.admin for all using (true) with check (true);

-- ---------- Buckets de Storage ----------
insert into storage.buckets (id, name, public)
values ('images', 'images', true)
on conflict (id) do nothing;

-- Permitir subir/leer/actualizar/borrar en el bucket images con anon
drop policy if exists "anon subir images" on storage.objects;
create policy "anon subir images" on storage.objects for insert with check (bucket_id = 'images');

drop policy if exists "anon leer images" on storage.objects;
create policy "anon leer images" on storage.objects for select using (bucket_id = 'images');

drop policy if exists "anon actualizar images" on storage.objects;
create policy "anon actualizar images" on storage.objects for update using (bucket_id = 'images');

drop policy if exists "anon borrar images" on storage.objects;
create policy "anon borrar images" on storage.objects for delete using (bucket_id = 'images');