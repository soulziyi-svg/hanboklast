-- 달빛하얀소복 상세페이지 사이즈표에 소매 길이가 비어있어 다른 실측값과 같은 방식(단일 수치, cm)으로 채웁니다.
update public.product_size_specs
set sleeve = case size when 'S' then '56cm' when 'M' then '57cm' when 'L' then '58cm' end
where product_id = 'f2b07ece-e0e5-496a-baa1-460816b830d2';
