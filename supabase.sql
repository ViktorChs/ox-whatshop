-- ============================================================
-- OX WhatShop - Setup Supabase v2 (ejecutar en el SQL Editor)
-- Multi-tienda, variantes (color x talla), ofertas, RPC pedidos.
-- Idempotente.
-- ============================================================

-- ---------- Tiendas ----------
create table if not exists public.stores (
  id bigserial primary key,
  name text not null default 'Mi Tienda',
  slug text not null unique default 'mi-tienda',
  created_at timestamptz default now()
);
insert into public.stores (id, name, slug) values (1, 'Mi Tienda', 'mi-tienda')
on conflict (id) do nothing;

-- ---------- Tabla settings (config por tienda) ----------
create table if not exists public.settings (
  store_id bigint primary key references public.stores(id) on delete cascade,
  data jsonb not null,
  updated_at timestamptz default now()
);

-- ---------- Tabla admin (PIN) ----------
create table if not exists public.admin (
  id int primary key default 1 check (id = 1),
  pin_hash text not null
);

-- ---------- Tabla categorias ----------
create table if not exists public.categories (
  id bigserial primary key,
  store_id bigint not null references public.stores(id) on delete cascade,
  name text not null,
  image text,
  color text default '#E8ECF0',
  position int default 0
);
create index if not exists categories_store_idx on public.categories (store_id);

-- ---------- Tabla productos ----------
create table if not exists public.products (
  id bigserial primary key,
  store_id bigint not null references public.stores(id) on delete cascade,
  category_id bigint references public.categories(id) on delete set null,
  name text not null,
  description text default '',
  price numeric not null default 0,
  original_price numeric,
  image text,
  images jsonb default '[]',
  stock int default 1,
  featured boolean default false,
  position int default 0
);
create index if not exists products_store_idx on public.products (store_id);
create index if not exists products_category_id_idx on public.products (category_id);

-- ---------- Tabla variantes (color x talla) ----------
create table if not exists public.product_variants (
  id bigserial primary key,
  store_id bigint not null references public.stores(id) on delete cascade,
  product_id bigint not null references public.products(id) on delete cascade,
  name text,
  color text,
  color_hex text,
  size text,
  sku text,
  price numeric,
  stock int default 1,
  position int default 0
);
create index if not exists product_variants_product_id_idx on public.product_variants (product_id);

-- ---------- Plantillas de tallas ----------
create table if not exists public.variant_templates (
  id bigserial primary key,
  store_id bigint not null references public.stores(id) on delete cascade,
  name text not null,
  values jsonb not null default '[]',
  created_at timestamptz default now()
);

-- ---------- Tabla pedidos ----------
create table if not exists public.orders (
  id bigserial primary key,
  store_id bigint not null references public.stores(id) on delete cascade,
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
create index if not exists orders_store_idx on public.orders (store_id);
create index if not exists orders_created_at_idx on public.orders (created_at);

-- ---------- Secuencia + RPC create_order ----------
create sequence if not exists public.orders_seq;
create or replace function public.create_order(
  p_store_id bigint,
  p_name text,
  p_phone text,
  p_payment_method text,
  p_note text,
  p_items jsonb,
  p_total numeric
) returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_num bigint;
  v_row public.orders%rowtype;
begin
  v_num := nextval('public.orders_seq');
  insert into public.orders (order_number, store_id, name, phone, payment_method, note, items, total, status)
  values (v_num, p_store_id, p_name, p_phone, p_payment_method, p_note, p_items, p_total, 'nuevo')
  returning * into v_row;
  return json_build_object('id', v_row.id, 'order_number', v_row.order_number);
end;
$$;
grant execute on function public.create_order(bigint,text,text,text,text,jsonb,numeric) to anon, authenticated, service_role;

-- ---------- Datos iniciales ----------
insert into public.settings (store_id, data)
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
    "brandShowName": true,
    "messageTemplate": "\u{1F6D2} NUEVO PEDIDO - {storeName}\n\n\u{1F464} Cliente: {name}\n\u{1F4F1} Telefono: {phone}\n\u{1F4B3} Metodo de pago: {paymentMethod}\n{noteText}\n\n{items}\n\nTOTAL: {total}"
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
  },
  "splash": {
    "background": "#FFFFFF",
    "logo": "./assets/logos/logoB.png",
    "whatText": "What",
    "whatColor": "#000000",
    "shopText": "Shop",
    "shopColor": "#16A34A",
    "loadingSeconds": 3
  }
}'::jsonb)
on conflict (store_id) do nothing;

