-- STEP 4: carts, cart_items, cart_item_addons + RLS
create table public.carts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'active' check (status in ('active','ordered','abandoned')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger carts_set_updated_at
before update on public.carts
for each row execute function public.set_updated_at();

create unique index carts_one_active_per_user on public.carts(user_id) where status = 'active';

create table public.cart_items (
  id uuid primary key default gen_random_uuid(),
  cart_id uuid not null references public.carts(id) on delete cascade,
  product_id uuid not null references public.products(id),
  product_variant_id uuid not null references public.product_variants(id),
  quantity integer not null check (quantity > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger cart_items_set_updated_at
before update on public.cart_items
for each row execute function public.set_updated_at();

create index cart_items_cart_id_idx on public.cart_items(cart_id);

create table public.cart_item_addons (
  id uuid primary key default gen_random_uuid(),
  cart_item_id uuid not null references public.cart_items(id) on delete cascade,
  addon_product_id uuid not null references public.products(id),
  addon_variant_id uuid references public.product_variants(id),
  quantity integer not null default 1 check (quantity > 0)
);

alter table public.carts enable row level security;
create policy carts_select on public.carts for select using (auth.uid() = user_id or public.is_admin());
create policy carts_insert on public.carts for insert with check (auth.uid() = user_id);
create policy carts_update on public.carts for update using (auth.uid() = user_id or public.is_admin());
create policy carts_delete on public.carts for delete using (auth.uid() = user_id or public.is_admin());

alter table public.cart_items enable row level security;
create policy cart_items_select on public.cart_items for select using (
  exists (select 1 from public.carts c where c.id = cart_id and (c.user_id = auth.uid() or public.is_admin()))
);
create policy cart_items_insert on public.cart_items for insert with check (
  exists (select 1 from public.carts c where c.id = cart_id and c.user_id = auth.uid())
);
create policy cart_items_update on public.cart_items for update using (
  exists (select 1 from public.carts c where c.id = cart_id and c.user_id = auth.uid())
);
create policy cart_items_delete on public.cart_items for delete using (
  exists (select 1 from public.carts c where c.id = cart_id and (c.user_id = auth.uid() or public.is_admin()))
);

alter table public.cart_item_addons enable row level security;
create policy cart_item_addons_select on public.cart_item_addons for select using (
  exists (
    select 1 from public.cart_items ci join public.carts c on c.id = ci.cart_id
    where ci.id = cart_item_id and (c.user_id = auth.uid() or public.is_admin())
  )
);
create policy cart_item_addons_insert on public.cart_item_addons for insert with check (
  exists (
    select 1 from public.cart_items ci join public.carts c on c.id = ci.cart_id
    where ci.id = cart_item_id and c.user_id = auth.uid()
  )
);
create policy cart_item_addons_delete on public.cart_item_addons for delete using (
  exists (
    select 1 from public.cart_items ci join public.carts c on c.id = ci.cart_id
    where ci.id = cart_item_id and (c.user_id = auth.uid() or public.is_admin())
  )
);
