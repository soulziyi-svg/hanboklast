-- 관리자가 활성 회원 전체 또는 특정 회원 한 명에게 쿠폰을 발급합니다.
create or replace function public.admin_issue_coupon(
  p_coupon_id uuid,
  p_user_id uuid default null
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_issued_count integer := 0;
begin
  if not public.is_admin() then
    raise exception 'ADMIN_REQUIRED';
  end if;

  if not exists (select 1 from public.coupons where id = p_coupon_id and active) then
    raise exception '활성 쿠폰을 찾을 수 없습니다.';
  end if;

  insert into public.user_coupons (user_id, coupon_id, status)
  select p.id, p_coupon_id, 'issued'
  from public.profiles p
  where p.status = 'active'
    and (p_user_id is null or p.id = p_user_id)
  on conflict (user_id, coupon_id) do nothing;

  get diagnostics v_issued_count = row_count;
  return v_issued_count;
end;
$$;

revoke all on function public.admin_issue_coupon(uuid, uuid) from public;
revoke all on function public.admin_issue_coupon(uuid, uuid) from anon;
revoke all on function public.admin_issue_coupon(uuid, uuid) from authenticated;
grant execute on function public.admin_issue_coupon(uuid, uuid) to authenticated;

notify pgrst, 'reload schema';
