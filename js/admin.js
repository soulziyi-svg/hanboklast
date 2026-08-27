/**
 * 연화재실 admin.js
 * 관리자페이지(admin.html) 전용 로직. profiles.role = 'admin' 인 계정만 접근 가능.
 * 모든 쓰기 작업은 Supabase RLS(is_admin())가 서버측에서도 다시 검증합니다.
 */
(function () {
  'use strict';

  const supabaseClient = window.supabaseClient;
  const { $, $all, showToast, openModal, closeModal, getCurrentSession, formatWon } = window.ShopCommon;

  let CURRENT_ADMIN = null;
  let COLLECTIONS_CACHE = [];
  let CATEGORIES_CACHE = [];
  let productModalObserver = null;

  /* ================= 공용 유틸 ================= */
  function openAdminModal(html) {
    $('#adminModalBody').innerHTML = html;
    openModal('adminModal');
  }
  function closeAdminModal() { closeModal('adminModal'); }

  async function ok(promise) {
    const { error } = await promise;
    if (error) { showToast('저장 실패: ' + error.message); return false; }
    return true;
  }

  async function logAdmin(action, targetType, targetId, description) {
    if (!CURRENT_ADMIN) return;
    try {
      await supabaseClient.from('admin_logs').insert({
        admin_user_id: CURRENT_ADMIN.id, action, target_type: targetType,
        target_id: targetId || null, description: description || null,
      });
    } catch (err) { /* 로그 실패는 화면 동작을 막지 않음 */ }
  }
  function esc(v) { return (v == null ? '' : String(v)).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
  function fmtDate(v) { return v ? new Date(v).toLocaleDateString('ko-KR') : ''; }
  function fmtDateTime(v) { return v ? new Date(v).toLocaleString('ko-KR') : ''; }
  function todayRange() {
    const start = new Date(); start.setHours(0, 0, 0, 0);
    const end = new Date(start); end.setDate(end.getDate() + 1);
    return { start, end };
  }
  function optionsHtml(list, current, labelFn) {
    return list.map(v => `<option value="${esc(typeof v === 'object' ? v.value : v)}" ${current === (typeof v === 'object' ? v.value : v) ? 'selected' : ''}>${esc(typeof v === 'object' ? v.label : (labelFn ? labelFn(v) : v))}</option>`).join('');
  }

  const PRODUCT_STATUS = [
    { value: 'draft', label: '작성중' }, { value: 'public', label: '공개' },
    { value: 'soldout', label: '품절' }, { value: 'hidden', label: '숨김' },
  ];
  const PRODUCT_TYPE = [
    { value: 'hanbok', label: '한복' }, { value: 'accessory', label: '악세사리' }, { value: 'goods', label: '굿즈' },
  ];
  const IMAGE_TYPE = [
    { value: 'main', label: '대표' }, { value: 'thumbnail', label: '썸네일' }, { value: 'model', label: '착용컷' },
    { value: 'product_only', label: '상품단독' }, { value: 'detail', label: '상세' },
    { value: 'component', label: '구성품' }, { value: 'accessory', label: '악세사리' }, { value: 'goods', label: '굿즈' },
  ];
  const SIZE_OPTS = ['S', 'M', 'L', 'FREE', '220', '230', '240'];
  const DETAIL_SECTION_TYPE = ['description', 'features', 'model_images', 'video', 'size', 'components', 'care', 'shipping', 'guide', 'reviews', 'related_products'];
  const ORDER_STATUS = [
    { value: 'payment_pending', label: '결제대기' }, { value: 'paid', label: '결제완료' },
    { value: 'preparing', label: '상품준비중' }, { value: 'shipping', label: '배송중' },
    { value: 'delivered', label: '배송완료' }, { value: 'confirmed', label: '구매확정' },
    { value: 'cancel_requested', label: '취소요청' }, { value: 'cancelled', label: '취소완료' },
    { value: 'exchange_requested', label: '교환요청' }, { value: 'return_requested', label: '반품요청' },
    { value: 'returned', label: '반품완료' }, { value: 'refunded', label: '환불완료' },
  ];
  const SHIPMENT_STATUS = [{ value: 'preparing', label: '상품준비중' }, { value: 'shipping', label: '배송중' }, { value: 'delivered', label: '배송완료' }];
  const CLAIM_TYPE = [{ value: 'cancel', label: '취소' }, { value: 'exchange', label: '교환' }, { value: 'return', label: '반품' }, { value: 'refund', label: '환불' }];
  const CLAIM_STATUS = [{ value: 'requested', label: '요청됨' }, { value: 'reviewing', label: '검토중' }, { value: 'approved', label: '승인' }, { value: 'rejected', label: '반려' }, { value: 'completed', label: '완료' }];
  function orderStatusLabel(v) { const f = ORDER_STATUS.find(o => o.value === v); return f ? f.label : v; }
  function claimStatusLabel(v) { const f = CLAIM_STATUS.find(o => o.value === v); return f ? f.label : v; }
  function claimTypeLabel(v) { const f = CLAIM_TYPE.find(o => o.value === v); return f ? f.label : v; }

  /* ================= 인증 게이트 ================= */
  async function init() {
    const session = await getCurrentSession();
    if (!session) return denyAccess();
    const { data: profile } = await supabaseClient.from('profiles').select('id, role, name, email').eq('id', session.user.id).single();
    if (!profile || profile.role !== 'admin') return denyAccess();
    CURRENT_ADMIN = profile;
    $('#adminGate').hidden = true;
    $('#adminShell').hidden = false;
    $('#adminUserLabel').textContent = `${profile.name || profile.email} 님 (관리자)`;

    const [{ data: collections }, { data: categories }] = await Promise.all([
      supabaseClient.from('collections').select('id, name, slug, description, thumbnail_url, sort_order, active').order('sort_order'),
      supabaseClient.from('categories').select('id, parent_id, name, slug, sort_order, active').order('sort_order'),
    ]);
    COLLECTIONS_CACHE = collections || [];
    CATEGORIES_CACHE = categories || [];

    wireNav();
    loadDashboard();
  }
  function denyAccess() {
    $('#adminGate').innerHTML = '관리자 권한이 없습니다. 잠시 후 메인 화면으로 이동합니다.';
    setTimeout(() => { window.location.href = 'index.html'; }, 2500);
  }

  const TAB_TITLES = {
    dashboard: '대시보드', calendar: '주문/출고 캘린더', products: '상품관리', inventory: '재고현황',
    orders: '주문관리', claims: '취소/교환/반품 관리', reviews: '후기관리', categories: '카테고리/컬렉션 관리',
    coupons: '쿠폰관리', banners: '배너관리', content: '사이트 콘텐츠', inquiries: '문의관리',
    members: '회원관리', logs: '관리자 로그',
  };
  const TAB_LOADERS = {
    dashboard: loadDashboard, calendar: loadCalendar, products: loadProducts, inventory: loadInventory,
    orders: loadOrders, claims: loadClaims, reviews: loadReviews, categories: loadCategories,
    coupons: loadCoupons, banners: loadBanners, content: loadContent, inquiries: loadInquiries,
    members: loadMembers, logs: loadLogs,
  };
  function wireNav() {
    $all('.admin-nav button[data-tab]').forEach(btn => btn.addEventListener('click', () => switchTab(btn.dataset.tab)));
    $('#adminBackBtn').addEventListener('click', () => { window.location.href = 'index.html'; });
  }
  function switchTab(tab) {
    $all('.admin-nav button[data-tab]').forEach(b => b.classList.toggle('is-active', b.dataset.tab === tab));
    $all('.admin-tab').forEach(s => s.classList.toggle('is-active', s.id === 'tab-' + tab));
    $('#adminTabTitle').textContent = TAB_TITLES[tab];
    TAB_LOADERS[tab]();
  }

  /* ================= 1. 대시보드 ================= */
  async function loadDashboard() {
    const el = $('#tab-dashboard');
    el.innerHTML = '<p class="admin-empty">불러오는 중...</p>';
    const { start: todayStart, end: todayEnd } = todayRange();
    const monthStart = new Date(todayStart.getFullYear(), todayStart.getMonth(), 1);

    const [
      totalProducts, publicProducts, variantsRes, ordersTodayRes, ordersMonthRes,
      shippingRes, deliveredRes, shippedTodayRes, pendingInquiriesRes, reviewsRes,
    ] = await Promise.all([
      supabaseClient.from('products').select('id', { count: 'exact', head: true }),
      supabaseClient.from('products').select('id', { count: 'exact', head: true }).eq('status', 'public'),
      supabaseClient.from('product_variants').select('product_id, stock_quantity, low_stock_threshold, active'),
      supabaseClient.from('orders').select('total_amount, payment_status').gte('ordered_at', todayStart.toISOString()).lt('ordered_at', todayEnd.toISOString()),
      supabaseClient.from('orders').select('total_amount, payment_status').gte('ordered_at', monthStart.toISOString()),
      supabaseClient.from('shipments').select('id', { count: 'exact', head: true }).eq('status', 'shipping'),
      supabaseClient.from('shipments').select('id', { count: 'exact', head: true }).eq('status', 'delivered'),
      supabaseClient.from('shipments').select('id', { count: 'exact', head: true }).gte('shipped_at', todayStart.toISOString()).lt('shipped_at', todayEnd.toISOString()),
      supabaseClient.from('inquiries').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
      supabaseClient.from('reviews').select('id, review_replies ( id )'),
    ]);

    const byProduct = {};
    (variantsRes.data || []).forEach(v => {
      if (!v.active) return;
      (byProduct[v.product_id] = byProduct[v.product_id] || []).push(v);
    });
    let soldoutCount = 0, lowStockCount = 0;
    Object.values(byProduct).forEach(vs => {
      const allZero = vs.every(v => v.stock_quantity === 0);
      if (allZero) { soldoutCount++; return; }
      if (vs.some(v => v.stock_quantity > 0 && v.stock_quantity <= v.low_stock_threshold)) lowStockCount++;
    });

    const ordersToday = ordersTodayRes.data || [];
    const ordersMonth = ordersMonthRes.data || [];
    const paidToday = ordersToday.filter(o => o.payment_status === 'paid');
    const paidMonth = ordersMonth.filter(o => o.payment_status === 'paid');
    const revenueToday = paidToday.reduce((s, o) => s + Number(o.total_amount), 0);
    const revenueMonth = paidMonth.reduce((s, o) => s + Number(o.total_amount), 0);
    const unansweredReviews = (reviewsRes.data || []).filter(r => !r.review_replies || r.review_replies.length === 0).length;

    const cards = [
      ['전체 상품', totalProducts.count || 0], ['판매중', publicProducts.count || 0],
      ['품절', soldoutCount], ['재고부족', lowStockCount],
      ['오늘 주문', ordersToday.length], ['오늘 결제완료', paidToday.length],
      ['오늘 출고', shippedTodayRes.count || 0], ['배송중', shippingRes.count || 0], ['배송완료', deliveredRes.count || 0],
      ['오늘 매출', formatWon(revenueToday), true], ['이번달 매출', formatWon(revenueMonth), true],
      ['미답변 문의', pendingInquiriesRes.count || 0], ['미답변 후기', unansweredReviews],
    ];
    el.innerHTML = `<div class="admin-cards">${cards.map(([label, value, accent]) => `
      <div class="admin-card"><div class="admin-card__label">${label}</div><div class="admin-card__value${accent ? ' is-accent' : ''}">${value}</div></div>`).join('')}</div>`;
  }

  /* ================= 2. 주문/출고 캘린더 ================= */
  let calState = null;
  async function loadCalendar() {
    const now = new Date();
    if (!calState) calState = { year: now.getFullYear(), month: now.getMonth() };
    await renderCalendar();
  }
  async function renderCalendar() {
    const el = $('#tab-calendar');
    const { year, month } = calState;
    const monthStart = new Date(year, month, 1);
    const monthEnd = new Date(year, month + 1, 1);

    const [{ data: orders }, { data: shipments }] = await Promise.all([
      supabaseClient.from('orders').select('id, order_number, customer_name, ordered_at, order_status, order_items ( product_name_snapshot, option_snapshot )')
        .gte('ordered_at', monthStart.toISOString()).lt('ordered_at', monthEnd.toISOString()),
      supabaseClient.from('shipments').select('id, order_id, status, shipped_at, delivered_at')
        .or(`and(shipped_at.gte.${monthStart.toISOString()},shipped_at.lt.${monthEnd.toISOString()}),and(delivered_at.gte.${monthStart.toISOString()},delivered_at.lt.${monthEnd.toISOString()})`),
    ]);

    const days = {};
    function dayKey(d) { return new Date(d).toISOString().slice(0, 10); }
    function ensureDay(k) { return (days[k] = days[k] || { orderCount: 0, shipCount: 0, deliverCount: 0, orders: [] }); }
    (orders || []).forEach(o => {
      const k = dayKey(o.ordered_at);
      const d = ensureDay(k);
      d.orderCount++;
      d.orders.push(o);
    });
    (shipments || []).forEach(s => {
      if (s.shipped_at && s.shipped_at >= monthStart.toISOString() && s.shipped_at < monthEnd.toISOString()) ensureDay(dayKey(s.shipped_at)).shipCount++;
      if (s.delivered_at && s.delivered_at >= monthStart.toISOString() && s.delivered_at < monthEnd.toISOString()) ensureDay(dayKey(s.delivered_at)).deliverCount++;
    });

    const firstWeekday = monthStart.getDay();
    const totalDays = new Date(year, month + 1, 0).getDate();
    const todayKey = dayKey(new Date());
    let cells = '';
    for (let i = 0; i < firstWeekday; i++) cells += '<div class="admin-cal__cell is-empty"></div>';
    for (let d = 1; d <= totalDays; d++) {
      const k = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const info = days[k];
      cells += `<div class="admin-cal__cell${k === todayKey ? ' is-today' : ''}" data-day="${k}">
        <div class="admin-cal__date">${d}</div>
        ${info ? `<p>주문 ${info.orderCount}</p><p>출고 ${info.shipCount}</p><p>배송완료 ${info.deliverCount}</p>` : ''}
      </div>`;
    }

    el.innerHTML = `
      <div class="admin-cal-head">
        <button class="admin-btn admin-btn--ghost admin-btn--sm" id="calPrev">‹ 이전달</button>
        <strong>${year}년 ${month + 1}월</strong>
        <button class="admin-btn admin-btn--ghost admin-btn--sm" id="calNext">다음달 ›</button>
      </div>
      <div class="admin-cal">
        ${['일','월','화','수','목','금','토'].map(d => `<div class="admin-cal__dow">${d}</div>`).join('')}
        ${cells}
      </div>
      <div class="admin-cal-detail" id="calDetail">날짜를 클릭하면 해당일의 주문 목록을 볼 수 있습니다.</div>`;

    $('#calPrev').addEventListener('click', () => { calState.month--; if (calState.month < 0) { calState.month = 11; calState.year--; } renderCalendar(); });
    $('#calNext').addEventListener('click', () => { calState.month++; if (calState.month > 11) { calState.month = 0; calState.year++; } renderCalendar(); });
    $all('.admin-cal__cell[data-day]').forEach(cell => cell.addEventListener('click', () => {
      const info = days[cell.dataset.day];
      const detail = $('#calDetail');
      if (!info || !info.orders.length) { detail.innerHTML = `<p class="admin-empty">${cell.dataset.day} 주문 내역이 없습니다.</p>`; return; }
      detail.innerHTML = `<strong>${cell.dataset.day}</strong>` + info.orders.map(o => {
        const first = (o.order_items || [])[0];
        const more = (o.order_items || []).length > 1 ? ` 외 ${o.order_items.length - 1}건` : '';
        return `<div class="admin-order-card">
          <b>#${esc(o.order_number)}</b> ${esc(o.customer_name)}<br>
          ${first ? esc(first.product_name_snapshot) + (first.option_snapshot ? ' / ' + esc(JSON.stringify(first.option_snapshot)) : '') : ''}${more}<br>
          <span class="admin-badge">${orderStatusLabel(o.order_status)}</span>
        </div>`;
      }).join('');
    }));
  }

  /* ================= 3. 상품관리 ================= */
  let productsCache = [];
  async function loadProducts() {
    const el = $('#tab-products');
    el.innerHTML = '<p class="admin-empty">불러오는 중...</p>';
    const { data } = await supabaseClient
      .from('products')
      .select('id, product_code, name, sale_price, discount_rate, status, sort_order, collections ( name ), categories ( name ), product_images ( image_url, is_primary )')
      .order('name');
    productsCache = data || [];
    renderProductsTable(productsCache);
  }
  function renderProductsTable(list) {
    const el = $('#tab-products');
    const rows = list.map(p => {
      const img = (p.product_images || []).find(i => i.is_primary) || (p.product_images || [])[0];
      const statusInfo = PRODUCT_STATUS.find(s => s.value === p.status);
      const badgeCls = p.status === 'public' ? 'admin-badge--green' : p.status === 'soldout' ? 'admin-badge--red' : 'admin-badge--gray';
      return `<tr>
        <td>${img ? `<img src="${esc(img.image_url)}" alt="" style="width:40px;height:40px;object-fit:cover;">` : ''}</td>
        <td class="wrap">${esc(p.name)}</td>
        <td>${esc(p.product_code)}</td>
        <td>${esc(p.collections ? p.collections.name : '')}</td>
        <td>${esc(p.categories ? p.categories.name : '')}</td>
        <td>${formatWon(p.sale_price)}</td>
        <td>${p.discount_rate}%</td>
        <td><span class="admin-badge ${badgeCls}">${statusInfo ? statusInfo.label : p.status}</span></td>
        <td><button class="admin-btn admin-btn--sm admin-btn--ghost" data-edit="${p.id}">수정</button>
        <button class="admin-btn admin-btn--sm admin-btn--danger" data-del="${p.id}">삭제</button></td>
      </tr>`;
    }).join('');
    el.innerHTML = `
      <div class="admin-toolbar">
        <input type="search" id="productSearch" placeholder="상품명/코드 검색">
        <button class="admin-btn admin-btn--purple" id="productAddBtn">+ 상품등록</button>
      </div>
      <div class="admin-table-wrap"><table class="admin-table">
        <thead><tr><th></th><th>상품명</th><th>코드</th><th>컬렉션</th><th>카테고리</th><th>판매가</th><th>할인율</th><th>상태</th><th>관리</th></tr></thead>
        <tbody>${rows || '<tr><td colspan="9" class="admin-empty">등록된 상품이 없습니다.</td></tr>'}</tbody>
      </table></div>`;
    $('#productAddBtn').addEventListener('click', () => openProductModal(null));
    $all('[data-edit]').forEach(b => b.addEventListener('click', () => openProductModal(b.dataset.edit)));
    $all('[data-del]').forEach(b => b.addEventListener('click', () => deleteProduct(b.dataset.del)));
    $('#productSearch').addEventListener('input', e => {
      const q = e.target.value.trim().toLowerCase();
      const filtered = !q ? productsCache : productsCache.filter(p => p.name.toLowerCase().includes(q) || (p.product_code || '').toLowerCase().includes(q));
      renderProductsTable(filtered);
      $('#productSearch').value = e.target.value;
      $('#productSearch').focus();
    });
  }
  async function deleteProduct(id) {
    const p = productsCache.find(x => x.id === id);
    if (!confirm(`"${p ? p.name : ''}" 상품을 삭제할까요?`)) return;
    const { error } = await supabaseClient.from('products').delete().eq('id', id);
    if (error) {
      await supabaseClient.from('products').update({ status: 'hidden' }).eq('id', id);
      showToast('주문 이력이 있어 완전 삭제 대신 "숨김" 처리했습니다.');
      await logAdmin('product_hide', 'product', id, `삭제 대신 숨김 처리: ${p ? p.name : id}`);
    } else {
      showToast('상품이 삭제되었습니다.');
      await logAdmin('product_delete', 'product', id, p ? p.name : id);
    }
    loadProducts();
  }

  async function openProductModal(productId) {
    const isEdit = !!productId;
    let product = null, images = [], variants = [], components = [], features = [], sizeSpecs = [], care = null, shipping = null, detailSections = [];
    if (isEdit) {
      const [{ data: p }, { data: img }, { data: vr }, { data: comp }, { data: feat }, { data: spec }, { data: cr }, { data: ship }, { data: sec }] = await Promise.all([
        supabaseClient.from('products').select('*').eq('id', productId).single(),
        supabaseClient.from('product_images').select('*').eq('product_id', productId).order('sort_order'),
        supabaseClient.from('product_variants').select('*').eq('product_id', productId).order('size'),
        supabaseClient.from('product_components').select('*').eq('product_id', productId).order('sort_order'),
        supabaseClient.from('product_features').select('*').eq('product_id', productId).order('sort_order'),
        supabaseClient.from('product_size_specs').select('*').eq('product_id', productId).order('size'),
        supabaseClient.from('product_care').select('*').eq('product_id', productId).maybeSingle(),
        supabaseClient.from('product_shipping_policies').select('*').eq('product_id', productId).maybeSingle(),
        supabaseClient.from('product_detail_sections').select('*').eq('product_id', productId).order('sort_order'),
      ]);
      product = p; images = img || []; variants = vr || []; components = comp || []; features = feat || [];
      sizeSpecs = spec || []; care = cr; shipping = ship; detailSections = sec || [];
    }
    product = product || { name: '', product_code: '', collection_id: '', category_id: '', product_type: 'hanbok', short_description: '', description: '', gender: '', color: '', status: 'draft', regular_price: 0, discount_rate: 0, sale_price: 0, is_hot: false, is_featured: false, sort_order: 0 };

    openAdminModal(`
      <button class="modal-close" data-close="adminModal">닫기 ✕</button>
      <h3>${isEdit ? '상품 수정' : '상품 등록'}</h3>
      <form id="productForm">
        <fieldset class="admin-fieldset"><legend>기본 정보</legend>
          <div class="admin-form-grid">
            <div class="admin-field"><label>상품명</label><input name="name" required value="${esc(product.name)}"></div>
            <div class="admin-field"><label>상품코드</label><input name="product_code" required value="${esc(product.product_code)}"></div>
            <div class="admin-field"><label>컬렉션</label><select name="collection_id"><option value="">선택안함</option>${optionsHtml(COLLECTIONS_CACHE.map(c => ({ value: c.id, label: c.name })), product.collection_id)}</select></div>
            <div class="admin-field"><label>카테고리</label><select name="category_id"><option value="">선택안함</option>${optionsHtml(CATEGORIES_CACHE.map(c => ({ value: c.id, label: c.name })), product.category_id)}</select></div>
            <div class="admin-field"><label>상품유형</label><select name="product_type">${optionsHtml(PRODUCT_TYPE, product.product_type)}</select></div>
            <div class="admin-field"><label>공개상태</label><select name="status">${optionsHtml(PRODUCT_STATUS, product.status)}</select></div>
            <div class="admin-field"><label>성별</label><input name="gender" value="${esc(product.gender)}" placeholder="unisex / male / female"></div>
            <div class="admin-field"><label>색상</label><input name="color" value="${esc(product.color)}"></div>
            <div class="admin-field"><label>정가</label><input type="number" name="regular_price" value="${product.regular_price}" min="0"></div>
            <div class="admin-field"><label>할인율(%)</label><input type="number" name="discount_rate" value="${product.discount_rate}" min="0" max="100"></div>
            <div class="admin-field"><label>판매가</label><input type="number" name="sale_price" value="${product.sale_price}" min="0"></div>
            <div class="admin-field"><label>노출순서</label><input type="number" name="sort_order" value="${product.sort_order || 0}"></div>
            <div class="admin-field"><label><input type="checkbox" name="is_hot" ${product.is_hot ? 'checked' : ''}> HOT 상품</label></div>
            <div class="admin-field"><label><input type="checkbox" name="is_featured" ${product.is_featured ? 'checked' : ''}> 추천 상품</label></div>
          </div>
          <div class="admin-field admin-field--full" style="margin-top:10px;"><label>한 줄 소개</label><input name="short_description" value="${esc(product.short_description)}"></div>
          <div class="admin-field admin-field--full" style="margin-top:10px;"><label>상세 설명</label><textarea name="description">${esc(product.description)}</textarea></div>
          <button type="button" class="admin-btn admin-btn--sm admin-btn--ghost" id="autoCalcBtn" style="margin-top:8px;">정가×할인율로 판매가 자동계산</button>
        </fieldset>

        <fieldset class="admin-fieldset"><legend>이미지 관리 (URL 직접 입력, 예: img/설화먹비/1.jpg)</legend>
          <div class="admin-inline-list" id="pimImages">${images.map(imgRowHtml).join('')}</div>
          <button type="button" class="admin-btn admin-btn--sm admin-btn--ghost" id="addImageBtn" style="margin-top:8px;">+ 이미지 추가</button>
        </fieldset>

        <fieldset class="admin-fieldset"><legend>상품옵션 (사이즈별 재고)</legend>
          <div class="admin-inline-list" id="pimVariants">${variants.map(variantRowHtml).join('')}</div>
          <button type="button" class="admin-btn admin-btn--sm admin-btn--ghost" id="addVariantBtn" style="margin-top:8px;">+ 옵션 추가</button>
        </fieldset>

        <fieldset class="admin-fieldset"><legend>구성품</legend>
          <div class="admin-inline-list" id="pimComponents">${components.map(componentRowHtml).join('')}</div>
          <button type="button" class="admin-btn admin-btn--sm admin-btn--ghost" id="addComponentBtn" style="margin-top:8px;">+ 구성품 추가</button>
        </fieldset>

        <fieldset class="admin-fieldset"><legend>특징 (최대 3가지 권장)</legend>
          <div class="admin-inline-list" id="pimFeatures">${features.map(featureRowHtml).join('')}</div>
          <button type="button" class="admin-btn admin-btn--sm admin-btn--ghost" id="addFeatureBtn" style="margin-top:8px;">+ 특징 추가</button>
        </fieldset>

        <fieldset class="admin-fieldset"><legend>사이즈표 (실측값)</legend>
          <div class="admin-inline-list" id="pimSizeSpecs">${sizeSpecs.map(sizeSpecRowHtml).join('')}</div>
          <button type="button" class="admin-btn admin-btn--sm admin-btn--ghost" id="addSizeSpecBtn" style="margin-top:8px;">+ 사이즈 추가</button>
        </fieldset>

        <fieldset class="admin-fieldset"><legend>관리 방법</legend>
          <div class="admin-form-grid">
            <div class="admin-field"><label>소재</label><input id="careMaterial" value="${esc(care && care.material)}"></div>
            <div class="admin-field"><label>세탁법</label><input id="careWashing" value="${esc(care && care.washing)}"></div>
            <div class="admin-field"><label>착용 주의사항</label><input id="careCaution" value="${esc(care && care.wearing_caution)}"></div>
            <div class="admin-field"><label>보관법</label><input id="careStorage" value="${esc(care && care.storage_method)}"></div>
          </div>
        </fieldset>

        <fieldset class="admin-fieldset"><legend>배송/교환/반품 정책</legend>
          <div class="admin-form-grid">
            <div class="admin-field"><label>배송비</label><input type="number" id="shipFee" value="${shipping ? shipping.shipping_fee : 3000}"></div>
            <div class="admin-field"><label>무료배송 기준금액</label><input type="number" id="shipFreeThreshold" value="${shipping ? shipping.free_shipping_threshold : 100000}"></div>
            <div class="admin-field admin-field--full"><label>배송예정</label><input id="shipEta" value="${esc(shipping && shipping.estimated_delivery)}" placeholder="예: 결제 후 2~3일 이내 발송"></div>
            <div class="admin-field admin-field--full"><label>교환안내</label><textarea id="shipExchange">${esc(shipping && shipping.exchange_policy)}</textarea></div>
            <div class="admin-field admin-field--full"><label>반품안내</label><textarea id="shipReturn">${esc(shipping && shipping.return_policy)}</textarea></div>
            <div class="admin-field admin-field--full"><label>환불안내</label><textarea id="shipRefund">${esc(shipping && shipping.refund_policy)}</textarea></div>
          </div>
        </fieldset>

        <fieldset class="admin-fieldset"><legend>상세페이지 화면 순서 / 노출</legend>
          <div class="admin-inline-list" id="pimSections">${(detailSections.length ? detailSections : DETAIL_SECTION_TYPE.map((t, i) => ({ section_type: t, sort_order: i, visible: true }))).map(sectionRowHtml).join('')}</div>
        </fieldset>

        <div class="admin-modal-foot">
          <button type="button" class="admin-btn admin-btn--ghost" data-close="adminModal">취소</button>
          <button type="button" class="admin-btn admin-btn--ghost" id="previewProductBtn">미리보기 (저장 전 상세페이지 확인)</button>
          <button type="submit" class="admin-btn admin-btn--purple">저장하고 반영</button>
        </div>
      </form>
    `);

    $('#autoCalcBtn').addEventListener('click', () => {
      const form = $('#productForm');
      const reg = Number(form.regular_price.value) || 0;
      const disc = Number(form.discount_rate.value) || 0;
      form.sale_price.value = Math.round(reg * (1 - disc / 100));
    });
    $('#addImageBtn').addEventListener('click', () => $('#pimImages').insertAdjacentHTML('beforeend', imgRowHtml({})));
    $('#pimImages').addEventListener('change', async e => {
      if (!e.target.classList.contains('f-upload')) return;
      const file = e.target.files[0];
      if (!file) return;
      const row = e.target.closest('.admin-inline-row');
      e.target.disabled = true;
      showToast('이미지 업로드 중...');
      const url = await uploadProductImage(file);
      e.target.disabled = false;
      if (!url) return;
      row.querySelector('.f-url').value = url;
      row.querySelector('.f-preview').src = url;
      row.querySelector('.f-preview').style.visibility = 'visible';
      showToast('이미지가 업로드되었습니다.');
    });
    $('#addVariantBtn').addEventListener('click', () => $('#pimVariants').insertAdjacentHTML('beforeend', variantRowHtml({})));
    $('#addComponentBtn').addEventListener('click', () => $('#pimComponents').insertAdjacentHTML('beforeend', componentRowHtml({})));
    $('#addFeatureBtn').addEventListener('click', () => $('#pimFeatures').insertAdjacentHTML('beforeend', featureRowHtml({})));
    $('#addSizeSpecBtn').addEventListener('click', () => $('#pimSizeSpecs').insertAdjacentHTML('beforeend', sizeSpecRowHtml({})));
    wireRemoveButtons();

    $('#productForm').addEventListener('submit', e => { e.preventDefault(); saveProduct(productId); });
    $('#previewProductBtn').addEventListener('click', () => previewProduct());

    function wireRemoveButtons() {
      $all('[data-remove]').forEach(b => b.addEventListener('click', () => b.closest('.admin-inline-row').remove()));
    }
    if (productModalObserver) productModalObserver.disconnect();
    productModalObserver = new MutationObserver(wireRemoveButtons);
    productModalObserver.observe($('#adminModalBody'), { childList: true, subtree: true });
  }

  function imgRowHtml(img) {
    return `<div class="admin-inline-row" data-id="${img.id || ''}">
      <img class="f-preview" src="${esc(img.image_url) || ''}" onerror="this.style.visibility='hidden'">
      <input type="text" class="f-url" value="${esc(img.image_url)}" placeholder="이미지 URL 또는 파일 업로드">
      <input type="file" class="f-upload" accept="image/*" title="파일을 선택하면 Storage에 업로드되고 URL이 자동으로 채워집니다." style="max-width:150px;">
      <select class="f-type">${optionsHtml(IMAGE_TYPE, img.image_type || 'detail')}</select>
      <label style="white-space:nowrap;"><input type="checkbox" class="f-primary" ${img.is_primary ? 'checked' : ''}> 대표</label>
      <button type="button" class="admin-btn admin-btn--sm admin-btn--danger" data-remove>삭제</button>
    </div>`;
  }
  async function uploadProductImage(file) {
    const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
    const path = `products/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabaseClient.storage.from('product-images').upload(path, file, { upsert: false, cacheControl: '3600' });
    if (error) { showToast('이미지 업로드 실패: ' + error.message); return null; }
    return supabaseClient.storage.from('product-images').getPublicUrl(path).data.publicUrl;
  }
  function variantRowHtml(v) {
    return `<div class="admin-inline-row" data-id="${v.id || ''}">
      <select class="f-size">${optionsHtml(SIZE_OPTS, v.size || 'M')}</select>
      <input type="number" class="f-stock" value="${v.stock_quantity != null ? v.stock_quantity : 0}" min="0" placeholder="재고">
      <input type="number" class="f-threshold" value="${v.low_stock_threshold != null ? v.low_stock_threshold : 3}" min="0" placeholder="재고부족 기준">
      <label style="white-space:nowrap;"><input type="checkbox" class="f-active" ${v.active !== false ? 'checked' : ''}> 판매중</label>
      <button type="button" class="admin-btn admin-btn--sm admin-btn--danger" data-remove>삭제</button>
    </div>`;
  }
  function componentRowHtml(c) {
    return `<div class="admin-inline-row" data-id="${c.id || ''}">
      <input type="text" class="f-name" value="${esc(c.component_name)}" placeholder="구성품명">
      <label style="white-space:nowrap;"><input type="checkbox" class="f-included" ${c.included !== false ? 'checked' : ''}> 포함</label>
      <input type="text" class="f-img" value="${esc(c.image_url)}" placeholder="이미지 URL">
      <input type="text" class="f-desc" value="${esc(c.description)}" placeholder="설명">
      <button type="button" class="admin-btn admin-btn--sm admin-btn--danger" data-remove>삭제</button>
    </div>`;
  }
  function featureRowHtml(f) {
    return `<div class="admin-inline-row" data-id="${f.id || ''}">
      <input type="text" class="f-title" value="${esc(f.title)}" placeholder="특징 제목">
      <input type="text" class="f-desc" value="${esc(f.description)}" placeholder="설명">
      <button type="button" class="admin-btn admin-btn--sm admin-btn--danger" data-remove>삭제</button>
    </div>`;
  }
  function sizeSpecRowHtml(s) {
    return `<div class="admin-inline-row" data-id="${s.id || ''}">
      <select class="f-size">${optionsHtml(SIZE_OPTS, s.size || 'M')}</select>
      <input type="number" class="f-chest" value="${s.chest != null ? s.chest : ''}" placeholder="가슴(cm)">
      <input type="number" class="f-waist" value="${s.waist != null ? s.waist : ''}" placeholder="허리(cm)">
      <input type="number" class="f-length" value="${s.length != null ? s.length : ''}" placeholder="총장(cm)">
      <input type="number" class="f-sleeve" value="${s.sleeve != null ? s.sleeve : ''}" placeholder="소매(cm)">
      <button type="button" class="admin-btn admin-btn--sm admin-btn--danger" data-remove>삭제</button>
    </div>`;
  }
  function sectionRowHtml(s) {
    return `<div class="admin-inline-row" data-type="${s.section_type}">
      <span style="flex:1;">${esc(s.section_type)}</span>
      <input type="number" class="f-sort" value="${s.sort_order != null ? s.sort_order : 0}" style="max-width:70px;" placeholder="순서">
      <label style="white-space:nowrap;"><input type="checkbox" class="f-visible" ${s.visible !== false ? 'checked' : ''}> 노출</label>
    </div>`;
  }

  /** 상품수정 모달의 현재 입력값을 전부 읽어서 저장/미리보기 공용으로 씁니다. */
  function collectFormValues() {
    const form = $('#productForm');
    const fd = new FormData(form);
    const payload = {
      name: fd.get('name'), product_code: fd.get('product_code'),
      collection_id: fd.get('collection_id') || null, category_id: fd.get('category_id') || null,
      product_type: fd.get('product_type'), status: fd.get('status'),
      gender: fd.get('gender') || null, color: fd.get('color') || null,
      regular_price: Number(fd.get('regular_price')) || 0, discount_rate: Number(fd.get('discount_rate')) || 0,
      sale_price: Number(fd.get('sale_price')) || 0, sort_order: Number(fd.get('sort_order')) || 0,
      is_hot: fd.get('is_hot') === 'on', is_featured: fd.get('is_featured') === 'on',
      short_description: fd.get('short_description') || null, description: fd.get('description') || null,
    };
    const images = $all('#pimImages .admin-inline-row').map((row, i) => ({
      image_url: row.querySelector('.f-url').value.trim(),
      image_type: row.querySelector('.f-type').value, is_primary: row.querySelector('.f-primary').checked, sort_order: i,
    })).filter(r => r.image_url);
    const variants = $all('#pimVariants .admin-inline-row').map(row => ({
      id: row.dataset.id || null, size: row.querySelector('.f-size').value,
      stock_quantity: Number(row.querySelector('.f-stock').value) || 0,
      low_stock_threshold: Number(row.querySelector('.f-threshold').value) || 0,
      active: row.querySelector('.f-active').checked,
    }));
    const components = $all('#pimComponents .admin-inline-row').map((row, i) => ({
      component_name: row.querySelector('.f-name').value.trim(),
      included: row.querySelector('.f-included').checked, image_url: row.querySelector('.f-img').value.trim() || null,
      description: row.querySelector('.f-desc').value.trim() || null, sort_order: i,
    })).filter(r => r.component_name);
    const features = $all('#pimFeatures .admin-inline-row').map((row, i) => ({
      title: row.querySelector('.f-title').value.trim(),
      description: row.querySelector('.f-desc').value.trim() || null, sort_order: i,
    })).filter(r => r.title);
    const sizeSpecs = $all('#pimSizeSpecs .admin-inline-row').map(row => ({
      size: row.querySelector('.f-size').value,
      chest: numOrNull(row.querySelector('.f-chest').value), waist: numOrNull(row.querySelector('.f-waist').value),
      length: numOrNull(row.querySelector('.f-length').value), sleeve: numOrNull(row.querySelector('.f-sleeve').value),
    }));
    const sections = $all('#pimSections .admin-inline-row').map(row => ({
      section_type: row.dataset.type, sort_order: Number(row.querySelector('.f-sort').value) || 0, visible: row.querySelector('.f-visible').checked,
    }));
    const care = { material: $('#careMaterial').value.trim() || null, washing: $('#careWashing').value.trim() || null, wearing_caution: $('#careCaution').value.trim() || null, storage_method: $('#careStorage').value.trim() || null };
    const shipping = {
      shipping_fee: Number($('#shipFee').value) || 0, free_shipping_threshold: Number($('#shipFreeThreshold').value) || 0,
      estimated_delivery: $('#shipEta').value.trim() || null, exchange_policy: $('#shipExchange').value.trim() || null,
      return_policy: $('#shipReturn').value.trim() || null, refund_policy: $('#shipRefund').value.trim() || null,
    };
    return { payload, images, variants, components, features, sizeSpecs, sections, care, shipping };
  }

  async function saveProduct(productId) {
    const v = collectFormValues();
    const payload = v.payload;

    let pid = productId;
    if (pid) {
      const { error } = await supabaseClient.from('products').update(payload).eq('id', pid);
      if (error) { showToast('상품 저장 실패: ' + error.message); return; }
    } else {
      const { data, error } = await supabaseClient.from('products').insert(payload).select('id').single();
      if (error) { showToast('상품 등록 실패: ' + error.message); return; }
      pid = data.id;
    }

    const warnings = [];
    // 하위 참조가 없는 테이블: 전체 삭제 후 재삽입
    async function replaceRows(table, rows) {
      const { error: delErr } = await supabaseClient.from(table).delete().eq('product_id', pid);
      if (delErr) { warnings.push(`${table}: ${delErr.message}`); return; }
      if (rows.length) {
        const { error: insErr } = await supabaseClient.from(table).insert(rows);
        if (insErr) warnings.push(`${table}: ${insErr.message}`);
      }
    }

    await replaceRows('product_images', v.images.map(r => ({ product_id: pid, ...r })));
    await replaceRows('product_components', v.components.map(r => ({ product_id: pid, ...r })));
    await replaceRows('product_features', v.features.map(r => ({ product_id: pid, ...r })));
    await replaceRows('product_size_specs', v.sizeSpecs.map(r => ({ product_id: pid, ...r })));
    await replaceRows('product_detail_sections', v.sections.map(r => ({ product_id: pid, ...r })));

    // care / shipping: 단일 행 upsert
    if (Object.values(v.care).some(Boolean)) {
      const { data: existingCare } = await supabaseClient.from('product_care').select('id').eq('product_id', pid).maybeSingle();
      const { error: careErr } = existingCare
        ? await supabaseClient.from('product_care').update(v.care).eq('id', existingCare.id)
        : await supabaseClient.from('product_care').insert({ product_id: pid, ...v.care });
      if (careErr) warnings.push(`관리방법: ${careErr.message}`);
    }
    const { data: existingShip } = await supabaseClient.from('product_shipping_policies').select('id').eq('product_id', pid).maybeSingle();
    const { error: shipErr } = existingShip
      ? await supabaseClient.from('product_shipping_policies').update(v.shipping).eq('id', existingShip.id)
      : await supabaseClient.from('product_shipping_policies').insert({ product_id: pid, ...v.shipping });
    if (shipErr) warnings.push(`배송정책: ${shipErr.message}`);

    // variants: 참조 무결성이 있으므로 개별 update/insert/delete
    const originalIds = productId ? (await supabaseClient.from('product_variants').select('id').eq('product_id', pid)).data.map(x => x.id) : [];
    const domIds = v.variants.map(x => x.id).filter(Boolean);
    const sizesUsed = v.variants.map(x => x.size);
    if (new Set(sizesUsed).size !== sizesUsed.length) { showToast('상품옵션에 동일한 사이즈가 중복되어 있습니다.'); return; }
    for (const oldId of originalIds) {
      if (!domIds.includes(oldId)) {
        const { error } = await supabaseClient.from('product_variants').delete().eq('id', oldId);
        if (error) warnings.push('일부 옵션은 주문 이력이 있어 삭제할 수 없어 유지됩니다.');
      }
    }
    for (const variant of v.variants) {
      const vpayload = {
        product_id: pid, size: variant.size, stock_quantity: variant.stock_quantity,
        low_stock_threshold: variant.low_stock_threshold, active: variant.active,
      };
      const { error: vErr } = variant.id
        ? await supabaseClient.from('product_variants').update(vpayload).eq('id', variant.id)
        : await supabaseClient.from('product_variants').insert(vpayload);
      if (vErr) warnings.push(`옵션(${vpayload.size}): ${vErr.message}`);
    }

    closeAdminModal();
    showToast(warnings.length ? `일부 항목 저장 실패: ${warnings[0]}` : '상품이 저장되었습니다.');
    await logAdmin(productId ? 'product_update' : 'product_create', 'product', pid, payload.name + (warnings.length ? ` (경고 ${warnings.length}건)` : ''));
    loadProducts();
  }
  function numOrNull(v) { return v === '' || v == null ? null : Number(v); }

  /** 저장하기 전에 product.html의 실제 렌더링 코드를 그대로 재사용해 미리보기를 띄웁니다. (DB에는 아무것도 쓰지 않음) */
  function previewProduct() {
    const v = collectFormValues();
    if (!v.payload.name) { showToast('상품명을 입력해야 미리보기를 볼 수 있습니다.'); return; }
    const collection = COLLECTIONS_CACHE.find(c => c.id === v.payload.collection_id);
    const category = CATEGORIES_CACHE.find(c => c.id === v.payload.category_id);
    const previewProductObj = {
      id: null, name: v.payload.name, slug: 'preview',
      product_type: v.payload.product_type, short_description: v.payload.short_description, description: v.payload.description,
      regular_price: v.payload.regular_price, sale_price: v.payload.sale_price, discount_rate: v.payload.discount_rate,
      collections: collection ? { name: collection.name, slug: collection.slug } : null,
      categories: category ? { name: category.name, slug: category.slug } : null,
      product_images: v.images,
      product_variants: v.variants.map(x => ({ id: null, size: x.size, stock_quantity: x.stock_quantity, low_stock_threshold: x.low_stock_threshold })),
      product_size_specs: v.sizeSpecs,
      product_features: v.features,
      product_components: v.components,
      product_care: v.care,
      product_shipping_policies: v.shipping,
    };
    try {
      sessionStorage.setItem('adminProductPreview', JSON.stringify({ product: previewProductObj }));
    } catch (err) {
      showToast('미리보기 데이터를 준비하지 못했습니다 (용량 초과 가능).');
      return;
    }
    window.open('product.html?preview=admin', '_blank');
  }

  /* ================= 4. 재고현황 ================= */
  async function loadInventory() {
    const el = $('#tab-inventory');
    el.innerHTML = '<p class="admin-empty">불러오는 중...</p>';
    const { data: products } = await supabaseClient
      .from('products').select('id, name, product_variants ( id, size, stock_quantity, active )').order('name');
    const rows = (products || []).map(p => {
      const bySize = {};
      (p.product_variants || []).forEach(v => { if (v.active) bySize[v.size] = v; });
      const cells = SIZE_OPTS.map(size => {
        const v = bySize[size];
        if (!v) return '<td>-</td>';
        return `<td><input type="number" class="inv-input" min="0" value="${v.stock_quantity}" data-variant="${v.id}" data-product="${p.id}" style="width:64px;"></td>`;
      }).join('');
      return `<tr><td class="wrap">${esc(p.name)}</td>${cells}</tr>`;
    }).join('');
    el.innerHTML = `<div class="admin-table-wrap"><table class="admin-table">
      <thead><tr><th>상품명</th>${SIZE_OPTS.map(s => `<th>${s}</th>`).join('')}</tr></thead>
      <tbody>${rows || '<tr><td colspan="5" class="admin-empty">상품이 없습니다.</td></tr>'}</tbody>
    </table></div>`;
    $all('.inv-input').forEach(input => {
      input.addEventListener('change', async () => {
        const val = Number(input.value) || 0;
        const { error } = await supabaseClient.from('product_variants').update({ stock_quantity: val }).eq('id', input.dataset.variant);
        if (error) { showToast('재고 저장 실패'); return; }
        showToast('재고가 저장되었습니다.');
        await logAdmin('inventory_update', 'product_variant', input.dataset.variant, `재고 ${val}개로 변경`);
      });
    });
  }

  /* ================= 5. 주문관리 ================= */
  async function loadOrders() {
    const el = $('#tab-orders');
    el.innerHTML = '<p class="admin-empty">불러오는 중...</p>';
    const { data } = await supabaseClient
      .from('orders')
      .select('id, order_number, customer_name, ordered_at, total_amount, order_status, order_items ( product_name_snapshot )')
      .order('ordered_at', { ascending: false }).limit(200);
    const rows = (data || []).map(o => {
      const first = (o.order_items || [])[0];
      const more = (o.order_items || []).length > 1 ? ` 외 ${o.order_items.length - 1}건` : '';
      return `<tr>
        <td>${esc(o.order_number)}</td><td>${esc(o.customer_name)}</td>
        <td class="wrap">${first ? esc(first.product_name_snapshot) : ''}${more}</td>
        <td>${fmtDate(o.ordered_at)}</td><td>${formatWon(o.total_amount)}</td>
        <td><span class="admin-badge admin-badge--purple">${orderStatusLabel(o.order_status)}</span></td>
        <td><button class="admin-btn admin-btn--sm admin-btn--ghost" data-detail="${o.id}">상세보기</button></td>
      </tr>`;
    }).join('');
    el.innerHTML = `<div class="admin-table-wrap"><table class="admin-table">
      <thead><tr><th>주문번호</th><th>고객명</th><th>주문상품</th><th>주문일</th><th>결제금액</th><th>상태</th><th></th></tr></thead>
      <tbody>${rows || '<tr><td colspan="7" class="admin-empty">주문 내역이 없습니다.</td></tr>'}</tbody>
    </table></div>`;
    $all('[data-detail]').forEach(b => b.addEventListener('click', () => openOrderModal(b.dataset.detail)));
  }
  async function openOrderModal(orderId) {
    const [{ data: order }, { data: items }, { data: shipment }] = await Promise.all([
      supabaseClient.from('orders').select('*').eq('id', orderId).single(),
      supabaseClient.from('order_items').select('*, order_item_addons ( * )').eq('order_id', orderId),
      supabaseClient.from('shipments').select('*').eq('order_id', orderId).maybeSingle(),
    ]);
    openAdminModal(`
      <button class="modal-close" data-close="adminModal">닫기 ✕</button>
      <h3>주문 상세 · #${esc(order.order_number)}</h3>
      <div class="admin-form-grid">
        <div class="admin-field"><label>고객명</label><input value="${esc(order.customer_name)}" disabled></div>
        <div class="admin-field"><label>연락처</label><input value="${esc(order.customer_phone)}" disabled></div>
        <div class="admin-field admin-field--full"><label>배송주소</label><input value="${esc([order.postcode, order.address, order.address_detail].filter(Boolean).join(' '))}" disabled></div>
        <div class="admin-field"><label>결제금액</label><input value="${formatWon(order.total_amount)}" disabled></div>
        <div class="admin-field"><label>결제상태</label><input value="${esc(order.payment_status)}" disabled></div>
      </div>
      <div class="admin-section-title">주문상품</div>
      <div class="admin-table-wrap"><table class="admin-table">
        <thead><tr><th>상품명</th><th>옵션</th><th>수량</th><th>금액</th></tr></thead>
        <tbody>${(items || []).map(it => `<tr><td class="wrap">${esc(it.product_name_snapshot)}</td><td>${esc(JSON.stringify(it.option_snapshot || {}))}</td><td>${it.quantity}</td><td>${formatWon(it.total_price)}</td></tr>`).join('')}</tbody>
      </table></div>
      <fieldset class="admin-fieldset"><legend>주문/배송 상태 변경</legend>
        <div class="admin-form-grid">
          <div class="admin-field"><label>주문상태</label><select id="orderStatusSelect">${optionsHtml(ORDER_STATUS, order.order_status)}</select></div>
          <div class="admin-field"><label>택배사</label><input id="courierName" value="${esc(shipment && shipment.courier_name)}"></div>
          <div class="admin-field"><label>운송장번호</label><input id="trackingNumber" value="${esc(shipment && shipment.tracking_number)}"></div>
          <div class="admin-field"><label>배송상태</label><select id="shipmentStatusSelect">${optionsHtml(SHIPMENT_STATUS, shipment ? shipment.status : 'preparing')}</select></div>
        </div>
      </fieldset>
      <div class="admin-modal-foot">
        <button type="button" class="admin-btn admin-btn--ghost" data-close="adminModal">닫기</button>
        <button type="button" class="admin-btn admin-btn--purple" id="orderSaveBtn">저장</button>
      </div>
    `);
    $('#orderSaveBtn').addEventListener('click', async () => {
      const newOrderStatus = $('#orderStatusSelect').value;
      const newShipStatus = $('#shipmentStatusSelect').value;
      const courierName = $('#courierName').value.trim() || null;
      const trackingNumber = $('#trackingNumber').value.trim() || null;

      if (!await ok(supabaseClient.from('orders').update({ order_status: newOrderStatus }).eq('id', orderId))) return;

      let shipmentId = shipment ? shipment.id : null;
      const shipPayload = { courier_name: courierName, tracking_number: trackingNumber, status: newShipStatus };
      if (newShipStatus === 'shipping' && (!shipment || !shipment.shipped_at)) shipPayload.shipped_at = new Date().toISOString();
      if (newShipStatus === 'delivered' && (!shipment || !shipment.delivered_at)) shipPayload.delivered_at = new Date().toISOString();

      if (shipmentId) {
        if (!await ok(supabaseClient.from('shipments').update(shipPayload).eq('id', shipmentId))) return;
      } else {
        const { data: created, error } = await supabaseClient.from('shipments').insert({ order_id: orderId, ...shipPayload }).select('id').single();
        if (error) { showToast('배송 정보 저장 실패: ' + error.message); return; }
        shipmentId = created ? created.id : null;
      }
      if (shipmentId && (!shipment || shipment.status !== newShipStatus)) {
        await ok(supabaseClient.from('shipment_history').insert({ shipment_id: shipmentId, status: newShipStatus, description: `관리자 처리: ${newShipStatus}` }));
      }
      closeAdminModal();
      showToast('주문 정보가 저장되었습니다.');
      await logAdmin('order_update', 'order', orderId, `${order.order_number} → ${newOrderStatus}`);
      loadOrders();
    });
  }

  /* ================= 6. 취소/교환/반품 ================= */
  async function loadClaims() {
    const el = $('#tab-claims');
    el.innerHTML = '<p class="admin-empty">불러오는 중...</p>';
    const { data } = await supabaseClient
      .from('order_claims').select('id, claim_type, reason, status, requested_at, admin_note, orders ( order_number, customer_name )')
      .order('requested_at', { ascending: false });
    const rows = (data || []).map(c => `<tr>
      <td>${esc(c.orders ? c.orders.order_number : '')}</td><td>${esc(c.orders ? c.orders.customer_name : '')}</td>
      <td>${claimTypeLabel(c.claim_type)}</td><td class="wrap">${esc(c.reason)}</td>
      <td>${fmtDate(c.requested_at)}</td>
      <td><span class="admin-badge admin-badge--purple">${claimStatusLabel(c.status)}</span></td>
      <td><button class="admin-btn admin-btn--sm admin-btn--ghost" data-claim="${c.id}">처리</button></td>
    </tr>`).join('');
    el.innerHTML = `<div class="admin-table-wrap"><table class="admin-table">
      <thead><tr><th>주문번호</th><th>고객명</th><th>유형</th><th>사유</th><th>요청일</th><th>상태</th><th></th></tr></thead>
      <tbody>${rows || '<tr><td colspan="7" class="admin-empty">접수된 요청이 없습니다.</td></tr>'}</tbody>
    </table></div>`;
    $all('[data-claim]').forEach(b => b.addEventListener('click', () => openClaimModal(b.dataset.claim, data.find(x => x.id === b.dataset.claim))));
  }
  function openClaimModal(id, claim) {
    openAdminModal(`
      <button class="modal-close" data-close="adminModal">닫기 ✕</button>
      <h3>${claimTypeLabel(claim.claim_type)} 요청 처리</h3>
      <p style="font-size:13px;color:var(--gray-mid);">주문 #${esc(claim.orders ? claim.orders.order_number : '')} · 사유: ${esc(claim.reason)}</p>
      <div class="admin-field"><label>처리상태</label><select id="claimStatusSelect">${optionsHtml(CLAIM_STATUS, claim.status)}</select></div>
      <div class="admin-field" style="margin-top:10px;"><label>관리자 메모</label><textarea id="claimNote">${esc(claim.admin_note)}</textarea></div>
      <div class="admin-modal-foot">
        <button type="button" class="admin-btn admin-btn--ghost" data-close="adminModal">닫기</button>
        <button type="button" class="admin-btn admin-btn--purple" id="claimSaveBtn">저장</button>
      </div>
    `);
    $('#claimSaveBtn').addEventListener('click', async () => {
      const status = $('#claimStatusSelect').value;
      const note = $('#claimNote').value.trim() || null;
      const payload = { status, admin_note: note };
      if (status === 'completed') payload.completed_at = new Date().toISOString();
      if (!await ok(supabaseClient.from('order_claims').update(payload).eq('id', id))) return;
      closeAdminModal();
      showToast('처리되었습니다.');
      await logAdmin('claim_update', 'order_claim', id, `${claimTypeLabel(claim.claim_type)} → ${status}`);
      loadClaims();
    });
  }

  /* ================= 7. 후기관리 ================= */
  async function loadReviews() {
    const el = $('#tab-reviews');
    el.innerHTML = '<p class="admin-empty">불러오는 중...</p>';
    const { data } = await supabaseClient
      .from('reviews').select('id, nickname, rating, content, is_visible, created_at, products ( name ), review_replies ( id, content )')
      .order('created_at', { ascending: false });
    const rows = (data || []).map(r => {
      const reply = (r.review_replies || [])[0];
      return `<tr>
        <td class="wrap">${esc(r.products ? r.products.name : '')}</td><td>${esc(r.nickname)}</td><td>★${r.rating}</td>
        <td class="wrap">${esc(r.content)}</td>
        <td><span class="admin-badge ${r.is_visible ? 'admin-badge--green' : 'admin-badge--gray'}">${r.is_visible ? '노출' : '숨김'}</span></td>
        <td>${reply ? '<span class="admin-badge admin-badge--purple">답변완료</span>' : '<span class="admin-badge admin-badge--red">미답변</span>'}</td>
        <td><button class="admin-btn admin-btn--sm admin-btn--ghost" data-reply="${r.id}">답변/노출관리</button></td>
      </tr>`;
    }).join('');
    el.innerHTML = `<div class="admin-table-wrap"><table class="admin-table">
      <thead><tr><th>상품</th><th>작성자</th><th>별점</th><th>내용</th><th>노출</th><th>답변</th><th></th></tr></thead>
      <tbody>${rows || '<tr><td colspan="7" class="admin-empty">등록된 후기가 없습니다.</td></tr>'}</tbody>
    </table></div>`;
    $all('[data-reply]').forEach(b => b.addEventListener('click', () => openReviewModal(data.find(x => x.id === b.dataset.reply))));
  }
  function openReviewModal(review) {
    const reply = (review.review_replies || [])[0];
    openAdminModal(`
      <button class="modal-close" data-close="adminModal">닫기 ✕</button>
      <h3>후기 관리</h3>
      <p style="font-size:13px;color:var(--gray-mid);">${esc(review.nickname)} · ★${review.rating}</p>
      <p style="margin:10px 0;">${esc(review.content)}</p>
      <div class="admin-field"><label><input type="checkbox" id="reviewVisible" ${review.is_visible ? 'checked' : ''}> 사이트에 노출</label></div>
      <div class="admin-field" style="margin-top:10px;"><label>관리자 답변</label><textarea id="replyContent">${esc(reply && reply.content)}</textarea></div>
      <div class="admin-modal-foot">
        <button type="button" class="admin-btn admin-btn--ghost" data-close="adminModal">닫기</button>
        <button type="button" class="admin-btn admin-btn--purple" id="reviewSaveBtn">저장</button>
      </div>
    `);
    $('#reviewSaveBtn').addEventListener('click', async () => {
      const visible = $('#reviewVisible').checked;
      const content = $('#replyContent').value.trim();
      if (!await ok(supabaseClient.from('reviews').update({ is_visible: visible }).eq('id', review.id))) return;
      if (content) {
        const saved = reply
          ? await ok(supabaseClient.from('review_replies').update({ content }).eq('id', reply.id))
          : await ok(supabaseClient.from('review_replies').insert({ review_id: review.id, admin_user_id: CURRENT_ADMIN.id, content }));
        if (!saved) return;
      }
      closeAdminModal();
      showToast('저장되었습니다.');
      await logAdmin('review_update', 'review', review.id, `노출:${visible} 답변:${!!content}`);
      loadReviews();
    });
  }

  /* ================= 8. 카테고리/컬렉션 관리 ================= */
  async function loadCategories() {
    const el = $('#tab-categories');
    const { data: collections } = await supabaseClient.from('collections').select('*').order('sort_order');
    const { data: categories } = await supabaseClient.from('categories').select('*').order('sort_order');
    COLLECTIONS_CACHE = collections || []; CATEGORIES_CACHE = categories || [];

    const collRows = COLLECTIONS_CACHE.map(c => `<tr data-id="${c.id}">
      <td><input class="c-name" value="${esc(c.name)}" style="width:120px;"></td>
      <td><input class="c-desc" value="${esc(c.description)}" style="width:200px;"></td>
      <td><input type="number" class="c-sort" value="${c.sort_order}" style="width:60px;"></td>
      <td><input type="checkbox" class="c-active" ${c.active ? 'checked' : ''}></td>
      <td><button class="admin-btn admin-btn--sm admin-btn--ghost" data-save-coll="${c.id}">저장</button></td>
    </tr>`).join('');
    const catRows = CATEGORIES_CACHE.map(c => `<tr data-id="${c.id}">
      <td><input class="k-name" value="${esc(c.name)}" style="width:120px;"></td>
      <td><input type="number" class="k-sort" value="${c.sort_order}" style="width:60px;"></td>
      <td><input type="checkbox" class="k-active" ${c.active ? 'checked' : ''}></td>
      <td><button class="admin-btn admin-btn--sm admin-btn--ghost" data-save-cat="${c.id}">저장</button>
      <button class="admin-btn admin-btn--sm admin-btn--danger" data-del-cat="${c.id}">삭제</button></td>
    </tr>`).join('');

    el.innerHTML = `
      <div class="admin-section-title">컬렉션 (한복 라인)</div>
      <div class="admin-table-wrap"><table class="admin-table">
        <thead><tr><th>이름</th><th>설명</th><th>순서</th><th>공개</th><th></th></tr></thead>
        <tbody>${collRows}</tbody>
      </table></div>
      <div class="admin-section-title">카테고리</div>
      <div class="admin-toolbar">
        <input type="text" id="newCatName" placeholder="새 카테고리명">
        <button class="admin-btn admin-btn--purple" id="addCatBtn">+ 카테고리 추가</button>
      </div>
      <div class="admin-table-wrap"><table class="admin-table">
        <thead><tr><th>이름</th><th>순서</th><th>공개</th><th></th></tr></thead>
        <tbody>${catRows}</tbody>
      </table></div>`;

    $all('[data-save-coll]').forEach(b => b.addEventListener('click', async () => {
      const row = b.closest('tr');
      const saved = await ok(supabaseClient.from('collections').update({
        name: row.querySelector('.c-name').value, description: row.querySelector('.c-desc').value,
        sort_order: Number(row.querySelector('.c-sort').value) || 0, active: row.querySelector('.c-active').checked,
      }).eq('id', b.dataset.saveColl));
      if (!saved) return;
      showToast('컬렉션이 저장되었습니다.');
      await logAdmin('collection_update', 'collection', b.dataset.saveColl, row.querySelector('.c-name').value);
    }));
    $all('[data-save-cat]').forEach(b => b.addEventListener('click', async () => {
      const row = b.closest('tr');
      const saved = await ok(supabaseClient.from('categories').update({
        name: row.querySelector('.k-name').value, sort_order: Number(row.querySelector('.k-sort').value) || 0,
        active: row.querySelector('.k-active').checked,
      }).eq('id', b.dataset.saveCat));
      if (!saved) return;
      showToast('카테고리가 저장되었습니다.');
      await logAdmin('category_update', 'category', b.dataset.saveCat, row.querySelector('.k-name').value);
    }));
    $all('[data-del-cat]').forEach(b => b.addEventListener('click', async () => {
      if (!confirm('카테고리를 삭제할까요?')) return;
      const { error } = await supabaseClient.from('categories').delete().eq('id', b.dataset.delCat);
      if (error) { await supabaseClient.from('categories').update({ active: false }).eq('id', b.dataset.delCat); showToast('연결된 상품이 있어 삭제 대신 숨김 처리했습니다.'); }
      else showToast('카테고리가 삭제되었습니다.');
      await logAdmin('category_delete', 'category', b.dataset.delCat, '');
      loadCategories();
    }));
    $('#addCatBtn').addEventListener('click', async () => {
      const name = $('#newCatName').value.trim();
      if (!name) return;
      const slug = name.toLowerCase().replace(/\s+/g, '-');
      if (!await ok(supabaseClient.from('categories').insert({ name, slug, sort_order: CATEGORIES_CACHE.length, active: true }))) return;
      showToast('카테고리가 추가되었습니다.');
      loadCategories();
    });
  }

  /* ================= 9. 쿠폰관리 ================= */
  async function loadCoupons() {
    const el = $('#tab-coupons');
    const [{ data }, { data: issuedRows }] = await Promise.all([
      supabaseClient.from('coupons').select('*').order('created_at', { ascending: false }),
      supabaseClient.from('user_coupons').select('coupon_id'),
    ]);
    const issuedCounts = (issuedRows || []).reduce((counts, row) => {
      counts[row.coupon_id] = (counts[row.coupon_id] || 0) + 1;
      return counts;
    }, {});
    const rows = (data || []).map(c => `<tr>
      <td>${esc(c.code)}</td><td>${esc(c.name)}</td>
      <td>${c.discount_type === 'percent' ? c.discount_value + '%' : formatWon(c.discount_value)}</td>
      <td>${formatWon(c.min_order_amount)}</td>
      <td>${issuedCounts[c.id] || 0}명</td>
      <td><span class="admin-badge ${c.active ? 'admin-badge--green' : 'admin-badge--gray'}">${c.active ? '활성' : '비활성'}</span></td>
      <td><button class="admin-btn admin-btn--sm admin-btn--purple" data-issue-coupon="${c.id}" ${c.active ? '' : 'disabled'}>발급</button>
      <button class="admin-btn admin-btn--sm admin-btn--ghost" data-edit-coupon="${c.id}">수정</button>
      <button class="admin-btn admin-btn--sm admin-btn--danger" data-del-coupon="${c.id}">삭제</button></td>
    </tr>`).join('');
    el.innerHTML = `
      <div class="admin-toolbar"><button class="admin-btn admin-btn--purple" id="addCouponBtn">+ 쿠폰등록</button></div>
      <div class="admin-table-wrap"><table class="admin-table">
        <thead><tr><th>코드</th><th>이름</th><th>할인</th><th>최소주문</th><th>발급 인원</th><th>상태</th><th></th></tr></thead>
        <tbody>${rows || '<tr><td colspan="7" class="admin-empty">등록된 쿠폰이 없습니다.</td></tr>'}</tbody>
      </table></div>`;
    $('#addCouponBtn').addEventListener('click', () => openCouponModal(null));
    $all('[data-issue-coupon]').forEach(b => b.addEventListener('click', () => openCouponIssueModal((data || []).find(c => c.id === b.dataset.issueCoupon))));
    $all('[data-edit-coupon]').forEach(b => b.addEventListener('click', () => openCouponModal((data || []).find(c => c.id === b.dataset.editCoupon))));
    $all('[data-del-coupon]').forEach(b => b.addEventListener('click', async () => {
      if (!confirm('쿠폰을 삭제할까요?')) return;
      const { error } = await supabaseClient.from('coupons').delete().eq('id', b.dataset.delCoupon);
      if (error) { await supabaseClient.from('coupons').update({ active: false }).eq('id', b.dataset.delCoupon); showToast('사용 이력이 있어 삭제 대신 비활성화했습니다.'); }
      else showToast('쿠폰이 삭제되었습니다.');
      await logAdmin('coupon_delete', 'coupon', b.dataset.delCoupon, '');
      loadCoupons();
    }));
  }
  async function openCouponIssueModal(coupon) {
    const { data: members, error } = await supabaseClient
      .from('profiles').select('id, email, name, status').eq('status', 'active').order('created_at', { ascending: false });
    if (error) { showToast('회원 목록을 불러오지 못했습니다.'); return; }
    const memberOptions = (members || []).map(member =>
      `<option value="${member.id}">${esc(member.name || '이름 없음')} · ${esc(member.email || '이메일 없음')}</option>`).join('');
    openAdminModal(`
      <button class="modal-close" data-close="adminModal">닫기 ✕</button>
      <h3>쿠폰 발급</h3>
      <p class="admin-coupon-issue__name"><b>${esc(coupon.name)}</b><span>${esc(coupon.code)}</span></p>
      <div class="admin-form-grid full">
        <div class="admin-field admin-field--full">
          <label>발급 대상</label>
          <select id="couponIssueTarget">
            <option value="all">모든 사용자에게 주기</option>
            <option value="single">특정 사용자에게 주기</option>
          </select>
        </div>
        <div class="admin-field admin-field--full" id="couponMemberField" hidden>
          <label>사용자 선택</label>
          <select id="couponMemberId">${memberOptions}</select>
          <small>이름과 이메일을 확인한 뒤 발급해주세요.</small>
        </div>
      </div>
      <p class="admin-coupon-issue__notice">이미 같은 쿠폰을 받은 사용자는 중복 발급되지 않습니다.</p>
      <div class="admin-modal-foot">
        <button type="button" class="admin-btn admin-btn--ghost" data-close="adminModal">취소</button>
        <button type="button" class="admin-btn admin-btn--purple" id="couponIssueBtn">쿠폰 발급하기</button>
      </div>`);
    const target = $('#couponIssueTarget');
    const memberField = $('#couponMemberField');
    target.addEventListener('change', () => { memberField.hidden = target.value !== 'single'; });
    $('#couponIssueBtn').addEventListener('click', async event => {
      const memberId = target.value === 'single' ? $('#couponMemberId').value : null;
      if (target.value === 'single' && !memberId) { showToast('쿠폰을 받을 사용자를 선택해주세요.'); return; }
      const button = event.currentTarget;
      button.disabled = true;
      button.textContent = '발급 중...';
      const { data: issuedCount, error: issueError } = await supabaseClient.rpc('admin_issue_coupon', {
        p_coupon_id: coupon.id,
        p_user_id: memberId,
      });
      if (issueError) { showToast(issueError.message || '쿠폰 발급에 실패했습니다.'); button.disabled = false; button.textContent = '쿠폰 발급하기'; return; }
      await logAdmin('coupon_issue', 'coupon', coupon.id, `${target.value === 'all' ? '모든 사용자' : memberId} · ${issuedCount || 0}명 발급`);
      closeAdminModal();
      showToast(`${issuedCount || 0}명에게 쿠폰을 발급했습니다.`);
      loadCoupons();
    });
  }
  function openCouponModal(coupon) {
    const c = coupon || { code: '', name: '', discount_type: 'percent', discount_value: 10, min_order_amount: 0, max_discount_amount: '', starts_at: '', ends_at: '', active: true };
    openAdminModal(`
      <button class="modal-close" data-close="adminModal">닫기 ✕</button>
      <h3>${coupon ? '쿠폰 수정' : '쿠폰 등록'}</h3>
      <div class="admin-form-grid">
        <div class="admin-field"><label>쿠폰코드</label><input id="cpCode" value="${esc(c.code)}"></div>
        <div class="admin-field"><label>이름</label><input id="cpName" value="${esc(c.name)}"></div>
        <div class="admin-field"><label>할인유형</label><select id="cpType">${optionsHtml([{ value: 'percent', label: '정률(%)' }, { value: 'fixed', label: '정액(원)' }], c.discount_type)}</select></div>
        <div class="admin-field"><label>할인값</label><input type="number" id="cpValue" value="${c.discount_value}"></div>
        <div class="admin-field"><label>최소주문금액</label><input type="number" id="cpMinOrder" value="${c.min_order_amount || 0}"></div>
        <div class="admin-field"><label>최대할인금액</label><input type="number" id="cpMaxDiscount" value="${c.max_discount_amount || ''}"></div>
        <div class="admin-field"><label>시작일</label><input type="date" id="cpStart" value="${c.starts_at ? c.starts_at.slice(0, 10) : ''}"></div>
        <div class="admin-field"><label>종료일</label><input type="date" id="cpEnd" value="${c.ends_at ? c.ends_at.slice(0, 10) : ''}"></div>
        <div class="admin-field"><label><input type="checkbox" id="cpActive" ${c.active ? 'checked' : ''}> 활성화</label></div>
      </div>
      <div class="admin-modal-foot">
        <button type="button" class="admin-btn admin-btn--ghost" data-close="adminModal">취소</button>
        <button type="button" class="admin-btn admin-btn--purple" id="cpSaveBtn">저장</button>
      </div>
    `);
    $('#cpSaveBtn').addEventListener('click', async () => {
      const payload = {
        code: $('#cpCode').value.trim(), name: $('#cpName').value.trim(), discount_type: $('#cpType').value,
        discount_value: Number($('#cpValue').value) || 0, min_order_amount: Number($('#cpMinOrder').value) || 0,
        max_discount_amount: $('#cpMaxDiscount').value ? Number($('#cpMaxDiscount').value) : null,
        starts_at: $('#cpStart').value || undefined, ends_at: $('#cpEnd').value || null, active: $('#cpActive').checked,
      };
      const saved = coupon
        ? await ok(supabaseClient.from('coupons').update(payload).eq('id', coupon.id))
        : await ok(supabaseClient.from('coupons').insert(payload));
      if (!saved) return;
      closeAdminModal();
      showToast('쿠폰이 저장되었습니다.');
      await logAdmin(coupon ? 'coupon_update' : 'coupon_create', 'coupon', coupon ? coupon.id : null, payload.code);
      loadCoupons();
    });
  }

  /* ================= 10. 배너관리 ================= */
  const BANNER_TYPE = [{ value: 'top', label: '상단' }, { value: 'main', label: '메인' }, { value: 'goods', label: '굿즈' }];
  const MEDIA_TYPE = [{ value: 'image', label: '이미지' }, { value: 'video', label: '영상' }];
  async function loadBanners() {
    const el = $('#tab-banners');
    const { data } = await supabaseClient.from('banners').select('*').order('sort_order');
    const rows = (data || []).map(b => `<tr>
      <td>${esc(BANNER_TYPE.find(t => t.value === b.banner_type)?.label || b.banner_type)}</td>
      <td class="wrap">${esc(b.title)}</td><td>${b.sort_order}</td>
      <td><span class="admin-badge ${b.active ? 'admin-badge--green' : 'admin-badge--gray'}">${b.active ? '노출' : '숨김'}</span></td>
      <td><button class="admin-btn admin-btn--sm admin-btn--ghost" data-edit-banner="${b.id}">수정</button>
      <button class="admin-btn admin-btn--sm admin-btn--danger" data-del-banner="${b.id}">삭제</button></td>
    </tr>`).join('');
    el.innerHTML = `
      <div class="admin-toolbar"><button class="admin-btn admin-btn--purple" id="addBannerBtn">+ 배너등록</button></div>
      <div class="admin-table-wrap"><table class="admin-table">
        <thead><tr><th>영역</th><th>제목</th><th>순서</th><th>상태</th><th></th></tr></thead>
        <tbody>${rows || '<tr><td colspan="5" class="admin-empty">등록된 배너가 없습니다.</td></tr>'}</tbody>
      </table></div>`;
    $('#addBannerBtn').addEventListener('click', () => openBannerModal(null));
    $all('[data-edit-banner]').forEach(b => b.addEventListener('click', () => openBannerModal((data || []).find(x => x.id === b.dataset.editBanner))));
    $all('[data-del-banner]').forEach(b => b.addEventListener('click', async () => {
      if (!confirm('배너를 삭제할까요?')) return;
      if (!await ok(supabaseClient.from('banners').delete().eq('id', b.dataset.delBanner))) return;
      showToast('배너가 삭제되었습니다.');
      await logAdmin('banner_delete', 'banner', b.dataset.delBanner, '');
      loadBanners();
    }));
  }
  function openBannerModal(banner) {
    const b = banner || { banner_type: 'main', title: '', description: '', media_url: '', media_type: 'image', link_url: '', sort_order: 0, active: true };
    openAdminModal(`
      <button class="modal-close" data-close="adminModal">닫기 ✕</button>
      <h3>${banner ? '배너 수정' : '배너 등록'}</h3>
      <div class="admin-form-grid">
        <div class="admin-field"><label>영역</label><select id="bnType">${optionsHtml(BANNER_TYPE, b.banner_type)}</select></div>
        <div class="admin-field"><label>미디어유형</label><select id="bnMediaType">${optionsHtml(MEDIA_TYPE, b.media_type)}</select></div>
        <div class="admin-field admin-field--full"><label>제목</label><input id="bnTitle" value="${esc(b.title)}"></div>
        <div class="admin-field admin-field--full"><label>설명</label><input id="bnDesc" value="${esc(b.description)}"></div>
        <div class="admin-field admin-field--full"><label>미디어 URL</label><input id="bnMedia" value="${esc(b.media_url)}"></div>
        <div class="admin-field admin-field--full"><label>링크 URL</label><input id="bnLink" value="${esc(b.link_url)}"></div>
        <div class="admin-field"><label>순서</label><input type="number" id="bnSort" value="${b.sort_order}"></div>
        <div class="admin-field"><label><input type="checkbox" id="bnActive" ${b.active ? 'checked' : ''}> 노출</label></div>
      </div>
      <div class="admin-modal-foot">
        <button type="button" class="admin-btn admin-btn--ghost" data-close="adminModal">취소</button>
        <button type="button" class="admin-btn admin-btn--purple" id="bnSaveBtn">저장</button>
      </div>
    `);
    $('#bnSaveBtn').addEventListener('click', async () => {
      const payload = {
        banner_type: $('#bnType').value, media_type: $('#bnMediaType').value, title: $('#bnTitle').value.trim() || null,
        description: $('#bnDesc').value.trim() || null, media_url: $('#bnMedia').value.trim() || null,
        link_url: $('#bnLink').value.trim() || null, sort_order: Number($('#bnSort').value) || 0, active: $('#bnActive').checked,
      };
      const saved = banner
        ? await ok(supabaseClient.from('banners').update(payload).eq('id', banner.id))
        : await ok(supabaseClient.from('banners').insert(payload));
      if (!saved) return;
      closeAdminModal();
      showToast('배너가 저장되었습니다.');
      await logAdmin(banner ? 'banner_update' : 'banner_create', 'banner', banner ? banner.id : null, payload.title);
      loadBanners();
    });
  }

  /* ================= 11. 사이트 콘텐츠 ================= */
  async function loadContent() {
    const el = $('#tab-content');
    const [{ data: contents }, { data: settings }] = await Promise.all([
      supabaseClient.from('site_contents').select('*'),
      supabaseClient.from('site_settings').select('*').order('setting_key'),
    ]);
    const contentRows = (contents || []).map(c => `<tr data-id="${c.id}">
      <td>${esc(c.section_key)}</td>
      <td><input class="sc-title" value="${esc(c.title)}" style="width:160px;"></td>
      <td><input class="sc-subtitle" value="${esc(c.subtitle)}" style="width:120px;"></td>
      <td><input class="sc-desc" value="${esc(c.description)}" style="width:220px;"></td>
      <td><input class="sc-color" value="${esc(c.representative_color)}" style="width:80px;"></td>
      <td><button class="admin-btn admin-btn--sm admin-btn--ghost" data-save-content="${c.id}">저장</button></td>
    </tr>`).join('');
    const settingRows = (settings || []).map(s => `<tr data-id="${s.id}">
      <td>${esc(s.setting_key)}</td>
      <td><input class="ss-value" value="${esc(String(s.setting_value))}" style="width:260px;"></td>
      <td><button class="admin-btn admin-btn--sm admin-btn--ghost" data-save-setting="${s.id}">저장</button></td>
    </tr>`).join('');
    el.innerHTML = `
      <p style="font-size:12px;color:var(--gray-mid);margin-bottom:12px;">여기서 수정한 문구/컬러는 메인페이지 배너·콘텐츠 제목·챗봇/상담 안내문·푸터에 실시간 반영됩니다. (레이아웃/구조는 변경되지 않습니다)</p>
      <div class="admin-section-title">화면 문구 / 대표 컬러 (site_contents)</div>
      <div class="admin-table-wrap"><table class="admin-table">
        <thead><tr><th>영역</th><th>제목</th><th>부제</th><th>설명</th><th>대표컬러</th><th></th></tr></thead>
        <tbody>${contentRows || '<tr><td colspan="6" class="admin-empty">데이터 없음</td></tr>'}</tbody>
      </table></div>
      <div class="admin-section-title">사이트 설정값 (site_settings)</div>
      <div class="admin-table-wrap"><table class="admin-table">
        <thead><tr><th>키</th><th>값</th><th></th></tr></thead>
        <tbody>${settingRows || '<tr><td colspan="3" class="admin-empty">데이터 없음</td></tr>'}</tbody>
      </table></div>`;
    $all('[data-save-content]').forEach(b => b.addEventListener('click', async () => {
      const row = b.closest('tr');
      const saved = await ok(supabaseClient.from('site_contents').update({
        title: row.querySelector('.sc-title').value || null, subtitle: row.querySelector('.sc-subtitle').value || null,
        description: row.querySelector('.sc-desc').value || null, representative_color: row.querySelector('.sc-color').value || null,
      }).eq('id', b.dataset.saveContent));
      if (!saved) return;
      showToast('저장되었습니다. 메인페이지 새로고침 시 반영됩니다.');
      await logAdmin('site_content_update', 'site_content', b.dataset.saveContent, '');
    }));
    $all('[data-save-setting]').forEach(b => b.addEventListener('click', async () => {
      const row = b.closest('tr');
      const original = (settings || []).find(s => s.id === b.dataset.saveSetting);
      const raw = row.querySelector('.ss-value').value;
      const value = original && typeof original.setting_value === 'number' ? (Number(raw) || 0) : raw;
      if (!await ok(supabaseClient.from('site_settings').update({ setting_value: value }).eq('id', b.dataset.saveSetting))) return;
      showToast('저장되었습니다.');
      await logAdmin('site_setting_update', 'site_setting', b.dataset.saveSetting, '');
    }));
  }

  /* ================= 12. 문의관리 ================= */
  async function loadInquiries() {
    const el = $('#tab-inquiries');
    const { data } = await supabaseClient.from('inquiries').select('*').order('created_at', { ascending: false });
    const rows = (data || []).map(i => `<tr>
      <td>${esc(i.name)}</td><td class="wrap">${esc(i.title)}</td><td>${fmtDate(i.created_at)}</td>
      <td><span class="admin-badge ${i.status === 'answered' ? 'admin-badge--green' : 'admin-badge--red'}">${i.status === 'pending' ? '대기' : i.status === 'answered' ? '답변완료' : '종료'}</span></td>
      <td><button class="admin-btn admin-btn--sm admin-btn--ghost" data-inquiry="${i.id}">답변</button></td>
    </tr>`).join('');
    el.innerHTML = `<div class="admin-table-wrap"><table class="admin-table">
      <thead><tr><th>작성자</th><th>제목</th><th>작성일</th><th>상태</th><th></th></tr></thead>
      <tbody>${rows || '<tr><td colspan="5" class="admin-empty">등록된 문의가 없습니다.</td></tr>'}</tbody>
    </table></div>`;
    $all('[data-inquiry]').forEach(b => b.addEventListener('click', () => openInquiryModal((data || []).find(x => x.id === b.dataset.inquiry))));
  }
  function openInquiryModal(inquiry) {
    openAdminModal(`
      <button class="modal-close" data-close="adminModal">닫기 ✕</button>
      <h3>문의 답변</h3>
      <p style="font-size:13px;color:var(--gray-mid);">${esc(inquiry.name)} · ${esc(inquiry.inquiry_type)}</p>
      <p style="font-weight:700;margin-top:8px;">${esc(inquiry.title)}</p>
      <p style="margin:8px 0;white-space:pre-line;">${esc(inquiry.content)}</p>
      <div class="admin-field"><label>답변 내용</label><textarea id="inqReply">${esc(inquiry.admin_reply)}</textarea></div>
      <div class="admin-modal-foot">
        <button type="button" class="admin-btn admin-btn--ghost" data-close="adminModal">닫기</button>
        <button type="button" class="admin-btn admin-btn--purple" id="inqSaveBtn">답변 저장</button>
      </div>
    `);
    $('#inqSaveBtn').addEventListener('click', async () => {
      const reply = $('#inqReply').value.trim();
      const saved = await ok(supabaseClient.from('inquiries').update({ admin_reply: reply || null, status: reply ? 'answered' : 'pending', answered_at: reply ? new Date().toISOString() : null }).eq('id', inquiry.id));
      if (!saved) return;
      closeAdminModal();
      showToast('답변이 저장되었습니다.');
      await logAdmin('inquiry_reply', 'inquiry', inquiry.id, '');
      loadInquiries();
    });
  }

  /* ================= 13. 회원관리 ================= */
  async function loadMembers() {
    const el = $('#tab-members');
    const { data } = await supabaseClient.from('profiles').select('id, email, name, role, status, created_at').order('created_at', { ascending: false });
    const rows = (data || []).map(m => `<tr>
      <td>${esc(m.email)}</td><td>${esc(m.name)}</td>
      <td><span class="admin-badge ${m.role === 'admin' ? 'admin-badge--purple' : 'admin-badge--gray'}">${m.role === 'admin' ? '관리자' : '일반회원'}</span></td>
      <td>
        <select data-status="${m.id}" ${m.role === 'admin' ? 'disabled' : ''}>${optionsHtml([{ value: 'active', label: '활성' }, { value: 'inactive', label: '비활성' }, { value: 'withdrawn', label: '탈퇴' }], m.status)}</select>
      </td>
      <td>${fmtDate(m.created_at)}</td>
    </tr>`).join('');
    el.innerHTML = `<p style="font-size:12px;color:var(--gray-mid);margin-bottom:10px;">보안을 위해 관리자 권한(role)은 이 화면에서 변경할 수 없습니다.</p>
      <div class="admin-table-wrap"><table class="admin-table">
      <thead><tr><th>이메일</th><th>이름</th><th>권한</th><th>상태</th><th>가입일</th></tr></thead>
      <tbody>${rows || '<tr><td colspan="5" class="admin-empty">회원이 없습니다.</td></tr>'}</tbody>
    </table></div>`;
    $all('[data-status]').forEach(sel => sel.addEventListener('change', async () => {
      if (!await ok(supabaseClient.from('profiles').update({ status: sel.value }).eq('id', sel.dataset.status))) return;
      showToast('회원 상태가 변경되었습니다.');
      await logAdmin('member_status_update', 'profile', sel.dataset.status, sel.value);
    }));
  }

  /* ================= 14. 관리자 로그 ================= */
  async function loadLogs() {
    const el = $('#tab-logs');
    const { data } = await supabaseClient
      .from('admin_logs').select('id, action, target_type, target_id, description, created_at, profiles ( name, email )')
      .order('created_at', { ascending: false }).limit(300);
    const rows = (data || []).map(l => `<tr>
      <td>${fmtDateTime(l.created_at)}</td><td>${esc(l.profiles ? (l.profiles.name || l.profiles.email) : '')}</td>
      <td>${esc(l.action)}</td><td>${esc(l.target_type)}</td><td class="wrap">${esc(l.description)}</td>
    </tr>`).join('');
    el.innerHTML = `<div class="admin-table-wrap"><table class="admin-table">
      <thead><tr><th>시간</th><th>관리자</th><th>액션</th><th>대상</th><th>설명</th></tr></thead>
      <tbody>${rows || '<tr><td colspan="5" class="admin-empty">기록된 로그가 없습니다.</td></tr>'}</tbody>
    </table></div>`;
  }

  init();
})();