-- PIN por defecto: 1234 (sha256). Cambialo antes de publicar.
insert into public.admin (id, pin_hash)
values (1, '03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4')
on conflict (id) do nothing;

insert into public.variant_templates (store_id, name, values)
select 1, 'Zapatos Latinoamérica (2-48)', (
  select jsonb_agg((s::text)::float::text order by s)
  from generate_series(2, 48) s
) on conflict do nothing;

insert into public.variant_templates (store_id, name, values)
values (1, 'Anillos (10-22)', '["10","11","12","13","14","15","16","17","18","19","20","21","22"]'::jsonb),
       (1, 'Cadenas (mm)', '["20mm","30mm","40mm","50mm","60mm"]'::jsonb),
       (1, 'Ropa (S-XXL)', '["S","M","L","XL","XXL"]'::jsonb)
on conflict do nothing;

-- ---------- RLS ----------
alter table public.stores enable row level security;
alter table public.settings enable row level security;
alter table public.admin enable row level security;
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.product_variants enable row level security;
alter table public.variant_templates enable row level security;
alter table public.orders enable row level security;

drop policy if exists "anon leer stores" on public.stores;
create policy "anon leer stores" on public.stores for select using (true);

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

drop policy if exists "anon leer plantillas" on public.variant_templates;
create policy "anon leer plantillas" on public.variant_templates for select using (true);

drop policy if exists "anon leer pedidos" on public.orders;
create policy "anon leer pedidos" on public.orders for select using (true);

-- Escritura admin (v1: anon). El PIN protege la UI.
drop policy if exists "anon todo stores" on public.stores;
create policy "anon todo stores" on public.stores for all using (true) with check (true);

drop policy if exists "anon todo settings" on public.settings;
create policy "anon todo settings" on public.settings for all using (true) with check (true);

drop policy if exists "anon todo admin" on public.admin;
create policy "anon todo admin" on public.admin for all using (true) with check (true);

drop policy if exists "anon todo categorias" on public.categories;
create policy "anon todo categorias" on public.categories for all using (true) with check (true);

drop policy if exists "anon todo productos" on public.products;
create policy "anon todo productos" on public.products for all using (true) with check (true);

drop policy if exists "anon todo variantes" on public.product_variants;
create policy "anon todo variantes" on public.product_variants for all using (true) with check (true);

drop policy if exists "anon todo plantillas" on public.variant_templates;
create policy "anon todo plantillas" on public.variant_templates for all using (true) with check (true);

drop policy if exists "anon todo pedidos" on public.orders;
create policy "anon todo pedidos" on public.orders for all using (true) with check (true);

-- ---------- Buckets de Storage ----------
insert into storage.buckets (id, name, public)
values ('images', 'images', true)
on conflict (id) do nothing;

drop policy if exists "anon subir images" on storage.objects;
create policy "anon subir images" on storage.objects for insert with check (bucket_id = 'images');

drop policy if exists "anon leer images" on storage.objects;
create policy "anon leer images" on storage.objects for select using (bucket_id = 'images');

drop policy if exists "anon actualizar images" on storage.objects;
create policy "anon actualizar images" on storage.objects for update using (bucket_id = 'images');

drop policy if exists "anon borrar images" on storage.objects;
create policy "anon borrar images" on storage.objects for delete using (bucket_id = 'images');