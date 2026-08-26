-- STEP 2: collections & categories + RLS
create table public.collections (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  thumbnail_url text,
  sort_order integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger collections_set_updated_at
before update on public.collections
for each row execute function public.set_updated_at();

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid references public.categories(id) on delete set null,
  name text not null,
  slug text not null unique,
  sort_order integer not null default 0,
  active boolean not null default true
);

alter table public.collections enable row level security;
create policy collections_select on public.collections for select using (active or public.is_admin());
create policy collections_admin_insert on public.collections for insert with check (public.is_admin());
create policy collections_admin_update on public.collections for update using (public.is_admin());
create policy collections_admin_delete on public.collections for delete using (public.is_admin());

alter table public.categories enable row level security;
create policy categories_select on public.categories for select using (active or public.is_admin());
create policy categories_admin_insert on public.categories for insert with check (public.is_admin());
create policy categories_admin_update on public.categories for update using (public.is_admin());
create policy categories_admin_delete on public.categories for delete using (public.is_admin());
