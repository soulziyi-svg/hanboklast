-- Seed site_settings, site_contents, coupons, chatbot_keywords, brand_colors, banners
-- Copy that already existed in the original plan (footer/company info, banner slide text)
-- is reused verbatim; anything not specified in the plan is left minimal/neutral.

insert into public.site_settings (setting_key, setting_value) values
('company_name', to_jsonb('연화재실'::text)),
('ceo_name', to_jsonb('장철희'::text)),
('business_number', to_jsonb('000-00-00000'::text)),
('address', to_jsonb('서울시 영등포구 영등포동'::text)),
('customer_service_phone', to_jsonb('02-000-0000'::text)),
('company_email', to_jsonb('welcome@ibubom.com'::text)),
('default_shipping_fee', to_jsonb(3000)),
('free_shipping_threshold', to_jsonb(100000)),
('default_exchange_policy', to_jsonb('상품 수령 후 7일 이내 교환 가능합니다. (미착용, 미세탁 상품에 한함)'::text)),
('default_return_policy', to_jsonb('상품 수령 후 7일 이내 반품 가능합니다. (미착용, 미세탁 상품에 한함)'::text)),
('default_refund_policy', to_jsonb('반품 상품 확인 후 영업일 기준 3~5일 이내 환불됩니다.'::text));

insert into public.site_contents (section_key, title, subtitle, description, representative_color) values
('top_banner', null, null, '한국의 아름다움을 입다 · 회원가입 즉시 10% 할인쿠폰 · 다양한 나만의 굿즈 제작', null),
('main', '은은하게 완성되는 우아함', null, '부드러운 색감과 세련된 배색이 어우러져 어디서든 단아하고 품격 있는 분위기를 만들어 줍니다.', null),
('brand_story', '한국의 아름다움을 현대적이고 조화롭게 아름다움을 담아냅니다.', 'DESIGNER STORY', null, null),
('content1', '한복', null, null, null),
('content2_goods', '한국의 아름다움을 나만의 굿즈로 맞춤제작', null, null, '#FAF2FF'),
('content2_accessories', '한복과 어울리는 악세사리도 보고가세요.', null, null, '#FAF2FF'),
('reviews', '한복의 상품 후기를 남기오', null, null, '#F2F2F2'),
('chatbot', 'AI 챗봇 상담', null, null, null),
('consultation', 'AI 맞춤 추천 상담하기', null, null, null),
('footer', '연화재실', '한국의 아름다움을 입다.', null, '#E8E8E8');

insert into public.coupons (code, name, discount_type, discount_value, min_order_amount, active)
values ('WELCOME10', '회원가입 10% 할인쿠폰', 'percent', 10, 0, true);

insert into public.chatbot_keywords (keyword, answer, sort_order) values
('구매안내', '원하시는 상품을 선택하고 사이즈/수량을 정하신 뒤 장바구니에 담아 주문하실 수 있어요.', 1),
('배송안내', '결제 완료 후 상품 준비를 거쳐 순차적으로 발송됩니다. 배송 현황은 배송조회 메뉴에서 확인하실 수 있어요.', 2),
('교환안내', '상품 수령 후 7일 이내, 미착용·미세탁 상태에 한해 교환이 가능합니다.', 3),
('반품/환불', '상품 수령 후 7일 이내 반품 접수가 가능하며, 반품 확인 후 영업일 기준 3~5일 이내 환불됩니다.', 4),
('사이즈 가이드', '각 상품 상세페이지의 사이즈표에서 가슴/허리/총장 실측값을 확인하실 수 있어요.', 5),
('상품추천', '어떤 컨셉을 찾으시는지 알려주시면 어울리는 컬렉션을 추천해드릴게요. 상담하기를 이용하시면 AI 맞춤 추천도 받아보실 수 있어요.', 6),
('가격/할인', '상품 가격은 상세페이지에서 실시간으로 확인하실 수 있고, 회원가입 시 10% 할인쿠폰이 자동 발급돼요.', 7),
('재고', '찾으시는 상품명과 사이즈를 알려주시면 현재 구매 가능한 재고를 확인해드릴게요.', 8),
('구성품', '한복 상품은 상세페이지의 구성품 항목에서 포함된 품목을 확인하실 수 있어요.', 9),
('굿즈', '컬렉션별로 아크릴 스탠드, 키링, 포토카드 등 다양한 굿즈를 만나보실 수 있어요.', 10),
('상담원 안내', '더 자세한 상담이 필요하시면 상담하기 버튼을 눌러 1:1 문의를 남겨주세요.', 11);

insert into public.brand_colors (name, hex_code, description, sort_order) values
('Black', '#171717', '묵직하지만 딱딱하지 않은 깊이를 표현한 색.', 1),
('White', '#FFFDF8', '은은하고 단아한 여백을 담은 색.', 2),
('Purple', '#7C4DFF', '전통과 현대의 조화를 더하는 포인트 컬러.', 3);

insert into public.banners (banner_type, title, description, media_url, media_type, sort_order, active) values
('main', '은은하게 완성되는 우아함', '부드러운 색감과 세련된 배색이 어우러져 어디서든 단아하고 품격 있는 분위기를 만들어 줍니다.', 'img/베너/0825.mp4', 'video', 1, true),
('main', '다양한 나만의 굿즈 상품', '다양한 나만의 굿즈 맞춤으로 특별한 추억을 간직하세요.', 'img/베너/0826.mp4', 'video', 2, true),
('goods', null, null, 'img/베너/배너1.png', 'image', 1, true),
('goods', null, null, 'img/베너/배너2.png', 'image', 2, true),
('goods', null, null, 'img/베너/배너3.png', 'image', 3, true),
('goods', null, null, 'img/베너/배너4.png', 'image', 4, true);
