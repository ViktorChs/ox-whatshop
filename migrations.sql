-- ============================================================
-- OX WhatShop - Migracion v2 (multi-tienda, variantes, ofertas)
-- Ejecutar en el SQL Editor de Supabase sobre una DB v1 existente.
-- Idempotente.
-- ============================================================

-- ---------- Tabla stores (multi-tienda) ----------
create table if not exists public.stores (
  id bigserial primary key,
  name text not null default 'Mi Tienda',
  slug text not null unique default 'mi-tienda',
  created_at timestamptz default now()
);
insert into public.stores (id, name, slug)
values (1, 'Mi Tienda', 'mi-tienda')
on conflict (id) do nothing;

-- ---------- settings: pasar a store_id ----------
alter table public.settings add column if not exists store_id bigint;
update public.settings set store_id = 1 where store_id is null;
alter table public.settings alter column store_id set not null;
alter table public.settings drop constraint if exists settings_pkey;
alter table public.settings drop column if exists id;
alter table public.settings add primary key (store_id);
alter table public.settings add constraint settings_store_fk foreign key (store_id) references public.stores(id) on delete cascade;

-- ---------- categories ----------
alter table public.categories add column if not exists store_id bigint;
update public.categories set store_id = 1 where store_id is null;
alter table public.categories alter column store_id set not null;
alter table public.categories add constraint categories_store_fk foreign key (store_id) references public.stores(id) on delete cascade;

-- ---------- products: store, oferta, galeria ----------
alter table public.products add column if not exists store_id bigint;
update public.products set store_id = 1 where store_id is null;
alter table public.products alter column store_id set not null;
alter table public.products add constraint products_store_fk foreign key (store_id) references public.stores(id) on delete cascade;
alter table public.products add column if not exists original_price numeric;
alter table public.products add column if not exists images jsonb default '[]';

-- ---------- product_variants: color + talla + sku ----------
alter table public.product_variants add column if not exists store_id bigint;
update public.product_variants set store_id = 1 where store_id is null;
alter table public.product_variants alter column store_id set not null;
alter table public.product_variants add constraint product_variants_store_fk foreign key (store_id) references public.stores(id) on delete cascade;
alter table public.product_variants add column if not exists color text;
alter table public.product_variants add column if not exists color_hex text;
alter table public.product_variants add column if not exists size text;
alter table public.product_variants add column if not exists sku text;
alter table public.product_variants add column if not exists position int default 0;

-- ---------- orders ----------
alter table public.orders add column if not exists store_id bigint;
update public.orders set store_id = 1 where store_id is null;
alter table public.orders alter column store_id set not null;
alter table public.orders add constraint orders_store_fk foreign key (store_id) references public.stores(id) on delete cascade;

-- ---------- plantillas de tallas ----------
create table if not exists public.variant_templates (
  id bigserial primary key,
  store_id bigint not null default 1 references public.stores(id) on delete cascade,
  name text not null,
  values jsonb not null default '[]',
  created_at timestamptz default now()
);

insert into public.variant_templates (store_id, name, values)
select 1, 'Zapatos Latinoamérica (2-48)', (
  select jsonb_agg((s::text)::float::text order by s)
  from generate_series(2, 48) s
)
where not exists (select 1 from public.variant_templates where name = 'Zapatos Latinoamérica (2-48)');

insert into public.variant_templates (store_id, name, values)
select 1, 'Anillos (10-22)', '["10","11","12","13","14","15","16","17","18","19","20","21","22"]'::jsonb
where not exists (select 1 from public.variant_templates where name = 'Anillos (10-22)');

insert into public.variant_templates (store_id, name, values)
select 1, 'Cadenas (mm)', '["20mm","30mm","40mm","50mm","60mm"]'::jsonb
where not exists (select 1 from public.variant_templates where name = 'Cadenas (mm)');

insert into public.variant_templates (store_id, name, values)
select 1, 'Ropa (S-XXL)', '["S","M","L","XL","XXL"]'::jsonb
where not exists (select 1 from public.variant_templates where name = 'Ropa (S-XXL)');

-- ---------- secuencia + RPC create_order (order_number atomico) ----------
create sequence if not exists public.orders_seq;
select setval('public.orders_seq', coalesce((select max(order_number) from public.orders), 0) + 1, false);

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

-- ---------- RLS para stores y variant_templates ----------
alter table public.stores enable row level security;
alter table public.variant_templates enable row level security;

drop policy if exists "anon leer stores" on public.stores;
create policy "anon leer stores" on public.stores for select using (true);

drop policy if exists "anon todo stores" on public.stores;
create policy "anon todo stores" on public.stores for all using (true) with check (true);

drop policy if exists "anon leer plantillas" on public.variant_templates;
create policy "anon leer plantillas" on public.variant_templates for select using (true);

drop policy if exists "anon todo plantillas" on public.variant_templates;
create policy "anon todo plantillas" on public.variant_templates for all using (true) with check (true);