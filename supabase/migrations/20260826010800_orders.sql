-- STEP 5: orders, order_items, order_item_addons + RLS + indexes
create table public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique,
  user_id uuid not null references public.profiles(id),
  customer_name text not null,
  customer_phone text not null,
  postcode text,
  address text not null,
  address_detail text,
  delivery_memo text,
  product_total integer not null default 0 check (product_total >= 0),
  shipping_fee integer not null default 0 check (shipping_fee >= 0),
  discount_amount integer not null default 0 check (discount_amount >= 0),
  coupon_discount integer not null default 0 check (coupon_discount >= 0),
  total_amount integer not null default 0 check (total_amount >= 0),
  payment_method text not null default 'mock',
  payment_status text not null default 'pending' check (payment_status in ('pending','paid','failed','refunded')),
  order_status text not null default 'payment_pending' check (order_status in (
    'payment_pending','paid','preparing','shipping','delivered','confirmed',
    'cancel_requested','cancelled','exchange_requested','return_requested','returned','refunded'
  )),
  ordered_at timestamptz not null default now(),
  confirmed_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger orders_set_updated_at
before update on public.orders
for each row execute function public.set_updated_at();

create index orders_user_id_idx on public.orders(user_id);
create index orders_order_status_idx on public.orders(order_status);
create index orders_ordered_at_idx on public.orders(ordered_at);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid not null references public.products(id),
  product_variant_id uuid not null references public.product_variants(id),
  product_name_snapshot text not null,
  option_snapshot text,
  sku_snapshot text,
  quantity integer not null check (quantity > 0),
  unit_price integer not null check (unit_price >= 0),
  discount_amount integer not null default 0,
  total_price integer not null check (total_price >= 0)
);

create index order_items_order_id_idx on public.order_items(order_id);

create table public.order_item_addons (
  id uuid primary key default gen_random_uuid(),
  order_item_id uuid not null references public.order_items(id) on delete cascade,
  addon_product_id uuid not null references public.products(id),
  addon_variant_id uuid references public.product_variants(id),
  addon_name_snapshot text not null,
  option_snapshot text,
  unit_price integer not null check (unit_price >= 0),
  quantity integer not null check (quantity > 0),
  total_price integer not null check (total_price >= 0)
);

alter table public.inventory_movements
  add constraint inventory_movements_order_id_fkey foreign key (order_id) references public.orders(id) on delete set null;

alter table public.orders enable row level security;
create policy orders_select on public.orders for select using (auth.uid() = user_id or public.is_admin());
create policy orders_admin_update on public.orders for update using (public.is_admin());

alter table public.order_items enable row level security;
create policy order_items_select on public.order_items for select using (
  exists (select 1 from public.orders o where o.id = order_id and (o.user_id = auth.uid() or public.is_admin()))
);

alter table public.order_item_addons enable row level security;
create policy order_item_addons_select on public.order_item_addons for select using (
  exists (
    select 1 from public.order_items oi join public.orders o on o.id = oi.order_id
    where oi.id = order_item_id and (o.user_id = auth.uid() or public.is_admin())
  )
);
