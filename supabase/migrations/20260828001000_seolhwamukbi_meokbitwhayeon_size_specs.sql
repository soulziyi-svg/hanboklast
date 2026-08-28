-- 설화먹비/먹빛화연 실측 사이즈가 비어있어 다른 한복 상품과 동일한 표준 치수로 채웁니다.
update public.product_size_specs
set chest = case size when 'S' then '82~85cm' when 'M' then '86~89cm' when 'L' then '90~94cm' end,
    waist = case size when 'S' then '64~68cm' when 'M' then '69~73cm' when 'L' then '74~78cm' end,
    length = case size when 'S' then '128cm' when 'M' then '130cm' when 'L' then '132cm' end
where product_id in ('177e81f7-deb7-4664-aaac-44b8d1731e2a', '05565a37-7031-45d1-aa1d-f5a36d026357');
