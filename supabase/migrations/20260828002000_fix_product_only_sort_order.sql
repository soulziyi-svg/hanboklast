-- 홈페이지 컨텐츠1 카드의 마우스오버 "상품 단독컷" 로직(js/data.js)은
-- product_only 이미지를 sort_order=100(정면)/101(측면)로 찾습니다.
-- 달빛하얀소복/먹빛화연/설화먹비는 등록 시 sort_order가 3/4로 잘못 들어가 있어
-- 마우스오버해도 이미지가 바뀌지 않는 버그가 있었습니다. 다른 정상 상품들과 같은 규칙으로 맞춥니다.
update public.product_images pi
set sort_order = 100
from public.products p
where pi.product_id = p.id
  and p.slug in ('dalbitwhayansobok-hanbok', 'meokbitwhayeon-hanbok', 'seolhwamukbi-hanbok')
  and pi.image_type = 'product_only'
  and pi.sort_order = 3;

update public.product_images pi
set sort_order = 101
from public.products p
where pi.product_id = p.id
  and p.slug in ('dalbitwhayansobok-hanbok', 'meokbitwhayeon-hanbok', 'seolhwamukbi-hanbok')
  and pi.image_type = 'product_only'
  and pi.sort_order = 4;
