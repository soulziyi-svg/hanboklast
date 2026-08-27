-- 고객이 배송 완료 주문을 구매 확정할 수 있도록 제한된 RPC를 제공합니다.
create or replace function public.confirm_my_order(p_order_id uuid)
returns public.orders
language plpgsql
security definer
set search_path = public
as $$
declare v_order public.orders;
begin
  update public.orders
  set order_status = 'confirmed', confirmed_at = now()
  where id = p_order_id and user_id = auth.uid() and order_status = 'delivered'
  returning * into v_order;
  if v_order.id is null then raise exception '배송 완료 주문만 구매 확정할 수 있습니다.'; end if;
  return v_order;
end;
$$;
revoke all on function public.confirm_my_order(uuid) from public, anon;
grant execute on function public.confirm_my_order(uuid) to authenticated;

-- PostgREST가 새 RPC를 즉시 인식하도록 스키마 캐시를 갱신합니다.
notify pgrst, 'reload schema';
