-- STEP 7: reviews, review_images, review_tags, review_replies, product_review_stats view
create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id),
  product_id uuid not null references public.products(id),
  order_item_id uuid references public.order_items(id),
  nickname text not null,
  rating numeric(2,1) not null check (rating >= 0.5 and rating <= 5.0),
  content text not null,
  is_verified boolean not null default false,
  is_visible boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger reviews_set_updated_at
before update on public.reviews
for each row execute function public.set_updated_at();

create index reviews_product_id_idx on public.reviews(product_id);

-- a review can only be marked "verified purchase" if order_item really belongs to the reviewer
create or replace function public.set_review_verified()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.order_item_id is not null and exists (
    select 1 from public.order_items oi
    join public.orders o on o.id = oi.order_id
    where oi.id = new.order_item_id and o.user_id = new.user_id
  ) then
    new.is_verified := true;
  else
    new.is_verified := false;
  end if;
  return new;
end;
$$;

create trigger reviews_verify
before insert or update of order_item_id, user_id on public.reviews
for each row execute function public.set_review_verified();

create table public.review_images (
  id uuid primary key default gen_random_uuid(),
  review_id uuid not null references public.reviews(id) on delete cascade,
  image_url text not null,
  alt_text text,
  sort_order integer not null default 0
);

create table public.review_tags (
  id uuid primary key default gen_random_uuid(),
  review_id uuid not null references public.reviews(id) on delete cascade,
  tag text not null
);

create table public.review_replies (
  id uuid primary key default gen_random_uuid(),
  review_id uuid not null references public.reviews(id) on delete cascade,
  admin_user_id uuid not null references public.profiles(id),
  content text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger review_replies_set_updated_at
before update on public.review_replies
for each row execute function public.set_updated_at();

create or replace view public.product_review_stats as
select product_id, round(avg(rating), 1) as average_rating, count(*) as review_count
from public.reviews
where is_visible = true
group by product_id;

alter table public.reviews enable row level security;
create policy reviews_select on public.reviews for select using (is_visible or auth.uid() = user_id or public.is_admin());
create policy reviews_insert on public.reviews for insert with check (auth.uid() = user_id);
create policy reviews_update on public.reviews for update using (auth.uid() = user_id or public.is_admin());
create policy reviews_delete on public.reviews for delete using (auth.uid() = user_id or public.is_admin());

alter table public.review_images enable row level security;
create policy review_images_select on public.review_images for select using (
  exists (select 1 from public.reviews r where r.id = review_id and (r.is_visible or r.user_id = auth.uid() or public.is_admin()))
);
create policy review_images_write on public.review_images for insert with check (
  exists (select 1 from public.reviews r where r.id = review_id and r.user_id = auth.uid())
);
create policy review_images_delete on public.review_images for delete using (
  exists (select 1 from public.reviews r where r.id = review_id and (r.user_id = auth.uid() or public.is_admin()))
);

alter table public.review_tags enable row level security;
create policy review_tags_select on public.review_tags for select using (
  exists (select 1 from public.reviews r where r.id = review_id and (r.is_visible or r.user_id = auth.uid() or public.is_admin()))
);
create policy review_tags_write on public.review_tags for insert with check (
  exists (select 1 from public.reviews r where r.id = review_id and r.user_id = auth.uid())
);
create policy review_tags_delete on public.review_tags for delete using (
  exists (select 1 from public.reviews r where r.id = review_id and (r.user_id = auth.uid() or public.is_admin()))
);

alter table public.review_replies enable row level security;
create policy review_replies_select on public.review_replies for select using (
  exists (select 1 from public.reviews r where r.id = review_id and (r.is_visible or r.user_id = auth.uid() or public.is_admin()))
);
create policy review_replies_admin_insert on public.review_replies for insert with check (public.is_admin());
create policy review_replies_admin_update on public.review_replies for update using (public.is_admin());
create policy review_replies_admin_delete on public.review_replies for delete using (public.is_admin());
