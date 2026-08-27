-- 꽃신은 의류 사이즈 대신 신발 사이즈(220/230/240)를 사용합니다.
alter table public.product_variants drop constraint if exists product_variants_size_check;
alter table public.product_variants
  add constraint product_variants_size_check check (size in ('S','M','L','FREE','220','230','240'));

update public.product_variants pv
set size = '220',
    sku = regexp_replace(pv.sku, '-FREE$', '-220'),
    updated_at = now()
from public.products p
join public.categories c on c.id = p.category_id
where pv.product_id = p.id
  and c.slug = 'flowershoes'
  and pv.size = 'FREE';

insert into public.product_variants
  (product_id, size, color, sku, stock_quantity, low_stock_threshold, active)
select pv.product_id, new_size, pv.color,
       regexp_replace(pv.sku, '-220$', '-' || new_size),
       pv.stock_quantity, pv.low_stock_threshold, pv.active
from public.product_variants pv
join public.products p on p.id = pv.product_id
join public.categories c on c.id = p.category_id
cross join (values ('230'), ('240')) as sizes(new_size)
where c.slug = 'flowershoes' and pv.size = '220'
on conflict (sku) do nothing;
