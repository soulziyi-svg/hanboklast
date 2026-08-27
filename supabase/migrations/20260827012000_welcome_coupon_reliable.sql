-- 회원가입 10% 쿠폰을 중복 없이 확실하게 발급합니다.
insert into public.coupons (code, name, discount_type, discount_value, min_order_amount, active)
values ('WELCOME10', '회원가입 10% 할인쿠폰', 'percent', 10, 0, true)
on conflict (code) do update
set name = excluded.name,
    discount_type = excluded.discount_type,
    discount_value = excluded.discount_value,
    min_order_amount = excluded.min_order_amount,
    active = true;

delete from public.user_coupons older
using public.user_coupons newer
where older.user_id = newer.user_id
  and older.coupon_id = newer.coupon_id
  and older.id > newer.id;

create unique index if not exists user_coupons_user_coupon_uidx
on public.user_coupons(user_id, coupon_id);

create or replace function public.issue_signup_coupon()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_coupon_id uuid;
begin
  select id into v_coupon_id
  from public.coupons
  where code = 'WELCOME10' and active
  limit 1;

  if v_coupon_id is not null then
    insert into public.user_coupons (user_id, coupon_id)
    values (new.id, v_coupon_id)
    on conflict (user_id, coupon_id) do nothing;
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_issue_signup_coupon on public.profiles;
create trigger profiles_issue_signup_coupon
after insert on public.profiles
for each row execute function public.issue_signup_coupon();

-- 기존 가입자 중 쿠폰을 받지 못한 계정도 한 번 보완합니다.
insert into public.user_coupons (user_id, coupon_id)
select p.id, c.id
from public.profiles p
cross join public.coupons c
where c.code = 'WELCOME10'
on conflict (user_id, coupon_id) do nothing;

notify pgrst, 'reload schema';
