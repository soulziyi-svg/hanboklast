-- 상품 상세페이지 문의 게시판: 상품 연결, 비밀글, 안전한 공개 목록 RPC
alter table public.inquiries
  add column if not exists product_id uuid references public.products(id) on delete set null,
  add column if not exists is_secret boolean not null default false;

create index if not exists inquiries_product_id_created_at_idx
  on public.inquiries(product_id, created_at desc);

create or replace function public.get_product_inquiries(p_product_id uuid)
returns table (id uuid, title text, author_name text, status text, created_at timestamptz,
  answered_at timestamptz, admin_reply text, is_secret boolean, can_view boolean)
language sql stable security definer set search_path = public
as $$
  select i.id,
    case when i.is_secret and not (auth.uid() = i.user_id or public.is_admin()) then '비밀글입니다.' else i.title end,
    case when length(i.name) <= 1 then i.name || '*' else left(i.name,1) || repeat('*',greatest(length(i.name)-1,1)) end,
    i.status, i.created_at, i.answered_at,
    case when i.is_secret and not (auth.uid() = i.user_id or public.is_admin()) then null else i.admin_reply end,
    i.is_secret, not i.is_secret or auth.uid() = i.user_id or public.is_admin()
  from public.inquiries i where i.product_id = p_product_id
  order by i.created_at desc limit 100;
$$;

revoke all on function public.get_product_inquiries(uuid) from public;
grant execute on function public.get_product_inquiries(uuid) to anon, authenticated;
notify pgrst, 'reload schema';
