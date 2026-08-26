-- Fill in product_features / product_components / product_care / product_shipping_policies
-- for the 7 hanbok products so the product detail page has content in every tab.
-- Shipping numbers/policy text reuse the same site_settings defaults already seeded
-- (default_shipping_fee, free_shipping_threshold, default_exchange/return/refund_policy).
do $fill$
declare
  v_product record;
  v_shipping_fee integer;
  v_free_shipping_threshold integer;
  v_exchange_policy text;
  v_return_policy text;
  v_refund_policy text;
begin
  select (setting_value#>>'{}')::integer into v_shipping_fee from public.site_settings where setting_key = 'default_shipping_fee';
  select (setting_value#>>'{}')::integer into v_free_shipping_threshold from public.site_settings where setting_key = 'free_shipping_threshold';
  select setting_value#>>'{}' into v_exchange_policy from public.site_settings where setting_key = 'default_exchange_policy';
  select setting_value#>>'{}' into v_return_policy from public.site_settings where setting_key = 'default_return_policy';
  select setting_value#>>'{}' into v_refund_policy from public.site_settings where setting_key = 'default_refund_policy';

  for v_product in select id, name from public.products where product_type = 'hanbok'
  loop
    insert into public.product_features (product_id, title, description, sort_order) values
      (v_product.id, '완성도 높은 올인원 세트', v_product.name || ' 한 벌만 준비하면 촬영에 필요한 기본 구성을 바로 갖출 수 있습니다.', 1),
      (v_product.id, '선명한 색감과 디테일', '사진에서도 또렷하게 살아나는 배색과 자수 디테일로 완성했습니다.', 2),
      (v_product.id, '편안하고 완성도 높은 연출', '장시간 촬영이나 행사에도 활동하기 편안한 재단으로 제작했습니다.', 3);

    insert into public.product_components (product_id, component_name, included, sort_order) values
      (v_product.id, '저고리', true, 1),
      (v_product.id, '치마', true, 2),
      (v_product.id, '속치마', true, 3),
      (v_product.id, '허리끈', true, 4);

    insert into public.product_care (product_id, material, washing, wearing_caution, storage_method)
    values (
      v_product.id,
      '겉감 폴리혼방, 안감 면 100%',
      '드라이클리닝을 권장합니다. 물세탁 시 변형이 있을 수 있습니다.',
      '장시간 물기·마찰에 노출되면 변색될 수 있으니 주의해주세요.',
      '습기가 적은 곳에서 옷걸이에 걸어 보관해주세요.'
    );

    insert into public.product_shipping_policies (
      product_id, shipping_fee, free_shipping_threshold, estimated_delivery,
      exchange_policy, return_policy, refund_policy
    ) values (
      v_product.id, coalesce(v_shipping_fee, 3000), v_free_shipping_threshold, '결제 완료 후 2~3일 이내 발송',
      coalesce(v_exchange_policy, ''), coalesce(v_return_policy, ''), coalesce(v_refund_policy, '')
    );
  end loop;
end;
$fill$;
