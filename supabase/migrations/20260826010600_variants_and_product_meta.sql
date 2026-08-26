-- STEP 3: product_variants, inventory_movements, product_size_specs, product_features,
-- product_components, product_addons, product_care, product_shipping_policies, product_detail_sections
create table public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  size text not null check (size in ('S','M','L','FREE')),
  color text,
  sku text not null unique,
  stock_quantity integer not null default 0 check (stock_quantity >= 0),
  low_stock_threshold integer not null default 3,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (product_id, size, color)
);

create trigger product_variants_set_updated_at
before update on public.product_variants
for each row execute function public.set_updated_at();

create index product_variants_product_id_idx on public.product_variants(product_id);

create table public.inventory_movements (
  id uuid primary key default gen_random_uuid(),
  product_variant_id uuid not null references public.product_variants(id) on delete cascade,
  movement_type text not null check (movement_type in ('initial','sale','cancel_restore','return_restore','admin_add','admin_remove','adjustment')),
  quantity integer not null,
  before_stock integer not null,
  after_stock integer not null,
  order_id uuid,
  admin_user_id uuid references public.profiles(id),
  note text,
  created_at timestamptz not null default now()
);

create index inventory_movements_variant_idx on public.inventory_movements(product_variant_id);

create table public.product_size_specs (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  size text not null,
  chest text,
  waist text,
  length text,
  sleeve text,
  note text
);

create table public.product_features (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  title text not null,
  description text,
  sort_order integer not null default 0
);

create table public.product_components (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  component_name text not null,
  included boolean not null default true,
  image_url text,
  description text,
  sort_order integer not null default 0
);

create table public.product_addons (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  addon_product_id uuid not null references public.products(id) on delete cascade,
  special_price integer,
  active boolean not null default true,
  sort_order integer not null default 0
);

create table public.product_care (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null unique references public.products(id) on delete cascade,
  material text,
  washing text,
  wearing_caution text,
  storage_method text
);

create table public.product_shipping_policies (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null unique references public.products(id) on delete cascade,
  shipping_fee integer not null default 0,
  free_shipping_threshold integer,
  estimated_delivery text,
  exchange_policy text,
  return_policy text,
  refund_policy text
);

create table public.product_detail_sections (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  section_type text not null check (section_type in ('description','features','model_images','video','size','components','care','shipping','guide','reviews','related_products')),
  sort_order integer not null default 0,
  visible boolean not null default true
);

-- RLS
alter table public.product_variants enable row level security;
create policy product_variants_select on public.product_variants for select using (
  exists (select 1 from public.products p where p.id = product_id and (p.status = 'public' or public.is_admin()))
);
create policy product_variants_admin_insert on public.product_variants for insert with check (public.is_admin());
create policy product_variants_admin_update on public.product_variants for update using (public.is_admin());
create policy product_variants_admin_delete on public.product_variants for delete using (public.is_admin());

alter table public.inventory_movements enable row level security;
create policy inventory_movements_admin_select on public.inventory_movements for select using (public.is_admin());
create policy inventory_movements_admin_insert on public.inventory_movements for insert with check (public.is_admin());

alter table public.product_size_specs enable row level security;
create policy product_size_specs_select on public.product_size_specs for select using (
  exists (select 1 from public.products p where p.id = product_id and (p.status = 'public' or public.is_admin()))
);
create policy product_size_specs_admin_write on public.product_size_specs for insert with check (public.is_admin());
create policy product_size_specs_admin_update on public.product_size_specs for update using (public.is_admin());
create policy product_size_specs_admin_delete on public.product_size_specs for delete using (public.is_admin());

alter table public.product_features enable row level security;
create policy product_features_select on public.product_features for select using (
  exists (select 1 from public.products p where p.id = product_id and (p.status = 'public' or public.is_admin()))
);
create policy product_features_admin_write on public.product_features for insert with check (public.is_admin());
create policy product_features_admin_update on public.product_features for update using (public.is_admin());
create policy product_features_admin_delete on public.product_features for delete using (public.is_admin());

alter table public.product_components enable row level security;
create policy product_components_select on public.product_components for select using (
  exists (select 1 from public.products p where p.id = product_id and (p.status = 'public' or public.is_admin()))
);
create policy product_components_admin_write on public.product_components for insert with check (public.is_admin());
create policy product_components_admin_update on public.product_components for update using (public.is_admin());
create policy product_components_admin_delete on public.product_components for delete using (public.is_admin());

alter table public.product_addons enable row level security;
create policy product_addons_select on public.product_addons for select using (
  exists (select 1 from public.products p where p.id = product_id and (p.status = 'public' or public.is_admin()))
);
create policy product_addons_admin_write on public.product_addons for insert with check (public.is_admin());
create policy product_addons_admin_update on public.product_addons for update using (public.is_admin());
create policy product_addons_admin_delete on public.product_addons for delete using (public.is_admin());

alter table public.product_care enable row level security;
create policy product_care_select on public.product_care for select using (
  exists (select 1 from public.products p where p.id = product_id and (p.status = 'public' or public.is_admin()))
);
create policy product_care_admin_write on public.product_care for insert with check (public.is_admin());
create policy product_care_admin_update on public.product_care for update using (public.is_admin());
create policy product_care_admin_delete on public.product_care for delete using (public.is_admin());

alter table public.product_shipping_policies enable row level security;
create policy product_shipping_policies_select on public.product_shipping_policies for select using (
  exists (select 1 from public.products p where p.id = product_id and (p.status = 'public' or public.is_admin()))
);
create policy product_shipping_policies_admin_write on public.product_shipping_policies for insert with check (public.is_admin());
create policy product_shipping_policies_admin_update on public.product_shipping_policies for update using (public.is_admin());
create policy product_shipping_policies_admin_delete on public.product_shipping_policies for delete using (public.is_admin());

alter table public.product_detail_sections enable row level security;
create policy product_detail_sections_select on public.product_detail_sections for select using (
  exists (select 1 from public.products p where p.id = product_id and (p.status = 'public' or public.is_admin()))
);
create policy product_detail_sections_admin_write on public.product_detail_sections for insert with check (public.is_admin());
create policy product_detail_sections_admin_update on public.product_detail_sections for update using (public.is_admin());
create policy product_detail_sections_admin_delete on public.product_detail_sections for delete using (public.is_admin());
