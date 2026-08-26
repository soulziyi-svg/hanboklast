-- STEP 8: coupons, user_coupons, inquiries + signup coupon auto-issue
create table public.coupons (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  discount_type text not null check (discount_type in ('percent','fixed')),
  discount_value numeric not null check (discount_value >= 0),
  min_order_amount integer not null default 0,
  max_discount_amount integer,
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.user_coupons (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  coupon_id uuid not null references public.coupons(id),
  issued_at timestamptz not null default now(),
  used_at timestamptz,
  order_id uuid references public.orders(id),
  status text not null default 'issued' check (status in ('issued','used','expired'))
);

create table public.inquiries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id),
  name text not null,
  phone text,
  email text,
  inquiry_type text,
  title text not null,
  content text not null,
  status text not null default 'pending' check (status in ('pending','answered','closed')),
  admin_reply text,
  created_at timestamptz not null default now(),
  answered_at timestamptz
);

create index inquiries_status_idx on public.inquiries(status);

-- auto-issue the signup 10% coupon (WELCOME10) when a profile is created
create or replace function public.issue_signup_coupon()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_coupon_id uuid;
begin
  select id into v_coupon_id from public.coupons where code = 'WELCOME10' and active limit 1;
  if v_coupon_id is not null then
    insert into public.user_coupons (user_id, coupon_id) values (new.id, v_coupon_id);
  end if;
  return new;
end;
$$;

create trigger profiles_issue_signup_coupon
after insert on public.profiles
for each row execute function public.issue_signup_coupon();

alter table public.coupons enable row level security;
create policy coupons_select on public.coupons for select using (active or public.is_admin());
create policy coupons_admin_insert on public.coupons for insert with check (public.is_admin());
create policy coupons_admin_update on public.coupons for update using (public.is_admin());
create policy coupons_admin_delete on public.coupons for delete using (public.is_admin());

alter table public.user_coupons enable row level security;
create policy user_coupons_select on public.user_coupons for select using (auth.uid() = user_id or public.is_admin());
create policy user_coupons_admin_write on public.user_coupons for insert with check (public.is_admin());
create policy user_coupons_admin_update on public.user_coupons for update using (public.is_admin());

alter table public.inquiries enable row level security;
create policy inquiries_select on public.inquiries for select using (auth.uid() = user_id or public.is_admin());
create policy inquiries_insert on public.inquiries for insert with check (user_id is null or auth.uid() = user_id);
create policy inquiries_admin_update on public.inquiries for update using (public.is_admin());
