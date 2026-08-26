-- Seed products/images/variants strictly from files that actually exist under
-- C:\ai_web\lecture1\3차과제중\img\상품 (no fabricated image paths).
-- Prices are carried over from the project's existing js/data.js mock data.
-- Stock quantities are demo seed values (no real inventory system exists yet).
do $seed$
declare
  v_collections jsonb := $json$
  [
    {
      "slug": "seolhwamukbi", "dir": "설화먹비", "code": "SHMB", "price": 189000,
      "hanbok_images": ["설화먹비01.png","설화먹비02.png","설화먹비03.png"],
      "extra_model_image": null,
      "stock": {"S":0,"M":2,"L":4},
      "accessories": [
        {"key":"hairpin","name":"비녀","file":"설화먹비 악세사리 비녀.png","price":32000,"category":"hairpin"},
        {"key":"norigae","name":"노리개","file":"설화먹비 악세사리 노리개.png","price":24000,"category":"norigae"},
        {"key":"shoes","name":"꽃신","file":"설화먹비 악세사리 꽃신.png","price":28000,"category":"flowershoes"}
      ],
      "goods": [
        {"key":"stand","name":"아크릴 스탠드","file":"아크릴스텐드.png","price":12000,"category":"acrylic-stand"},
        {"key":"pouch","name":"복주머니","file":"복주머니 손거울.png","price":15000,"category":"pouch"},
        {"key":"keyring","name":"키링","file":"키링.png","price":9000,"category":"keyring"},
        {"key":"photocard","name":"포토카드","file":"포토카드.png","price":5000,"category":"photocard"}
      ]
    },
    {
      "slug": "bombitchyeonbunhong", "dir": "봄빛연분홍", "code": "BBYB", "price": 179000,
      "hanbok_images": ["봄빛연분홍01.png","봄빛연분홍02.png","봄빛연분홍03.png"],
      "extra_model_image": "Codex 이미지 2026년 8월 25일 오후 01_41_14.png",
      "stock": {"S":3,"M":5,"L":2},
      "accessories": [],
      "goods": [
        {"key":"stand","name":"아크릴 스탠드","file":"봄빛연분홍 아크릴 스텐드.png","price":12000,"category":"acrylic-stand"},
        {"key":"pouch","name":"복주머니","file":"봄빛연분홍 복주머니.png","price":15000,"category":"pouch"},
        {"key":"keyring","name":"키링","file":"봄빛연분홍 키링.png","price":9000,"category":"keyring"},
        {"key":"photocard","name":"포토카드","file":"봄빛연분홍 포토카드.png","price":5000,"category":"photocard"}
      ]
    },
    {
      "slug": "mukhwayeonmu", "dir": "묵화연무", "code": "MHYM", "price": 195000,
      "hanbok_images": ["묵화연무01.png","묵화연무02.png","묵화연무03.png","묵화연무04.png"],
      "extra_model_image": "Codex 이미지 2026년 8월 25일 오후 01_28_49.png",
      "stock": {"S":1,"M":3,"L":6},
      "accessories": [
        {"key":"hairpin","name":"비녀","file":"묵화연무 악세사리 비녀.png","price":32000,"category":"hairpin"},
        {"key":"norigae","name":"노리개","file":"묵화연무 악세사리 노리개.png","price":24000,"category":"norigae"},
        {"key":"shoes","name":"꽃신","file":"묵화연무 악세사리 꽃신.png","price":28000,"category":"flowershoes"}
      ],
      "goods": [
        {"key":"stand","name":"아크릴 스탠드","file":"묵화연무 아크릴 스텐드.png","price":12000,"category":"acrylic-stand"},
        {"key":"pouch","name":"복주머니","file":"묵화연무 복주머니.png","price":15000,"category":"pouch"},
        {"key":"keyring","name":"키링","file":"묵화연무 키링.png","price":9000,"category":"keyring"},
        {"key":"photocard","name":"포토카드","file":"묵화연무 포토카드.png","price":5000,"category":"photocard"}
      ]
    },
    {
      "slug": "meokbitwhayeon", "dir": "먹빛화연", "code": "MBHY", "price": 185000,
      "hanbok_images": ["먹빛화연01.png","먹빛화연02.png","먹빛화연03.png"],
      "extra_model_image": null,
      "stock": {"S":4,"M":0,"L":3},
      "accessories": [],
      "goods": [
        {"key":"stand","name":"아크릴 스탠드","file":"먹빛화연 아크릴 스텐드.png","price":12000,"category":"acrylic-stand"},
        {"key":"pouch","name":"복주머니","file":"먹빛화연 복주머니.png","price":15000,"category":"pouch"},
        {"key":"keyring","name":"키링","file":"먹빛화연 키링.png","price":9000,"category":"keyring"},
        {"key":"photocard","name":"포토카드","file":"먹빛화연 포토카드.png","price":5000,"category":"photocard"}
      ]
    },
    {
      "slug": "dalbitwhayansobok", "dir": "달빛하얀소복", "code": "DBHS", "price": 199000,
      "hanbok_images": ["하얀달빛소복01.png","하얀달빛소복02.png","하얀달빛소복03.png"],
      "extra_model_image": null,
      "stock": {"S":5,"M":4,"L":1},
      "accessories": [
        {"key":"hairpin","name":"비녀","file":"하얀달빛소복 악세사리 비녀.png","price":32000,"category":"hairpin"},
        {"key":"norigae","name":"노리개","file":"하얀달빛소복 악세사리 노리개.png","price":24000,"category":"norigae"},
        {"key":"shoes","name":"꽃신","file":"하얀달빛소복 악세사리 꽃신.png","price":28000,"category":"flowershoes"}
      ],
      "goods": [
        {"key":"stand","name":"아크릴 스탠드","file":"하얀달빛소복 아크릴 스텐드.png","price":12000,"category":"acrylic-stand"},
        {"key":"pouch","name":"복주머니","file":"하얀달빛소복 복주머니.png","price":15000,"category":"pouch"},
        {"key":"keyring","name":"키링","file":"하얀달빛소복 키링.png","price":9000,"category":"keyring"},
        {"key":"photocard","name":"포토카드","file":"하얀달빛소복 포토카드.png","price":5000,"category":"photocard"}
      ]
    },
    {
      "slug": "heukcheongwolhwa", "dir": "흑청월화", "code": "HCWH", "price": 209000,
      "hanbok_images": ["흑청월화01.png","흑청월화02.png","흑청월화03.png","흑청월화04.png"],
      "extra_model_image": "Codex 이미지 2026년 8월 25일 오후 01_52_11.png",
      "stock": {"S":2,"M":2,"L":2},
      "accessories": [],
      "goods": [
        {"key":"stand","name":"아크릴 스탠드","file":"흑청월화 아크릴스텐드.png","price":12000,"category":"acrylic-stand"},
        {"key":"handbag","name":"손가방","file":"흑청월화 손가방.png","price":18000,"category":"handbag"},
        {"key":"keyring","name":"키링","file":"흑청월화 키링.png","price":9000,"category":"keyring"},
        {"key":"photocard","name":"포토카드","file":"흑청월화 포토카드.png","price":5000,"category":"photocard"}
      ]
    },
    {
      "slug": "hongyeonhwadam", "dir": "홍연화담", "code": "HYHD", "price": 195000,
      "hanbok_images": ["홍연화담01.png","홍연화담02.png","홍연화담03.png","홍연화담04.png"],
      "extra_model_image": "Codex 이미지 2026년 8월 25일 오후 01_20_03.png",
      "stock": {"S":3,"M":1,"L":5},
      "accessories": [],
      "goods": [
        {"key":"stand","name":"아크릴 스탠드","file":"아크릴스텐드.png","price":12000,"category":"acrylic-stand"},
        {"key":"pouch","name":"복주머니","file":"복주머니.png","price":15000,"category":"pouch"},
        {"key":"keyring","name":"키링","file":"키링.png","price":9000,"category":"keyring"},
        {"key":"photocard","name":"포토카드","file":"포토카드.png","price":5000,"category":"photocard"}
      ]
    }
  ]
  $json$;
  v_col jsonb;
  v_item jsonb;
  v_collection_id uuid;
  v_category_hanbok uuid;
  v_category_id uuid;
  v_product_id uuid;
  v_idx integer;
  v_img text;
  v_dir text;
  v_base text := 'img/상품';
  v_sale_price integer;
