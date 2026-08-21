-- OX WhatShop Migracion v3b (stock: descuento al pedir, restauracion al cancelar)

create or replace function public.orders_adjust_stock() returns trigger
language plpgsql
as $$
declare it record; q int;
begin
  for it in select value as v from jsonb_array_elements(coalesce(new.items, '[]'::jsonb)) loop
    q := coalesce((it.v->>'qty')::int, 1);
    if it.v->>'variant_id' is not null and it.v->>'variant_id' <> '' then
      update public.product_variants set stock = greatest(stock - q, 0) where id = (it.v->>'variant_id')::bigint;
    elsif it.v->>'id' is not null then
      update public.products set stock = greatest(stock - q, 0) where id = (it.v->>'id')::bigint;
    end if;
  end loop;
  return new;
end $$;

create or replace function public.orders_restock() returns trigger
language plpgsql
as $$
declare it record; q int;
begin
  for it in select value as v from jsonb_array_elements(coalesce(new.items, '[]'::jsonb)) loop
    q := coalesce((it.v->>'qty')::int, 1);
    if new.status = 'cancelado' and old.status is distinct from 'cancelado' then
      if it.v->>'variant_id' is not null and it.v->>'variant_id' <> '' then
        update public.product_variants set stock = stock + q where id = (it.v->>'variant_id')::bigint;
      elsif it.v->>'id' is not null then
        update public.products set stock = stock + q where id = (it.v->>'id')::bigint;
      end if;
    elsif old.status = 'cancelado' and new.status is distinct from 'cancelado' then
      if it.v->>'variant_id' is not null and it.v->>'variant_id' <> '' then
        update public.product_variants set stock = greatest(stock - q, 0) where id = (it.v->>'variant_id')::bigint;
      elsif it.v->>'id' is not null then
        update public.products set stock = greatest(stock - q, 0) where id = (it.v->>'id')::bigint;
      end if;
    end if;
  end loop;
  return new;
end $$;

drop trigger if exists orders_adjust_stock_tg on public.orders;
create trigger orders_adjust_stock_tg after insert on public.orders for each row execute function public.orders_adjust_stock();

drop trigger if exists orders_restock_tg on public.orders;
create trigger orders_restock_tg after update of status on public.orders for each row execute function public.orders_restock();