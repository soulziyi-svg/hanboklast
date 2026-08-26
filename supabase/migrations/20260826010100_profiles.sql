-- STEP 1: profiles (1:1 with auth.users) + admin role wiring + RLS
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  name text,
  phone text,
  postcode text,
  address text,
  address_detail text,
  role text not null default 'user' check (role in ('user','admin')),
  status text not null default 'active' check (status in ('active','inactive','withdrawn')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_login_at timestamptz
);

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

-- helper: is the current session an admin?
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  );
$$;

-- auto-create profile row when a new auth user signs up
-- heechic@naver.com is provisioned as admin per project spec
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, role)
  values (
    new.id,
    new.email,
    case when lower(new.email) = 'heechic@naver.com' then 'admin' else 'user' end
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- prevent a non-admin from ever changing their own role/status via UPDATE
create or replace function public.protect_profile_role()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    new.role = old.role;
    new.status = old.status;
  end if;
  return new;
end;
$$;

create trigger profiles_protect_role
before update on public.profiles
for each row execute function public.protect_profile_role();

alter table public.profiles enable row level security;

create policy profiles_select on public.profiles
for select using (auth.uid() = id or public.is_admin());

create policy profiles_update on public.profiles
for update using (auth.uid() = id or public.is_admin());

create policy profiles_admin_insert on public.profiles
for insert with check (public.is_admin());

create policy profiles_admin_delete on public.profiles
for delete using (public.is_admin());
