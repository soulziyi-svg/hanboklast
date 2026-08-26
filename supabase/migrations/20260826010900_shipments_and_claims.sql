-- STEP 6: shipments, shipment_history, order_claims + RLS
create table public.shipments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  courier_name text,
  tracking_number text,
  status text not null default 'preparing' check (status in ('preparing','shipping','delivered')),
  shipped_at timestamptz,
  estimated_delivery_at timestamptz,
  delivered_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger shipments_set_updated_at
before update on public.shipments
for each row execute function public.set_updated_at();

create index shipments_order_id_idx on public.shipments(order_id);

create table public.shipment_history (
  id uuid primary key default gen_random_uuid(),
  shipment_id uuid not null references public.shipments(id) on delete cascade,
  status text not null,
  description text,
  occurred_at timestamptz not null default now()
);

create table public.order_claims (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  order_item_id uuid references public.order_items(id) on delete set null,
  user_id uuid not null references public.profiles(id),
  claim_type text not null check (claim_type in ('cancel','exchange','return','refund')),
  reason text,
  status text not null default 'requested' check (status in ('requested','reviewing','approved','rejected','completed')),
  requested_at timestamptz not null default now(),
  completed_at timestamptz,
  admin_note text
);

alter table public.shipments enable row level security;
create policy shipments_select on public.shipments for select using (
  exists (select 1 from public.orders o where o.id = order_id and (o.user_id = auth.uid() or public.is_admin()))
);
create policy shipments_admin_insert on public.shipments for insert with check (public.is_admin());
create policy shipments_admin_update on public.shipments for update using (public.is_admin());

alter table public.shipment_history enable row level security;
create policy shipment_history_select on public.shipment_history for select using (
  exists (
    select 1 from public.shipments s join public.orders o on o.id = s.order_id
    where s.id = shipment_id and (o.user_id = auth.uid() or public.is_admin())
  )
);
create policy shipment_history_admin_insert on public.shipment_history for insert with check (public.is_admin());

alter table public.order_claims enable row level security;
create policy order_claims_select on public.order_claims for select using (auth.uid() = user_id or public.is_admin());
create policy order_claims_insert on public.order_claims for insert with check (auth.uid() = user_id);
create policy order_claims_admin_update on public.order_claims for update using (public.is_admin());
