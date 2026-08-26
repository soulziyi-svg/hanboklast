-- STEP 9: banners, brand_story, brand_colors, site_contents, site_settings, admin_logs
create table public.banners (
  id uuid primary key default gen_random_uuid(),
  banner_type text not null check (banner_type in ('top','main','goods')),
  title text,
  description text,
  media_url text not null,
  media_type text not null check (media_type in ('image','video')),
  link_url text,
  sort_order integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger banners_set_updated_at
before update on public.banners
for each row execute function public.set_updated_at();

create table public.brand_story (
  id uuid primary key default gen_random_uuid(),
  section_key text not null,
  title text,
  subtitle text,
  content text,
  media_url text,
  media_type text,
  sort_order integer not null default 0,
  active boolean not null default true,
  updated_at timestamptz not null default now()
);

create trigger brand_story_set_updated_at
before update on public.brand_story
for each row execute function public.set_updated_at();

create table public.brand_colors (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  hex_code text not null,
  description text,
  sort_order integer not null default 0,
  active boolean not null default true
);

create table public.site_contents (
  id uuid primary key default gen_random_uuid(),
  section_key text not null unique,
  title text,
  subtitle text,
  description text,
  representative_color text,
  media_url text,
  updated_at timestamptz not null default now()
);

create trigger site_contents_set_updated_at
before update on public.site_contents
for each row execute function public.set_updated_at();

create table public.site_settings (
  id uuid primary key default gen_random_uuid(),
  setting_key text not null unique,
  setting_value jsonb not null,
  updated_at timestamptz not null default now()
);

create trigger site_settings_set_updated_at
before update on public.site_settings
for each row execute function public.set_updated_at();

create table public.admin_logs (
  id uuid primary key default gen_random_uuid(),
  admin_user_id uuid not null references public.profiles(id),
  action text not null,
  target_type text,
  target_id uuid,
  description text,
  before_data jsonb,
  after_data jsonb,
  created_at timestamptz not null default now()
);

alter table public.banners enable row level security;
create policy banners_select on public.banners for select using (active or public.is_admin());
create policy banners_admin_insert on public.banners for insert with check (public.is_admin());
create policy banners_admin_update on public.banners for update using (public.is_admin());
create policy banners_admin_delete on public.banners for delete using (public.is_admin());

alter table public.brand_story enable row level security;
create policy brand_story_select on public.brand_story for select using (active or public.is_admin());
create policy brand_story_admin_insert on public.brand_story for insert with check (public.is_admin());
create policy brand_story_admin_update on public.brand_story for update using (public.is_admin());
create policy brand_story_admin_delete on public.brand_story for delete using (public.is_admin());

alter table public.brand_colors enable row level security;
create policy brand_colors_select on public.brand_colors for select using (active or public.is_admin());
create policy brand_colors_admin_insert on public.brand_colors for insert with check (public.is_admin());
create policy brand_colors_admin_update on public.brand_colors for update using (public.is_admin());
create policy brand_colors_admin_delete on public.brand_colors for delete using (public.is_admin());

alter table public.site_contents enable row level security;
create policy site_contents_select on public.site_contents for select using (true);
create policy site_contents_admin_insert on public.site_contents for insert with check (public.is_admin());
create policy site_contents_admin_update on public.site_contents for update using (public.is_admin());
create policy site_contents_admin_delete on public.site_contents for delete using (public.is_admin());

alter table public.site_settings enable row level security;
create policy site_settings_select on public.site_settings for select using (true);
create policy site_settings_admin_insert on public.site_settings for insert with check (public.is_admin());
create policy site_settings_admin_update on public.site_settings for update using (public.is_admin());
create policy site_settings_admin_delete on public.site_settings for delete using (public.is_admin());

alter table public.admin_logs enable row level security;
create policy admin_logs_select on public.admin_logs for select using (public.is_admin());
create policy admin_logs_insert on public.admin_logs for insert with check (public.is_admin());
