-- STEP 5(RPC): create_order()
-- Server-side authoritative order creation: re-reads price/stock from DB,
-- decrements stock safely inside one transaction, snapshots order line data,
-- and rejects the whole order if any line is out of stock.
create or replace function public.create_order(
  p_customer_name text,
  p_customer_phone text,
  p_postcode text,
  p_address text,
  p_address_detail text,
  p_delivery_memo text,
  p_coupon_code text default null
)
returns public.orders
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_cart_id uuid;
  v_item record;
  v_addon record;
  v_product_total integer := 0;
  v_shipping_fee integer := 0;
  v_free_shipping_threshold integer := 0;
  v_discount_amount integer := 0;
  v_coupon_discount integer := 0;
  v_user_coupon_id uuid;
  v_discount_type text;
  v_discount_value numeric;
  v_min_order_amount integer;
  v_max_discount_amount integer;
  v_order_number text;
  v_order public.orders;
  v_order_item_id uuid;
  v_shipment_id uuid;
begin
  if v_user_id is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  select id into v_cart_id from public.carts
  where user_id = v_user_id and status = 'active'
  limit 1;

  if v_cart_id is null or not exists (select 1 from public.cart_items where cart_id = v_cart_id) then
    raise exception '장바구니가 비어있습니다.';
  end if;

  v_order_number := 'YH-' || to_char(now(), 'YYYYMMDD') || '-' ||
    lpad((coalesce((select count(*) from public.orders where ordered_at::date = current_date), 0) + 1)::text, 3, '0');

  insert into public.orders (
    order_number, user_id, customer_name, customer_phone, postcode, address, address_detail, delivery_memo
  ) values (
    v_order_number, v_user_id, p_customer_name, p_customer_phone, p_postcode, p_address, p_address_detail, p_delivery_memo
  ) returning * into v_order;

  for v_item in
    select ci.id as cart_item_id, ci.product_id, ci.product_variant_id, ci.quantity,
           p.name as product_name, p.sale_price, pv.size, pv.color, pv.sku, pv.stock_quantity
    from public.cart_items ci
    join public.products p on p.id = ci.product_id
    join public.product_variants pv on pv.id = ci.product_variant_id
    where ci.cart_id = v_cart_id
    for update of pv
  loop
    if v_item.stock_quantity < v_item.quantity then
      raise exception '선택하신 상품의 재고가 변경되었습니다.';
    end if;

    insert into public.order_items (
      order_id, product_id, product_variant_id, product_name_snapshot, option_snapshot, sku_snapshot,
      quantity, unit_price, discount_amount, total_price
    ) values (
      v_order.id, v_item.product_id, v_item.product_variant_id, v_item.product_name,
      nullif(concat_ws(' / ', nullif(v_item.size, 'FREE'), v_item.color), ''), v_item.sku,
      v_item.quantity, v_item.sale_price, 0, v_item.sale_price * v_item.quantity
    ) returning id into v_order_item_id;

    v_product_total := v_product_total + (v_item.sale_price * v_item.quantity);

    update public.product_variants
    set stock_quantity = stock_quantity - v_item.quantity
    where id = v_item.product_variant_id;

    insert into public.inventory_movements (
      product_variant_id, movement_type, quantity, before_stock, after_stock, order_id, note
    ) values (
      v_item.product_variant_id, 'sale', -v_item.quantity, v_item.stock_quantity,
      v_item.stock_quantity - v_item.quantity, v_order.id, '주문 생성으로 인한 재고 차감'
    );

    for v_addon in
      select cia.addon_product_id, cia.addon_variant_id, cia.quantity,
             ap.name as addon_name, ap.sale_price as addon_price, apv.stock_quantity as addon_stock
      from public.cart_item_addons cia
      join public.products ap on ap.id = cia.addon_product_id
      left join public.product_variants apv on apv.id = cia.addon_variant_id
      where cia.cart_item_id = v_item.cart_item_id
    loop
      if v_addon.addon_variant_id is not null and coalesce(v_addon.addon_stock, 0) < v_addon.quantity then
        raise exception '선택하신 상품의 재고가 변경되었습니다.';
      end if;

      insert into public.order_item_addons (
        order_item_id, addon_product_id, addon_variant_id, addon_name_snapshot, option_snapshot,
        unit_price, quantity, total_price
      ) values (
        v_order_item_id, v_addon.addon_product_id, v_addon.addon_variant_id, v_addon.addon_name, null,
        v_addon.addon_price, v_addon.quantity, v_addon.addon_price * v_addon.quantity
      );

      v_product_total := v_product_total + (v_addon.addon_price * v_addon.quantity);

      if v_addon.addon_variant_id is not null then
        update public.product_variants
        set stock_quantity = stock_quantity - v_addon.quantity
        where id = v_addon.addon_variant_id;

        insert into public.inventory_movements (
          product_variant_id, movement_type, quantity, before_stock, after_stock, order_id, note
        ) values (
          v_addon.addon_variant_id, 'sale', -v_addon.quantity, v_addon.addon_stock,
          v_addon.addon_stock - v_addon.quantity, v_order.id, '추가구성 재고 차감'
        );
      end if;
    end loop;
  end loop;

  select (setting_value#>>'{}')::integer into v_shipping_fee
  from public.site_settings where setting_key = 'default_shipping_fee';
  v_shipping_fee := coalesce(v_shipping_fee, 0);

  select (setting_value#>>'{}')::integer into v_free_shipping_threshold
  from public.site_settings where setting_key = 'free_shipping_threshold';

  if v_free_shipping_threshold is not null and v_product_total >= v_free_shipping_threshold then
    v_shipping_fee := 0;
  end if;

  if p_coupon_code is not null then
    select uc.id, c.discount_type, c.discount_value, c.min_order_amount, c.max_discount_amount
      into v_user_coupon_id, v_discount_type, v_discount_value, v_min_order_amount, v_max_discount_amount
    from public.user_coupons uc
    join public.coupons c on c.id = uc.coupon_id
    where uc.user_id = v_user_id
      and c.code = p_coupon_code
      and uc.status = 'issued'
      and c.active
      and c.starts_at <= now()
      and (c.ends_at is null or c.ends_at >= now())
    limit 1;

    if v_user_coupon_id is not null and v_product_total >= coalesce(v_min_order_amount, 0) then
      if v_discount_type = 'percent' then
        v_coupon_discount := floor(v_product_total * v_discount_value / 100);
        if v_max_discount_amount is not null and v_coupon_discount > v_max_discount_amount then
          v_coupon_discount := v_max_discount_amount;
        end if;
      else
        v_coupon_discount := v_discount_value::integer;
      end if;

      update public.user_coupons
      set status = 'used', used_at = now(), order_id = v_order.id
      where id = v_user_coupon_id;
    end if;
  end if;

  update public.orders
  set product_total = v_product_total,
      shipping_fee = v_shipping_fee,
      discount_amount = v_discount_amount,
      coupon_discount = v_coupon_discount,
      total_amount = greatest(v_product_total + v_shipping_fee - v_discount_amount - v_coupon_discount, 0),
      payment_status = 'paid',
      order_status = 'paid'
  where id = v_order.id
  returning * into v_order;

  insert into public.shipments (order_id, status)
  values (v_order.id, 'preparing')
  returning id into v_shipment_id;

  insert into public.shipment_history (shipment_id, status, description)
  values (v_shipment_id, 'preparing', '상품 준비중');

  delete from public.cart_items where cart_id = v_cart_id;

  return v_order;
end;
$$;

grant execute on function public.create_order(text, text, text, text, text, text, text) to authenticated;
