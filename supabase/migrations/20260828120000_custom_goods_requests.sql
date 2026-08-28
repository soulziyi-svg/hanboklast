-- 사용자가 올린 사진으로 제작하는 맞춤 굿즈 요청
create table if not exists public.custom_goods_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  collection_slug text not null,
  selected_items jsonb not null default '[]'::jsonb,
  photo_url text not null,
  quantity integer not null default 1 check (quantity > 0),
  status text not null default 'draft' check (status in ('draft','ordered','producing','completed','cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.custom_goods_requests enable row level security;
drop policy if exists custom_goods_requests_select on public.custom_goods_requests;
drop policy if exists custom_goods_requests_insert on public.custom_goods_requests;
drop policy if exists custom_goods_requests_update on public.custom_goods_requests;
create policy custom_goods_requests_select on public.custom_goods_requests for select
  using (auth.uid() = user_id or public.is_admin());
create policy custom_goods_requests_insert on public.custom_goods_requests for insert
  with check (auth.uid() = user_id);
create policy custom_goods_requests_update on public.custom_goods_requests for update
  using (auth.uid() = user_id or public.is_admin());

insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('custom-goods','custom-goods',false,10485760,array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;

drop policy if exists "Users read own custom-goods" on storage.objects;
drop policy if exists "Users upload own custom-goods" on storage.objects;
drop policy if exists "Users delete own custom-goods" on storage.objects;
create policy "Users read own custom-goods" on storage.objects for select to authenticated
  using (bucket_id='custom-goods' and ((storage.foldername(name))[1]=auth.uid()::text or public.is_admin()));
create policy "Users upload own custom-goods" on storage.objects for insert to authenticated
  with check (bucket_id='custom-goods' and (storage.foldername(name))[1]=auth.uid()::text);
create policy "Users delete own custom-goods" on storage.objects for delete to authenticated
  using (bucket_id='custom-goods' and (storage.foldername(name))[1]=auth.uid()::text);
notify pgrst, 'reload schema';
