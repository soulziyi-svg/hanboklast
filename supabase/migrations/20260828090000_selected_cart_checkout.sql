-- 체크한 장바구니 항목만 안전하게 주문하고, 선택하지 않은 항목은 장바구니에 유지합니다.
create or replace function public.create_selected_order(
  p_customer_name text,
  p_customer_phone text,
  p_postcode text,
  p_address text,
  p_address_detail text,
  p_delivery_memo text,
  p_coupon_code text default null,
  p_cart_item_ids uuid[] default null
)
returns public.orders
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_cart_id uuid;
  v_holding_cart_id uuid;
  v_order public.orders;
begin
  if v_user_id is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  if coalesce(cardinality(p_cart_item_ids), 0) = 0 then
    raise exception '구매할 상품을 선택해주세요.';
  end if;

  select id into v_cart_id
  from public.carts
  where user_id = v_user_id and status = 'active'
  limit 1;

  if v_cart_id is null or exists (
    select 1
    from unnest(p_cart_item_ids) selected_id
    where not exists (
      select 1 from public.cart_items ci
      where ci.id = selected_id and ci.cart_id = v_cart_id
    )
  ) then
    raise exception '선택한 장바구니 상품을 확인할 수 없습니다.';
  end if;

  insert into public.carts (user_id, status)
  values (v_user_id, 'abandoned')
  returning id into v_holding_cart_id;

  update public.cart_items
  set cart_id = v_holding_cart_id
  where cart_id = v_cart_id
    and not (id = any(p_cart_item_ids));

  v_order := public.create_order(
    p_customer_name,
    p_customer_phone,
    p_postcode,
    p_address,
    p_address_detail,
    p_delivery_memo,
    p_coupon_code
  );

  update public.cart_items
  set cart_id = v_cart_id
  where cart_id = v_holding_cart_id;

  delete from public.carts where id = v_holding_cart_id;
  return v_order;
end;
$$;

revoke all on function public.create_selected_order(text, text, text, text, text, text, text, uuid[]) from public;
revoke all on function public.create_selected_order(text, text, text, text, text, text, text, uuid[]) from anon;
grant execute on function public.create_selected_order(text, text, text, text, text, text, text, uuid[]) to authenticated;
