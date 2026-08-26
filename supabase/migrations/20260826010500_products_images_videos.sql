-- STEP 2: products, product_images, product_videos + RLS + indexes
create table public.products (
  id uuid primary key default gen_random_uuid(),
  product_code text not null unique,
  collection_id uuid references public.collections(id) on delete set null,
  category_id uuid references public.categories(id) on delete set null,
  name text not null,
  slug text not null unique,
  product_type text not null check (product_type in ('hanbok','accessory','goods')),
  short_description text,
  description text,
  regular_price integer not null check (regular_price >= 0),
  discount_rate numeric not null default 0 check (discount_rate >= 0 and discount_rate <= 100),
  sale_price integer not null check (sale_price >= 0),
  gender text,
  color text,
  status text not null default 'draft' check (status in ('draft','public','soldout','hidden')),
  is_hot boolean not null default false,
  is_featured boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger products_set_updated_at
before update on public.products
for each row execute function public.set_updated_at();

create index products_collection_id_idx on public.products(collection_id);
create index products_category_id_idx on public.products(category_id);
create index products_status_idx on public.products(status);

create table public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  image_url text not null,
  image_type text not null check (image_type in ('main','thumbnail','model','product_only','detail','component','accessory','goods')),
  alt_text text,
  sort_order integer not null default 0,
  is_primary boolean not null default false,
  created_at timestamptz not null default now()
);

create index product_images_product_id_idx on public.product_images(product_id);

create table public.product_videos (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  video_url text not null,
  video_type text not null check (video_type in ('detail','model','guide')),
  title text,
  description text,
  sort_order integer not null default 0
);

alter table public.products enable row level security;
create policy products_select on public.products for select using (status = 'public' or public.is_admin());
create policy products_admin_insert on public.products for insert with check (public.is_admin());
create policy products_admin_update on public.products for update using (public.is_admin());
create policy products_admin_delete on public.products for delete using (public.is_admin());

alter table public.product_images enable row level security;
create policy product_images_select on public.product_images for select using (
  exists (select 1 from public.products p where p.id = product_id and (p.status = 'public' or public.is_admin()))
);
create policy product_images_admin_insert on public.product_images for insert with check (public.is_admin());
create policy product_images_admin_update on public.product_images for update using (public.is_admin());
create policy product_images_admin_delete on public.product_images for delete using (public.is_admin());

alter table public.product_videos enable row level security;
create policy product_videos_select on public.product_videos for select using (
  exists (select 1 from public.products p where p.id = product_id and (p.status = 'public' or public.is_admin()))
);
create policy product_videos_admin_insert on public.product_videos for insert with check (public.is_admin());
create policy product_videos_admin_update on public.product_videos for update using (public.is_admin());
create policy product_videos_admin_delete on public.product_videos for delete using (public.is_admin());
