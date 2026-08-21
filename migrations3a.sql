-- OX WhatShop Migracion v3a
alter table public.categories add column if not exists border_enabled boolean default false;
alter table public.categories add column if not exists border_color text default '#171717';
alter table public.categories add column if not exists border_side text default 'all';

alter table public.orders alter column status set default 'en_proceso';
update public.orders set status = 'en_proceso' where status = 'nuevo';

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
  values (v_num, p_store_id, p_name, p_phone, p_payment_method, p_note, p_items, p_total, 'en_proceso')
  returning * into v_row;
  return json_build_object('id', v_row.id, 'order_number', v_row.order_number);
end;
$$;
grant execute on function public.create_order(bigint,text,text,text,text,jsonb,numeric) to anon, authenticated, service_role;