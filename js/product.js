/**
 * 연화재실 상품 상세페이지(product.html)
 * ?slug= 파라미터로 Supabase에서 상품 전체 정보를 조회해 렌더링합니다.
 * 장바구니/로그인 관련 공통 로직은 js/shop-common.js를 그대로 사용합니다.
 */
(async function () {
  'use strict';

  const supabaseClient = window.supabaseClient;
  const { $, $all, showToast, addToCart, wireCartUI, wireAuthUI, applyAuthUI, formatWon } = window.ShopCommon;

  const PRODUCT_TYPE_LABEL = { hanbok: '한복', accessory: '액세서리', goods: '굿즈' };

  const params = new URLSearchParams(window.location.search);
  const slug = params.get('slug');

  wireCartUI();
  wireAuthUI();
  await applyAuthUI();

  if (!slug) {
    $('#pdpLoading').hidden = true;
    $('#pdpNotFound').hidden = false;
    return;
  }

  const { data: product, error } = await supabaseClient
    .from('products')
    .select(`
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

  if (error || !product) {
    $('#pdpLoading').hidden = true;
    $('#pdpNotFound').hidden = false;
    return;
  }

  document.title = `${product.name} | 연화재실`;

  // 추가구성(악세사리 addon)은 hanbok 전용 - product_addons -> 대상 상품/재고를 별도 조회 후 합칩니다.
  let addons = [];
  if (product.product_type === 'hanbok') {
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

  const { data: reviews } = await supabaseClient
    .from('reviews')
    .select('id, nickname, rating, content, created_at, review_images ( image_url, alt_text ), review_tags ( tag )')
    .eq('product_id', product.id)
    .eq('is_visible', true)
    .order('created_at', { ascending: false });

  const { data: stats } = await supabaseClient
    .from('product_review_stats')
    .select('average_rating, review_count')
    .eq('product_id', product.id)
    .maybeSingle();

  const { data: guides } = await supabaseClient
    .from('wearing_guides')
    .select('step_number, title, description, media_url, media_type')
    .or(`product_id.eq.${product.id},product_id.is.null`)
    .eq('active', true)
    .order('step_number');

  render(product, addons, reviews || [], stats, guides || []);

  function render(product, addons, reviews, stats, guides) {
    $('#pdpLoading').hidden = true;
    $('#pdpMain').hidden = false;
    $('#pdpPurchaseInfo').hidden = false;
    $('#pdpReviewsSection').hidden = false;

    renderBreadcrumb(product);
    renderGallery(product);
    renderInfo(product, stats);

    const sizeState = renderSize(product);
    const addonState = renderAddons(addons);
    const qtyState = renderQty();

    const recompute = () => updateTotal(product, sizeState, addonState, qtyState);
    sizeState.onChange = recompute;
    addonState.onChange = recompute;
    qtyState.onChange = recompute;
    recompute();

    $('#pdpAddToCartBtn').addEventListener('click', async () => {
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
      if (ok) recompute();
    });

    renderTabs(product);
    renderGuide(guides);
    renderReviews(reviews, stats);
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
