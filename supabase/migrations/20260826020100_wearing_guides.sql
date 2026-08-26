-- Missed during the original STEP 3 migration batch: 착용가이드 (spec section 23)
create table public.wearing_guides (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references public.products(id) on delete cascade,
  step_number integer not null,
  title text,
  description text,
  media_url text,
  media_type text check (media_type in ('image', 'video')),
  active boolean not null default true
);

create index wearing_guides_product_id_idx on public.wearing_guides(product_id);

alter table public.wearing_guides enable row level security;
create policy wearing_guides_select on public.wearing_guides for select using (
  active and (
    product_id is null
    or exists (select 1 from public.products p where p.id = product_id and (p.status = 'public' or public.is_admin()))
  )
);
create policy wearing_guides_admin_insert on public.wearing_guides for insert with check (public.is_admin());
create policy wearing_guides_admin_update on public.wearing_guides for update using (public.is_admin());
create policy wearing_guides_admin_delete on public.wearing_guides for delete using (public.is_admin());