begin
  select id into v_category_hanbok from public.categories where slug = 'hanbok';

  for v_col in select * from jsonb_array_elements(v_collections)
  loop
    select id into v_collection_id from public.collections where slug = v_col->>'slug';
    v_dir := v_col->>'dir';
    v_sale_price := (v_col->>'price')::integer;

    insert into public.products (
      product_code, collection_id, category_id, name, slug, product_type,
      short_description, description, regular_price, discount_rate, sale_price,
      gender, status, is_featured, sort_order
    ) values (
      (v_col->>'code') || '-HANBOK', v_collection_id, v_category_hanbok,
      v_dir, (v_col->>'slug') || '-hanbok', 'hanbok',
      v_dir || ' 한복', v_dir || ' 컬렉션의 개량한복입니다.',
      v_sale_price, 0, v_sale_price, 'unisex', 'public', true, 1
    ) returning id into v_product_id;

    v_idx := 0;
    for v_img in select jsonb_array_elements_text(v_col->'hanbok_images')
    loop
      v_idx := v_idx + 1;
      insert into public.product_images (product_id, image_url, image_type, alt_text, sort_order, is_primary)
      values (v_product_id, v_base || '/' || v_dir || '/' || v_img, 'main', v_dir || ' 착용 이미지 ' || v_idx, v_idx, v_idx = 1);
    end loop;

    if (v_col->>'extra_model_image') is not null then
      insert into public.product_images (product_id, image_url, image_type, alt_text, sort_order)
      values (v_product_id, v_base || '/' || v_dir || '/' || (v_col->>'extra_model_image'), 'model', v_dir || ' 모델 컷', 90);
    end if;

    insert into public.product_images (product_id, image_url, image_type, alt_text, sort_order)
    values (v_product_id, v_base || '/' || v_dir || '/정면.png', 'product_only', v_dir || ' 정면 단독컷', 100);
    insert into public.product_images (product_id, image_url, image_type, alt_text, sort_order)
    values (v_product_id, v_base || '/' || v_dir || '/측면.png', 'product_only', v_dir || ' 측면 단독컷', 101);

    insert into public.product_variants (product_id, size, sku, stock_quantity, low_stock_threshold)
    values
      (v_product_id, 'S', (v_col->>'code') || '-HANBOK-S', (v_col->'stock'->>'S')::integer, 2),
      (v_product_id, 'M', (v_col->>'code') || '-HANBOK-M', (v_col->'stock'->>'M')::integer, 2),
      (v_product_id, 'L', (v_col->>'code') || '-HANBOK-L', (v_col->'stock'->>'L')::integer, 2);

    insert into public.product_size_specs (product_id, size, chest, waist, length)
    values
      (v_product_id, 'S', '82~85cm','64~68cm','128cm'),
      (v_product_id, 'M', '86~89cm','69~73cm','130cm'),
      (v_product_id, 'L', '90~94cm','74~78cm','132cm');

    for v_item in select * from jsonb_array_elements(coalesce(v_col->'accessories','[]'::jsonb))
    loop
      select id into v_category_id from public.categories where slug = v_item->>'category';
      insert into public.products (
        product_code, collection_id, category_id, name, slug, product_type,
        short_description, regular_price, discount_rate, sale_price, status, sort_order
      ) values (
        (v_col->>'code') || '-ACC-' || upper(v_item->>'key'), v_collection_id, v_category_id,
        v_dir || ' ' || (v_item->>'name'), (v_col->>'slug') || '-' || (v_item->>'key'), 'accessory',
        v_dir || ' 컬렉션 ' || (v_item->>'name'),
        (v_item->>'price')::integer, 0, (v_item->>'price')::integer, 'public', 1
      ) returning id into v_product_id;

      insert into public.product_images (product_id, image_url, image_type, alt_text, sort_order, is_primary)
      values (v_product_id, v_base || '/' || v_dir || '/' || (v_item->>'file'), 'accessory', v_dir || ' ' || (v_item->>'name'), 1, true);

      insert into public.product_variants (product_id, size, sku, stock_quantity, low_stock_threshold)
      values (v_product_id, 'FREE', (v_col->>'code') || '-ACC-' || upper(v_item->>'key') || '-FREE', 20, 5);
    end loop;

    for v_item in select * from jsonb_array_elements(coalesce(v_col->'goods','[]'::jsonb))
    loop
      select id into v_category_id from public.categories where slug = v_item->>'category';
      insert into public.products (
        product_code, collection_id, category_id, name, slug, product_type,
        short_description, regular_price, discount_rate, sale_price, status, sort_order
      ) values (
        (v_col->>'code') || '-GOODS-' || upper(v_item->>'key'), v_collection_id, v_category_id,
        v_dir || ' ' || (v_item->>'name'), (v_col->>'slug') || '-' || (v_item->>'key'), 'goods',
        v_dir || ' 컬렉션 ' || (v_item->>'name'),
        (v_item->>'price')::integer, 0, (v_item->>'price')::integer, 'public', 1
      ) returning id into v_product_id;

      insert into public.product_images (product_id, image_url, image_type, alt_text, sort_order, is_primary)
      values (v_product_id, v_base || '/' || v_dir || '/' || (v_item->>'file'), 'goods', v_dir || ' ' || (v_item->>'name'), 1, true);

      insert into public.product_variants (product_id, size, sku, stock_quantity, low_stock_threshold)
      values (v_product_id, 'FREE', (v_col->>'code') || '-GOODS-' || upper(v_item->>'key') || '-FREE', 20, 5);
    end loop;
  end loop;
end;
$seed$;

-- link each hanbok product to its own collection's accessory products as purchase add-ons
insert into public.product_addons (product_id, addon_product_id, sort_order)
select h.id, a.id, row_number() over (partition by h.id order by a.created_at)
from public.products h
join public.products a on a.collection_id = h.collection_id and a.product_type = 'accessory'
where h.product_type = 'hanbok';

-- default detail-page section order for every hanbok product
insert into public.product_detail_sections (product_id, section_type, sort_order)
select p.id, s.section_type, s.sort_order
from public.products p
cross join (values
  ('description',1),('features',2),('size',3),('components',4),
  ('care',5),('shipping',6),('guide',7),('reviews',8),('related_products',9)
) as s(section_type, sort_order)
where p.product_type = 'hanbok';
