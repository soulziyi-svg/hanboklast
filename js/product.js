/**
 * 연화재실 상품 상세페이지(product.html)
 * ?slug= 파라미터로 Supabase에서 상품 전체 정보를 조회해 렌더링합니다.
 * 장바구니/로그인 관련 공통 로직은 js/shop-common.js를 그대로 사용합니다.
 */
(async function () {
  'use strict';

  const supabaseClient = window.supabaseClient;
  const { $, $all, showToast, openModal, addToCart, renderCartModal, wireCartUI, wireAuthUI, applyAuthUI, formatWon } = window.ShopCommon;

  const PRODUCT_TYPE_LABEL = { hanbok: '한복', accessory: '액세서리', goods: '굿즈' };

  const params = new URLSearchParams(window.location.search);
  const slug = params.get('slug');

  // 관리자페이지 "미리보기": DB에 저장하지 않고 sessionStorage에 담긴 입력값만으로 이 페이지를 그대로 렌더링합니다.
  const isAdminPreview = params.get('preview') === 'admin';
  let previewData = null;
  if (isAdminPreview) {
    try { previewData = JSON.parse(sessionStorage.getItem('adminProductPreview') || 'null'); } catch (err) { previewData = null; }
    const banner = document.createElement('div');
    banner.textContent = '⚠ 관리자 미리보기 모드입니다. 저장된 내용이 아니며, 실제 구매는 진행되지 않습니다. 확인 후 이 탭을 닫아주세요.';
    banner.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:9999;background:#7C4DFF;color:#fff;text-align:center;padding:10px;font-size:13px;font-weight:700;';
    document.body.prepend(banner);
    document.body.style.paddingTop = '38px';
  }

  if (supabaseClient) {
    wireCartUI();
    wireAuthUI();
    await applyAuthUI();
  }

  if (!slug && !(isAdminPreview && previewData)) {
    $('#pdpLoading').hidden = true;
    $('#pdpNotFound').hidden = false;
    return;
  }

  const fallbackProduct = slug === 'mukhwayeonmu'
    ? createMukhwaFallbackProduct()
    : (['dalbitwhayansobok', 'dalbitwhayansobok-hanbok'].includes(slug) ? createDalbitFallbackProduct(slug) : null);
  let product = null;
  let error = null;

  if (supabaseClient && !isAdminPreview) {
    const result = await supabaseClient.from('products').select(`
      id, name, slug, product_type, short_description, description,
      regular_price, sale_price, discount_rate,
      collections ( name, slug ),
      categories ( name, slug ),
      product_images ( image_url, image_type, sort_order, is_primary ),
      product_variants ( id, size, stock_quantity, low_stock_threshold ),
      product_size_specs ( size, chest, waist, length, sleeve ),
      product_features ( title, description, sort_order ),
      product_components ( component_name, included, sort_order ),
      product_care ( material, washing, wearing_caution, storage_method ),
      product_shipping_policies ( shipping_fee, free_shipping_threshold, estimated_delivery, exchange_policy, return_policy, refund_policy )
    `)
    .eq('slug', slug)
    .eq('status', 'public')
    .maybeSingle();
    product = result.data;
    error = result.error;
  }

  if ((!product || error) && fallbackProduct) product = fallbackProduct;
  if (isAdminPreview && previewData) { product = previewData.product; error = null; }

  if (error || !product) {
    $('#pdpLoading').hidden = true;
    $('#pdpNotFound').hidden = false;
    return;
  }

  document.title = `${product.name} | 연화재실`;

  // 추가구성(악세사리 addon)은 hanbok 전용 - product_addons -> 대상 상품/재고를 별도 조회 후 합칩니다.
  let addons = [];
  if (supabaseClient && !isAdminPreview && product.product_type === 'hanbok') {
    const { data: addonLinks } = await supabaseClient
      .from('product_addons')
      .select('id, addon_product_id, special_price, sort_order')
      .eq('product_id', product.id)
      .eq('active', true)
      .order('sort_order');
    const addonProductIds = (addonLinks || []).map(a => a.addon_product_id);
    if (addonProductIds.length) {
      const { data: addonProducts } = await supabaseClient
        .from('products')
        .select('id, name, sale_price, product_variants ( id, stock_quantity )')
        .in('id', addonProductIds);
      const byId = new Map((addonProducts || []).map(p => [p.id, p]));
      addons = (addonLinks || [])
        .map(link => {
          const p = byId.get(link.addon_product_id);
          if (!p) return null;
          const variant = (p.product_variants || [])[0];
          return {
            productId: p.id,
            name: p.name,
            price: link.special_price != null ? link.special_price : p.sale_price,
            variantId: variant ? variant.id : null,
            stock: variant ? variant.stock_quantity : 0,
          };
        })
        .filter(Boolean);
    }
  }

  const { data: reviews } = (supabaseClient && !isAdminPreview) ? await supabaseClient
    .from('reviews')
    .select('id, nickname, rating, content, created_at, review_images ( image_url, alt_text ), review_tags ( tag )')
    .eq('product_id', product.id)
    .eq('is_visible', true)
    .order('created_at', { ascending: false }) : { data: [] };

  const { data: stats } = (supabaseClient && !isAdminPreview) ? await supabaseClient
    .from('product_review_stats')
    .select('average_rating, review_count')
    .eq('product_id', product.id)
    .maybeSingle() : { data: null };

  const { data: guides } = (supabaseClient && !isAdminPreview) ? await supabaseClient
    .from('wearing_guides')
    .select('step_number, title, description, media_url, media_type')
    .or(`product_id.eq.${product.id},product_id.is.null`)
    .eq('active', true)
    .order('step_number') : { data: [] };

  render(product, addons, reviews || [], stats, guides || []);

  function createMukhwaFallbackProduct() {
    const base = 'img/상품/묵화연무';
    return {
      id: null,
      name: '묵화연무',
      slug: 'mukhwayeonmu',
      product_type: 'hanbok',
      short_description: '수묵화의 농담과 한복의 유려한 선을 담은 현대 한복',
      description: '먹빛과 설백색이 겹쳐 만들어 내는 깊이, 비대칭 저고리와 풍성한 치마가 조화를 이루는 연화재실의 현대 한복입니다.',
      regular_price: 195000,
      sale_price: 195000,
      discount_rate: 0,
      collections: { name: '묵화연무', slug: 'mukhwayeonmu' },
      categories: { name: '저고리', slug: 'jeogori' },
      product_images: [
        ['묵화연무01.png', 1], ['묵화연무02.png', 2], ['묵화연무03.png', 3],
        ['묵화연무04.png', 4], ['정면.png', 5], ['측면.png', 6],
      ].map(([file, sort_order], index) => ({ image_url: `${base}/${file}?v=20260826-detail`, sort_order, is_primary: index === 0, alt_text: `묵화연무 상품 이미지 ${sort_order}` })),
      product_variants: ['S', 'M', 'L'].map(size => ({ id: null, size, stock_quantity: 1, low_stock_threshold: 0 })),
      product_size_specs: [
        { size: 'S', chest: 84, waist: 66, length: 125, sleeve: 72 },
        { size: 'M', chest: 88, waist: 70, length: 127, sleeve: 73 },
        { size: 'L', chest: 92, waist: 74, length: 129, sleeve: 74 },
      ],
      product_features: [
        { title: '비대칭 저고리', description: '전통 한복의 선을 현대적으로 재해석한 어깨선', sort_order: 1 },
        { title: '먹선 자수', description: '수묵화가 번지는 듯한 섬세한 시스루 자수', sort_order: 2 },
      ],
      product_components: [
        { component_name: '저고리', included: true, sort_order: 1 },
        { component_name: '치마', included: true, sort_order: 2 },
      ],
      product_care: { material: '폴리에스터 혼방', washing: '드라이클리닝 권장', wearing_caution: '장식과 얇은 원단의 마찰에 주의해 주세요.', storage_method: '통풍이 잘되는 곳에 걸어서 보관해 주세요.' },
      product_shipping_policies: { shipping_fee: 3000, free_shipping_threshold: 100000, estimated_delivery: '결제 후 3~7일', exchange_policy: '수령 후 7일 이내', return_policy: '착용 흔적이 없는 상품에 한함', refund_policy: '반품 확인 후 영업일 기준 3일 이내' },
    };
  }

  function createDalbitFallbackProduct(productSlug) {
    const base = 'img/상품/달빛하얀소복';
    return {
      id: null,
      name: '달빛하얀소복',
      slug: productSlug || 'dalbitwhayansobok-hanbok',
      product_type: 'hanbok',
      short_description: '달빛처럼 은은한 설백색과 먹빛 그라데이션을 담은 현대 한복',
      description: '부드러운 설백색 위에 먹빛이 번지는 듯한 치마와 단아한 저고리를 조화시킨 연화재실의 프리미엄 현대 한복입니다.',
      regular_price: 199000,
      sale_price: 199000,
      discount_rate: 0,
      collections: { name: '달빛하얀소복', slug: 'dalbitwhayansobok' },
      categories: { name: '저고리', slug: 'jeogori' },
      product_images: [
        ['하얀달빛소복01.png', 1], ['하얀달빛소복02.png', 2], ['하얀달빛소복03.png', 3],
        ['정면.png', 4], ['측면.png', 5],
      ].map(([file, sort_order], index) => ({ image_url: `${base}/${file}`, sort_order, is_primary: index === 0, alt_text: `달빛하얀소복 상품 이미지 ${sort_order}` })),
      product_variants: ['S', 'M', 'L'].map(size => ({ id: null, size, stock_quantity: 1, low_stock_threshold: 0 })),
      product_size_specs: [
        { size: 'S', chest: 84, waist: 66, length: 125, sleeve: 72 },
        { size: 'M', chest: 88, waist: 70, length: 127, sleeve: 73 },
        { size: 'L', chest: 92, waist: 74, length: 129, sleeve: 74 },
      ],
      product_features: [
        { title: '달빛 그라데이션', description: '설백색에서 먹빛으로 은은하게 번지는 치마 색감', sort_order: 1 },
        { title: '입체 꽃 자수', description: '가까이에서 볼수록 섬세한 저고리 자수와 은은한 광택', sort_order: 2 },
      ],
      product_components: [
        { component_name: '저고리', included: true, sort_order: 1 },
        { component_name: '치마', included: true, sort_order: 2 },
        { component_name: '노리개', included: true, sort_order: 3 },
      ],
      product_care: { material: '폴리에스터 혼방', washing: '드라이클리닝 권장', wearing_caution: '자수와 얇은 원단의 마찰에 주의해 주세요.', storage_method: '통풍이 잘되는 곳에 걸어서 보관해 주세요.' },
      product_shipping_policies: { shipping_fee: 3000, free_shipping_threshold: 100000, estimated_delivery: '결제 후 3~7일', exchange_policy: '수령 후 7일 이내', return_policy: '착용 흔적이 없는 상품에 한함', refund_policy: '반품 확인 후 영업일 기준 3일 이내' },
    };
  }

  function render(product, addons, reviews, stats, guides) {
    $('#pdpLoading').hidden = true;
    $('#pdpMain').hidden = false;
    $('#pdpPurchaseInfo').hidden = false;
    $('#pdpReviewsSection').hidden = false;

    renderBreadcrumb(product);
    renderGallery(product);
    renderInfo(product, stats);
    renderMukhwaEditorial(product, stats);
    renderDalbitEditorial(product, stats);

    const sizeState = renderSize(product);
    const addonState = renderAddons(addons);
    const qtyState = renderQty();

    const recompute = () => updateTotal(product, sizeState, addonState, qtyState);
    sizeState.onChange = recompute;
    addonState.onChange = recompute;
    qtyState.onChange = recompute;
    recompute();

    async function handleCart(openCartAfter) {
      if (isAdminPreview) { showToast('미리보기 모드에서는 장바구니에 담을 수 없습니다.'); return; }
      if (!supabaseClient) { showToast('현재 상품 정보 연결을 확인 중입니다. 잠시 후 다시 시도해주세요.'); return; }
      const variantId = sizeState.getVariantId();
      if (!variantId) { showToast('구매 옵션을 선택해주세요.'); return; }
      const selectedAddons = addonState.getSelected();
      const ok = await addToCart({
        productId: product.id,
        variantId,
        name: product.name,
        quantity: qtyState.getQty(),
        addons: selectedAddons.map(a => ({ productId: a.productId, variantId: a.variantId, quantity: qtyState.getQty() })),
      });
      if (ok) {
        recompute();
        if (openCartAfter) {
          openModal('cartModal');
          await renderCartModal();
        }
      }
    }
    $('#pdpAddToCartBtn').addEventListener('click', () => handleCart(false));
    $('#pdpBuyNowBtn').addEventListener('click', () => handleCart(true));

    renderTabs(product);
    renderGuide(guides);
    renderReviews(reviews, stats);
  }

  function renderDalbitEditorial(product, stats) {
    if (!['dalbitwhayansobok', 'dalbitwhayansobok-hanbok'].includes(product.slug)) return;

    const section = $('#dalbitEditorial');
    const base = 'img/상품/달빛하얀소복';
    const rating = stats && stats.review_count > 0 ? stats.average_rating : '4.9';
    const reviewCount = stats && stats.review_count > 0 ? `${stats.review_count}개의 실제 구매 후기` : '먼저 만나본 고객의 높은 만족도';
    section.hidden = false;
    section.innerHTML = `
      <section class="dalbit-hero">
        <p class="dalbit-number">01</p>
        <p class="dalbit-eyebrow">연화재실</p>
        <h2>달빛하얀소복</h2>
        <p>달빛 아래 피어난 순백의 설렘.<br>은은한 먹빛이 번지는 치마와 단아한 저고리로<br>당신의 가장 아름다운 순간을 완성합니다.</p>
        <img src="${base}/하얀달빛소복01.png" alt="한옥에서 착용한 달빛하얀소복">
      </section>

      <section class="dalbit-rating">
        <p class="dalbit-number">02</p>
        <p class="dalbit-eyebrow">고객 만족도</p>
        <div><strong>${rating}</strong><span>/ 5</span></div>
        <p class="dalbit-stars">★★★★★</p>
        <p>${reviewCount}</p>
        <div class="dalbit-review-cards">
          <article><b>★★★★★</b><p>사진보다 실제로 입었을 때 치마의 색감이 훨씬 고급스러워요.</p></article>
          <article><b>★★★★★</b><p>저고리 자수가 섬세하고 움직일 때 실루엣이 정말 아름다워요.</p></article>
          <article><b>★★★★★</b><p>전통적인 분위기와 현대적인 감각이 함께 느껴져 특별했어요.</p></article>
        </div>
      </section>

      <section class="dalbit-reasons">
        <p class="dalbit-number">03</p>
        <p class="dalbit-eyebrow">WHY DALBIT HAYAN SOBOK</p>
        <h3>왜 쇼핑할수록<br>만족스러울까요?</h3>
        <div class="dalbit-reason-grid">
          <article><span>01</span><img src="${base}/하얀달빛소복01.png" alt="달빛하얀소복 전체 실루엣"><b>사진으로 남는 우아한 실루엣</b><p>풍성하게 퍼지는 치마가 어느 각도에서도 단아한 선을 만듭니다.</p></article>
          <article><span>02</span><img src="${base}/하얀달빛소복02.png" alt="달빛하얀소복 저고리 디테일"><b>가까이에서 빛나는 섬세한 자수</b><p>은은한 광택과 입체적인 꽃 자수가 얼굴빛을 화사하게 살려줍니다.</p></article>
          <article><span>03</span><img src="${base}/하얀달빛소복03.png" alt="달빛하얀소복 뒷모습"><b>달빛처럼 번지는 먹빛 그라데이션</b><p>설백색에서 먹빛으로 이어지는 농담이 깊이 있는 분위기를 완성합니다.</p></article>
        </div>
      </section>

      <section class="dalbit-point">
        <p class="dalbit-number">04</p><p class="dalbit-eyebrow">POINT 01</p>
        <h3>은은한 색감,<br>우아한 아름다움</h3>
        <p>새하얀 저고리와 먹빛이 스며든 치마가 만나<br>빛에 따라 다른 표정과 깊이를 보여줍니다.</p>
        <img src="${base}/하얀달빛소복01.png" alt="달빛하얀소복 야외 화보">
      </section>

      <section class="dalbit-point dalbit-point--soft">
        <p class="dalbit-number">05</p><p class="dalbit-eyebrow">POINT 02</p>
        <h3>한복의 선을 그대로,<br>편안함은 더 가볍게</h3>
        <p>가볍고 부드러운 소재와 안정적인 허리선으로<br>오랜 시간 착용해도 자연스럽고 편안합니다.</p>
        <img src="${base}/하얀달빛소복02.png" alt="달빛하얀소복 옆모습과 치마선">
      </section>

      <section class="dalbit-point">
        <p class="dalbit-number">06</p><p class="dalbit-eyebrow">POINT 03</p>
        <h3>빛나는 순간을<br>더 특별하게</h3>
        <p>한옥 촬영, 기념일, 전통 행사와 웨딩 촬영까지<br>어떤 공간에서도 고운 존재감을 남깁니다.</p>
        <img src="${base}/하얀달빛소복03.png" alt="달빛하얀소복 뒷모습 화보">
        <div class="dalbit-icon-row"><span>사진 촬영</span><span>특별한 날</span><span>기념 행사</span></div>
      </section>

      <section class="dalbit-compare">
        <p class="dalbit-eyebrow">DESIGN DIFFERENCE</p>
        <h3>왜 달빛하얀소복일까요?</h3>
        <div class="dalbit-compare-grid">
          <figure><img src="${base}/정면.png" alt="달빛하얀소복 정면"><figcaption><b>달빛하얀소복</b><span>입체 자수와 먹빛 그라데이션으로 완성한 깊이 있는 디자인</span></figcaption></figure>
          <figure><img src="${base}/측면.png" alt="달빛하얀소복 측면"><figcaption><b>섬세한 측면 실루엣</b><span>허리선부터 치맛자락까지 자연스럽게 이어지는 비율</span></figcaption></figure>
        </div>
      </section>

      <section class="dalbit-details">
        <p class="dalbit-eyebrow">FABRIC & DETAIL</p>
        <h3>작은 디테일까지<br>세심하게</h3>
        <div class="dalbit-detail-grid">
          <article><img src="${base}/하얀달빛소복02.png" alt="달빛하얀소복 자수 디테일"><span>01</span><b>은은한 자수와 광택</b><p>빛을 받을 때 부드럽게 살아나는 결감과 입체 자수</p></article>
          <article><img src="${base}/하얀달빛소복03.png" alt="달빛하얀소복 원단 디테일"><span>02</span><b>가볍고 풍성한 치마</b><p>겹쳐진 얇은 원단이 움직임마다 자연스러운 볼륨을 표현</p></article>
        </div>
      </section>

      <section class="dalbit-options">
        <p class="dalbit-eyebrow">COLOR · OPTION · SIZE</p>
        <h3>나에게 맞는<br>달빛하얀소복</h3>
        <img class="dalbit-product-only" src="${base}/정면.png" alt="달빛하얀소복 정면 상품 이미지">
        <div class="dalbit-color"><i></i><div><b>설백 · 먹빛</b><p>달빛을 닮은 따뜻한 흰색과 은은한 먹빛의 조화</p></div></div>
        <div class="dalbit-option-grid">
          <figure><img src="${base}/하얀달빛소복 악세사리 비녀.png" alt="비녀"><figcaption>비녀</figcaption></figure>
          <figure><img src="${base}/하얀달빛소복 악세사리 노리개.png" alt="노리개"><figcaption>노리개</figcaption></figure>
          <figure><img src="${base}/하얀달빛소복 악세사리 꽃신.png" alt="꽃신"><figcaption>꽃신</figcaption></figure>
        </div>
        <div class="dalbit-size-note"><b>구매 전 꼭 확인하세요</b><p>상단 구매 영역에서 S · M · L 사이즈와 추가 옵션을 선택할 수 있습니다.</p><a href="#pdpMain">사이즈 선택하고 구매하기 ↑</a></div>
      </section>`;
  }

  function renderMukhwaEditorial(product, stats) {
    if (product.slug !== 'mukhwayeonmu') return;

    const section = $('#mukhwaEditorial');
    const base = 'img/상품/묵화연무';
    const rating = stats && stats.review_count > 0 ? stats.average_rating : '4.9';
    const reviewCount = stats && stats.review_count > 0 ? `${stats.review_count}개의 실제 후기` : '먼저 만나본 고객의 높은 만족도';
    section.hidden = false;
    section.innerHTML = `
      <div class="mukhwa-hero">
        <div class="mukhwa-kicker">연화재실 현대 한복 컬렉션</div>
        <h2>먹빛의 여백 위로 피어나는<br><strong>묵화연무</strong></h2>
        <p>수묵화처럼 번지는 흑백의 농담과 한복의 유려한 선을 한 벌에 담았습니다.<br>고요하지만 분명한 존재감으로 특별한 날의 장면을 완성합니다.</p>
        <img src="${base}/묵화연무02.png?v=20260826-card-fit" alt="묵화연무 정면 착용 모습">
      </div>

      <div class="mukhwa-rating">
        <p class="mukhwa-label">고객 만족도</p>
        <div><strong>${rating}</strong><span>/ 5</span></div>
        <p class="mukhwa-stars">★★★★★</p>
        <h3>사진으로 본 순간보다<br>입었을 때 더 특별한 한복</h3>
        <p>${reviewCount}</p>
      </div>

      <div class="mukhwa-reasons">
        <p class="mukhwa-label">WHY MUKHWA YEONMU</p>
        <h3>왜 묵화연무를 선택할까요?</h3>
        <article>
          <span>01</span><div><b>흑과 백이 만드는 선명한 조화</b><p>과하지 않은 무채색 배색이 얼굴빛과 실루엣을 또렷하게 살려줍니다.</p></div>
          <img src="${base}/정면.png" alt="묵화연무 정면 제품 이미지">
        </article>
        <article>
          <span>02</span><div><b>움직일 때 살아나는 겹의 아름다움</b><p>가볍게 겹친 시스루 원단이 걸음마다 먹의 농담처럼 자연스럽게 번집니다.</p></div>
          <img src="${base}/묵화연무01.png?v=20260826-card-fit" alt="묵화연무 움직임과 겹 디테일">
        </article>
        <article>
          <span>03</span><div><b>전통과 현대를 잇는 비대칭 디자인</b><p>한복의 곡선은 유지하고 비대칭 어깨선과 허리 장식으로 현대적인 인상을 더했습니다.</p></div>
          <img src="${base}/묵화연무03.png?v=20260826-card-fit" alt="묵화연무 측면 실루엣">
        </article>
      </div>

      <div class="mukhwa-story mukhwa-story--dark">
        <p class="mukhwa-label">POINT 01</p>
        <h3>고요하게 번지는<br>먹빛의 우아함</h3>
        <p>절제된 색 안에서 소재의 결, 자수의 선, 치마의 움직임이 더욱 선명하게 드러납니다.</p>
        <img src="${base}/묵화연무04.png?v=20260826-card-fit" alt="고요한 먹빛의 묵화연무 화보">
      </div>

      <div class="mukhwa-story mukhwa-story--light">
        <p class="mukhwa-label">POINT 02</p>
        <h3>전통의 선은 그대로,<br>오늘의 감각은 더 깊게</h3>
        <p>깃과 고름에서 출발한 선을 비대칭 숄더와 넓은 허리 장식으로 다시 해석했습니다.</p>
        <img src="${base}/측면.png" alt="묵화연무 측면 제품 이미지">
      </div>

      <div class="mukhwa-scenes">
        <p class="mukhwa-label">POINT 03</p>
        <h3>한옥에서도, 스튜디오에서도<br>빛나는 한 벌</h3>
        <div class="mukhwa-scenes__grid">
          <img src="${base}/묵화연무01.png?v=20260826-card-fit" alt="한옥에서 착용한 묵화연무">
          <img src="${base}/묵화연무02.png?v=20260826-card-fit" alt="자연광에서 착용한 묵화연무">
        </div>
      </div>

      <div class="mukhwa-compare">
        <p class="mukhwa-label">DESIGN DIFFERENCE</p>
        <h3>평범한 흑백 한복과<br>묵화연무는 무엇이 다를까요?</h3>
        <div class="mukhwa-compare__grid">
          <div><span>YEONHWAJAESIL</span><img src="${base}/정면.png" alt="묵화연무 정면"><b>비대칭 실루엣과 입체적인 겹</b></div>
          <div><span>DETAIL</span><img src="${base}/측면.png" alt="묵화연무 측면"><b>먹선 자수와 섬세한 허리 장식</b></div>
        </div>
      </div>

      <div class="mukhwa-details">
        <p class="mukhwa-label">FABRIC & DETAIL</p>
        <h3>가까이에서 볼수록<br>더 섬세한 이야기</h3>
        <div class="mukhwa-details__grid">
          <article><img src="${base}/묵화연무03.png?v=20260826-card-fit" alt="묵화연무 시스루 자수"><b>먹선 자수 시스루</b><p>가볍고 투명한 원단 위에 번지는 듯한 자수를 더했습니다.</p></article>
          <article><img src="${base}/묵화연무04.png?v=20260826-card-fit" alt="묵화연무 허리 장식"><b>입체적인 허리 장식</b><p>시선을 중앙으로 모아 비율을 안정적으로 잡아줍니다.</p></article>
          <article><img src="${base}/묵화연무01.png?v=20260826-card-fit" alt="묵화연무 치마 겹"><b>풍성한 치마의 겹</b><p>흰빛과 먹빛 원단을 겹쳐 움직임마다 깊이가 달라집니다.</p></article>
        </div>
      </div>

      <div class="mukhwa-options">
        <p class="mukhwa-label">COLOR, OPTION & SIZE</p>
        <h3>나에게 맞는 묵화연무</h3>
        <div class="mukhwa-options__palette"><i></i><div><b>COLOR</b><p>먹색 · 설백색</p></div></div>
        <div class="mukhwa-options__items">
          <figure><img src="${base}/묵화연무 악세사리 비녀.png" alt="묵화연무 비녀"><figcaption>비녀</figcaption></figure>
          <figure><img src="${base}/묵화연무 악세사리 노리개.png" alt="묵화연무 노리개"><figcaption>노리개</figcaption></figure>
          <figure><img src="${base}/묵화연무 악세사리 꽃신.png" alt="묵화연무 꽃신"><figcaption>꽃신</figcaption></figure>
        </div>
        <div class="mukhwa-size-guide">
          <b>SIZE</b><p>상단 구매 영역에서 S · M · L 중 선택할 수 있습니다.</p>
          <a href="#pdpMain">구매 옵션 확인하기 ↑</a>
        </div>
      </div>`;
  }

  function renderBreadcrumb(product) {
    const typeLabel = PRODUCT_TYPE_LABEL[product.product_type] || '';
    $('#pdpBreadcrumb').textContent = `홈 - ${typeLabel} - ${product.name}`;
    $('#pdpPath').textContent = `연화재실 - ${typeLabel} - ${product.collections ? product.collections.name : ''}`;
  }

  function renderGallery(product) {
    const images = (product.product_images || []).slice().sort((a, b) => a.sort_order - b.sort_order);
    const mainImg = $('#pdpMainImage');
    const thumbs = $('#pdpThumbs');
    const progress = $('#pdpGalleryProgress');
    thumbs.innerHTML = '';

    if (!images.length) { mainImg.alt = product.name; return; }

    function show(idx) {
      mainImg.src = images[idx].image_url;
      mainImg.alt = images[idx].alt_text || product.name;
      progress.textContent = `[${idx + 1}/${images.length}]`;
      $all('img', thumbs).forEach((t, i) => t.classList.toggle('is-active', i === idx));
    }

    images.forEach((img, i) => {
      const t = document.createElement('img');
      t.src = img.image_url;
      t.alt = img.alt_text || product.name;
      t.addEventListener('click', () => show(i));
      thumbs.appendChild(t);
    });
    show(0);
  }

  function renderInfo(product, stats) {
    $('#pdpName').textContent = product.name;
    $('#pdpDesc').textContent = product.description || product.short_description || '';
    $('#pdpPrice').textContent = formatWon(product.sale_price);
    if (stats && stats.review_count > 0) {
      $('#pdpRating').textContent = `★ ${stats.average_rating} (${stats.review_count})`;
    } else {
      $('#pdpRating').textContent = '아직 등록된 후기가 없어요';
    }
  }

  function renderSize(product) {
    const wrap = $('#pdpSizeWrap');
    const btnWrap = $('#pdpSizeButtons');
    const variants = (product.product_variants || []);
    let selectedVariantId = null;
    const state = { onChange: null, getVariantId: () => selectedVariantId };

    if (product.product_type !== 'hanbok') {
      // FREE 사이즈 단일 옵션 - 버튼 없이 자동 선택
      selectedVariantId = variants[0] ? variants[0].id : null;
      return state;
    }

    wrap.hidden = false;
    btnWrap.innerHTML = '';
    const sizeOrder = ['S', 'M', 'L'];
    const bySize = new Map(variants.map(v => [v.size, v]));
    sizeOrder.forEach(size => {
      const v = bySize.get(size);
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.textContent = size;
      if (!v || v.stock_quantity <= 0) {
        btn.disabled = true;
      } else {
        btn.addEventListener('click', () => {
          selectedVariantId = v.id;
          $all('button', btnWrap).forEach(b => b.classList.remove('is-active'));
          btn.classList.add('is-active');
          if (state.onChange) state.onChange();
        });
      }
      btnWrap.appendChild(btn);
    });
    // 재고가 있는 첫 사이즈를 기본 선택
    const firstAvailable = sizeOrder.map(s => bySize.get(s)).find(v => v && v.stock_quantity > 0);
    if (firstAvailable) {
      selectedVariantId = firstAvailable.id;
      const idx = sizeOrder.indexOf(firstAvailable.size);
      $all('button', btnWrap)[idx].classList.add('is-active');
    }
    return state;
  }

  function renderAddons(addons) {
    const wrap = $('#pdpAddonWrap');
    const listEl = $('#pdpAddons');
    const state = { onChange: null, getSelected: () => [] };
    if (!addons.length) return state;

    wrap.hidden = false;
    listEl.innerHTML = '';
    const checked = new Set();
    addons.forEach(a => {
      const label = document.createElement('label');
      const soldOut = !a.variantId || a.stock <= 0;
      label.innerHTML = `
        <span><input type="checkbox" ${soldOut ? 'disabled' : ''}> ${a.name}${soldOut ? ' (품절)' : ''}</span>
        <span class="addon-price">+${formatWon(a.price)}</span>`;
      const checkbox = label.querySelector('input');
      checkbox.addEventListener('change', () => {
        if (checkbox.checked) checked.add(a.productId); else checked.delete(a.productId);
        if (state.onChange) state.onChange();
      });
      listEl.appendChild(label);
    });
    state.getSelected = () => addons.filter(a => checked.has(a.productId));
    return state;
  }

  function renderQty() {
    let qty = 1;
    const valueEl = $('#pdpQtyValue');
    const state = { onChange: null, getQty: () => qty };
    $('#pdpQtyMinus').addEventListener('click', () => {
      if (qty <= 1) return;
      qty -= 1; valueEl.textContent = qty;
      if (state.onChange) state.onChange();
    });
    $('#pdpQtyPlus').addEventListener('click', () => {
      qty += 1; valueEl.textContent = qty;
      if (state.onChange) state.onChange();
    });
    return state;
  }

  function updateTotal(product, sizeState, addonState, qtyState) {
    const addonUnitSum = addonState.getSelected().reduce((s, a) => s + a.price, 0);
    const total = (product.sale_price + addonUnitSum) * qtyState.getQty();
    $('#pdpTotalPrice').textContent = formatWon(total);
  }

  function renderTabs(product) {
    const tabs = $all('.pdp-tab');
    const panels = $all('.pdp-tab-panel');
    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        tabs.forEach(t => t.classList.remove('is-active'));
        tab.classList.add('is-active');
        panels.forEach(p => p.hidden = p.dataset.panel !== tab.dataset.tab);
      });
    });

    const features = (product.product_features || []).slice().sort((a, b) => a.sort_order - b.sort_order);
    const components = (product.product_components || []).slice().sort((a, b) => a.sort_order - b.sort_order);
    const sizeSpecs = product.product_size_specs || [];

    const featureHtml = features.length
      ? `<ul class="pdp-feature-list">${features.map((f, i) => `<li><b>0${i + 1}. ${f.title}</b> — ${f.description || ''}</li>`).join('')}</ul>`
      : '';
    const componentHtml = components.length
      ? `<h4>기본 구성품</h4><div class="pdp-component-list">${components.map(c => `<span>${c.component_name}</span>`).join('')}</div>`
      : '';
    const sizeTableHtml = sizeSpecs.length
      ? `<h4>사이즈표</h4><table class="pdp-size-table"><thead><tr><th>사이즈</th><th>가슴</th><th>허리</th><th>총장</th></tr></thead><tbody>
          ${sizeSpecs.map(s => `<tr><td>${s.size}</td><td>${s.chest || '-'}</td><td>${s.waist || '-'}</td><td>${s.length || '-'}</td></tr>`).join('')}
         </tbody></table>`
      : '';
    $('[data-panel="detail"]').innerHTML =
      `<p>${(product.description || product.short_description || '등록된 상세설명이 없습니다.').replace(/\n/g, '<br>')}</p>${featureHtml}${componentHtml}${sizeTableHtml}`
      || '<p>등록된 상세정보가 없습니다.</p>';

    const care = product.product_care;
    $('[data-panel="care"]').innerHTML = care
      ? `<h4>소재</h4><p>${care.material || '-'}</p>
         <h4>세탁법</h4><p>${care.washing || '-'}</p>
         <h4>착용 주의사항</h4><p>${care.wearing_caution || '-'}</p>
         ${care.storage_method ? `<h4>보관 방법</h4><p>${care.storage_method}</p>` : ''}`
      : '<p>등록된 소재/관리 정보가 없습니다.</p>';

    const shipping = product.product_shipping_policies;
    $('[data-panel="shipping"]').innerHTML = shipping
      ? `<h4>배송비</h4><p>${shipping.shipping_fee > 0 ? formatWon(shipping.shipping_fee) : '무료배송'}${shipping.free_shipping_threshold ? ` (${formatWon(shipping.free_shipping_threshold)} 이상 구매 시 무료배송)` : ''}</p>
         <h4>배송 안내</h4><p>${shipping.estimated_delivery || '-'}</p>
         <h4>교환 안내</h4><p>${shipping.exchange_policy || '-'}</p>
         <h4>반품 안내</h4><p>${shipping.return_policy || '-'}</p>
         <h4>환불 안내</h4><p>${shipping.refund_policy || '-'}</p>`
      : '<p>등록된 배송/교환 정보가 없습니다.</p>';
  }

  function renderGuide(guides) {
    if (!guides.length) return; // 실제 등록된 착용가이드가 없으면 섹션 자체를 숨김 (임의 생성 금지)
    $('#pdpGuideSection').hidden = false;
    const wrap = $('#pdpGuideSteps');
    wrap.innerHTML = '';
    guides.forEach(g => {
      const step = document.createElement('div');
      step.className = 'pdp-guide-step';
      const media = g.media_type === 'video'
        ? `<video src="${g.media_url}" muted loop playsinline autoplay></video>`
        : `<img src="${g.media_url}" alt="${g.title || ''}">`;
      step.innerHTML = `${media}<p>${g.step_number ? `0${g.step_number}. ` : ''}${g.title || ''}</p>`;
      wrap.appendChild(step);
    });
  }

  function renderReviews(reviews, stats) {
    $('#pdpReviewsTitle').textContent = stats && stats.review_count > 0
      ? `이 상품의 후기 (★ ${stats.average_rating} · ${stats.review_count}건)`
      : '이 상품의 후기';
    const grid = $('#pdpReviews');
    if (!reviews.length) {
      grid.innerHTML = '<p class="pdp-reviews-empty">아직 등록된 후기가 없습니다. 첫 구매 후기를 남겨보세요!</p>';
      return;
    }
    grid.innerHTML = '';
    reviews.forEach(r => {
      const full = Math.floor(r.rating);
      const half = r.rating % 1 !== 0;
      const stars = '★'.repeat(full) + (half ? '⯪' : '') + '☆'.repeat(Math.max(0, 5 - full - (half ? 1 : 0)));
      const tags = (r.review_tags || []).map(t => '#' + t.tag).join(' ');
      const date = new Date(r.created_at).toLocaleDateString('ko-KR');
      const div = document.createElement('div');
      div.className = 'review-card';
      div.innerHTML = `
        <div class="review-card__head"><span>${r.nickname}</span><span>${date}</span></div>
        <div class="review-card__rating">${stars} ${r.rating}</div>
        <p class="review-card__text">"${r.content}"</p>
        <div class="review-card__tags">${tags}</div>`;
      grid.appendChild(div);
    });
  }
})();
