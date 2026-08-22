-- OX WhatShop Migracion v4: stock baja al marcar pedido como 'pagado'
-- (ya no al crearlo); se restaura al cancelar.

drop trigger if exists orders_adjust_stock_tg on public.orders;

create or replace function public.orders_restock() returns trigger
language plpgsql
as $$
declare it record; q int; paid_now boolean; unpaid boolean; canc_now boolean; uncanc boolean;
begin
  paid_now := new.status = 'pagado' and old.status is distinct from 'pagado';
  unpaid   := old.status = 'pagado' and new.status is distinct from 'pagado' and new.status <> 'cancelado';
  canc_now := new.status = 'cancelado' and old.status is distinct from 'cancelado';
  uncanc   := old.status = 'cancelado' and new.status is distinct from 'cancelado';

  for it in select value as v from jsonb_array_elements(coalesce(new.items, '[]'::jsonb)) loop
    q := coalesce((it.v->>'qty')::int, 1);
    if paid_now or uncanc then
      if it.v->>'variant_id' is not null and it.v->>'variant_id' <> '' then
        update public.product_variants set stock = greatest(stock - q, 0) where id = (it.v->>'variant_id')::bigint;
      elsif it.v->>'id' is not null then
        update public.products set stock = greatest(stock - q, 0) where id = (it.v->>'id')::bigint;
      end if;
    end if;
    if canc_now or unpaid then
      if it.v->>'variant_id' is not null and it.v->>'variant_id' <> '' then
        update public.product_variants set stock = stock + q where id = (it.v->>'variant_id')::bigint;
      elsif it.v->>'id' is not null then
        update public.products set stock = stock + q where id = (it.v->>'id')::bigint;
      end if;
    end if;
  end loop;
  return new;
end $$;

drop trigger if exists orders_restock_tg on public.orders;
create trigger orders_restock_tg after update of status on public.orders for each row execute function public.orders_restock();