-- STEP 1: user_consents
create table public.user_consents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  service_terms boolean not null default false,
  location_terms boolean not null default false,
  agreed_at timestamptz not null default now()
);

create index user_consents_user_id_idx on public.user_consents(user_id);

alter table public.user_consents enable row level security;

create policy user_consents_select on public.user_consents
for select using (auth.uid() = user_id or public.is_admin());

create policy user_consents_insert on public.user_consents
for insert with check (auth.uid() = user_id);
