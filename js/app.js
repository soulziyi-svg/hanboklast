/**
 * 연화재실 app.js
 * Supabase Auth / Database(products, carts, orders 등)와 연동되어 동작합니다.
 */
(async function () {
  'use strict';

  const supabaseClient = window.supabaseClient;
  const {
    $, $all, showToast, openModal, closeModal, pickDefaultVariant, formatWon,
    addToCart, applyAuthUI, wireCartUI, wireAuthUI, getCurrentSession,
  } = window.ShopCommon;

  // data.js가 Supabase에서 상품 데이터를 모두 불러올 때까지 대기
  await window.COLLECTIONS_READY;

  /* ---------------- 사이트 콘텐츠 (관리자페이지에서 수정한 문구/컬러가 실제 반영됨) ---------------- */
  async function applySiteContent() {
    const [{ data: contents }, { data: settings }] = await Promise.all([
      supabaseClient.from('site_contents').select('section_key, title, subtitle, description, representative_color'),
      supabaseClient.from('site_settings').select('setting_key, setting_value'),
    ]);
    const byKey = {};
    (contents || []).forEach(c => { byKey[c.section_key] = c; });
    const setText = (el, text) => { if (el && text) el.textContent = text; };

    const topBanner = byKey.top_banner;
    if (topBanner && topBanner.description) {
      const track = $('#top-banner .top-banner__track');
      if (track) track.innerHTML = Array(2).fill(`<span>${topBanner.description}</span>`).join('<span>·</span>');
    }
    const main = byKey.main;
    if (main) {
      const firstSlide = $('.banner-slide[data-idx="0"] .banner-copy');
      if (firstSlide) {
        setText(firstSlide.querySelector('h2'), main.title);
        setText(firstSlide.querySelector('p'), main.description);
      }
    }
    // 브랜드 스토리는 확정된 디자인 문구와 레이아웃을 그대로 유지합니다.
    // 콘텐츠1 제목은 확정된 브랜드 문구와 영월체 스타일을 유지합니다.
    const goodsTitle = $all('#content2 .section-title--purple')[0];
    const accessoryTitle = $all('#content2 .section-title--purple')[1];
    setText(goodsTitle, byKey.content2_goods && byKey.content2_goods.title);
    setText(accessoryTitle, byKey.content2_accessories && byKey.content2_accessories.title);
    if (byKey.content2_goods && byKey.content2_goods.representative_color) {
      $('#content2').style.background = byKey.content2_goods.representative_color;
    }
    setText($('#reviews .reviews__title'), byKey.reviews && byKey.reviews.title);
    if (byKey.reviews && byKey.reviews.representative_color) {
      $('#reviews').style.background = byKey.reviews.representative_color;
    }
    if (byKey.chatbot) setText($('#chatbotPanel .side-panel__head span'), byKey.chatbot.title);
    if (byKey.consultation) setText($('#consultPanel .side-panel__head span'), byKey.consultation.title);
    const footer = byKey.footer;
    if (footer) {
      const brandEl = $('.footer__brand');
      if (brandEl) brandEl.textContent = [footer.title, footer.subtitle].filter(Boolean).join(' / ');
      if (footer.representative_color) $('#footer').style.background = footer.representative_color;
    }

    const s = {};
    (settings || []).forEach(row => { s[row.setting_key] = row.setting_value; });
    if (Object.keys(s).length) {
      const companyEl = $('.footer__company');
      if (companyEl) {
        companyEl.innerHTML = `
          <h4>COMPANY</h4>
          <p>상호명 : ${s.company_name || ''}</p>
          <p>대표자 : ${s.ceo_name || ''}</p>
          <p>사업자등록번호 : ${s.business_number || ''}</p>
          <p>주소 : ${s.address || ''}</p>
          <p class="footer__phone">${s.customer_service_phone || ''}</p>
          <p>E-mail : ${s.company_email || ''}</p>`;
      }
    }
  }
  await applySiteContent();

  /* ---------------- 전체 상품 평탄화 (검색/상담용) ---------------- */
  const ALL_PRODUCTS = [];
  COLLECTIONS.forEach(c => {
    const defaultVariant = pickDefaultVariant(c.variants);
    ALL_PRODUCTS.push({
      type: 'hanbok', collection: c, name: c.name,
      img: imgPath(c.dir, c.hanbokImages[0]), price: c.price,
      productId: c.productId, variantId: defaultVariant ? defaultVariant.id : null, slug: c.slug,
    });
    c.accessories.forEach(a => ALL_PRODUCTS.push({
      type: 'accessory', collection: c, name: a.name, img: imgPath(c.dir, a.file), price: a.price,
      productId: a.productId, variantId: a.variantId, slug: a.slug,
    }));
    c.goods.forEach(g => ALL_PRODUCTS.push({
      type: 'goods', collection: c, name: g.name, img: imgPath(c.dir, g.file), price: g.price,
      productId: g.productId, variantId: g.variantId, slug: g.slug,
    }));
  });

  /* ---------------- 헤더: 메가메뉴 / 햄버거 메뉴 데이터 ---------------- */
  function buildAccordion(container, list, kindLabel) {
    container.innerHTML = '';
    if (!list.length) { container.innerHTML = `<p style="font-size:12px;color:#999;">등록된 ${kindLabel} 상품 없음</p>`; return; }
    list.forEach(item => {
      const details = document.createElement('details');
      const summary = document.createElement('summary');
      summary.textContent = item.collectionName;
      const ul = document.createElement('ul');
      item.items.forEach(p => {
        const li = document.createElement('li');
        li.textContent = p.name;
        li.addEventListener('click', () => goToProduct(p));
        ul.appendChild(li);
      });
      details.appendChild(summary);
      details.appendChild(ul);
      container.appendChild(details);
    });
  }

  function goToProduct(p) {
    if (!p || !p.slug) { showToast('상세페이지 정보를 찾을 수 없습니다.'); return; }
    window.location.href = 'product.html?slug=' + encodeURIComponent(p.slug);
  }

  const megaHanbok = $('#megaHanbok');
  COLLECTIONS.forEach(c => {
    const li = document.createElement('li');
    li.textContent = c.name;
    li.addEventListener('click', () => goToProduct({ name: c.name, slug: c.slug }));
    megaHanbok.appendChild(li);
  });
  buildAccordion($('#megaAccessory'),
    COLLECTIONS.filter(c => c.accessories.length).map(c => ({
      collectionName: c.name, items: c.accessories,
    })), '악세사리');
  buildAccordion($('#megaGoods'),
    COLLECTIONS.map(c => ({ collectionName: c.name, items: c.goods })), '굿즈');

  /* ---------------- 햄버거 메뉴 패널 ---------------- */
  const hamburgerPanel = document.createElement('div');
  hamburgerPanel.className = 'side-panel';
  hamburgerPanel.id = 'hamburgerPanel';
  hamburgerPanel.hidden = true;
  hamburgerPanel.style.width = '400px';
  hamburgerPanel.innerHTML = `
    <div class="side-panel__head"><span style="font-family:var(--font-yeongwol);font-size:18px;">MENU</span>
      <button class="modal-close" data-close="hamburgerPanel">닫기 ✕</button></div>
    <div id="hamburgerAccordion" style="padding:16px 20px;font-family:var(--font-yeongwol);flex:1;overflow:auto;"></div>
    <ul style="padding:16px 20px;border-top:1px solid #eee;font-family:var(--font-yeongwol);">
      <li style="padding:8px 0;cursor:pointer;" data-scroll="brand-story">브랜드 스토리</li>
      <li style="padding:8px 0;cursor:pointer;" data-scroll="reviews">후기</li>
      <li style="padding:8px 0;cursor:pointer;" id="hamburgerConsult">상담하기</li>
    </ul>`;
  document.body.appendChild(hamburgerPanel);
  $all('[data-close]', hamburgerPanel).forEach(b => b.addEventListener('click', () => closeModal('hamburgerPanel')));
  $all('[data-scroll]', hamburgerPanel).forEach(li => li.addEventListener('click', () => {
    closeModal('hamburgerPanel');
    document.getElementById(li.dataset.scroll).scrollIntoView({ behavior: 'smooth' });
  }));
  $('#hamburgerConsult').addEventListener('click', () => { closeModal('hamburgerPanel'); openModal('consultPanel'); });

  const hAcc = $('#hamburgerAccordion');
  COLLECTIONS.forEach(c => {
    const details = document.createElement('details');
    details.innerHTML = `<summary style="cursor:pointer;padding:8px 0;font-size:15px;">${c.name}</summary>`;
    const ul = document.createElement('ul');
    const items = [{ name: c.name + ' 한복', slug: c.slug }, ...c.accessories, ...c.goods];
    items.forEach(p => {
      const li = document.createElement('li');
      li.style.cssText = 'font-size:13px;color:#777;padding:4px 0 4px 12px;cursor:pointer;';
      li.textContent = p.name;
      li.addEventListener('click', () => goToProduct(p));
      ul.appendChild(li);
    });
    details.appendChild(ul);
    hAcc.appendChild(details);
  });
  $('#hamburgerBtn').addEventListener('click', () => openModal('hamburgerPanel'));

  /* ---------------- 검색 ---------------- */
  const searchNav = $('#searchNav');
  COLLECTIONS.forEach(c => {
    const span = document.createElement('span');
    span.textContent = c.name;
    span.addEventListener('click', () => renderSearchResult(c.name));
    searchNav.appendChild(span);
  });
  function renderSearchResult(keyword) {
    const q = (keyword || '').trim().toLowerCase();
    const result = $('#searchResult');
    result.innerHTML = '';
    const matched = !q ? [] : ALL_PRODUCTS.filter(p => p.name.toLowerCase().includes(q) || p.collection.name.toLowerCase().includes(q));
    if (!q) { result.innerHTML = '<p style="text-align:center;color:#999;">검색어를 입력하거나 컬렉션을 선택해보세요.</p>'; return; }
    if (!matched.length) { result.innerHTML = '<p style="text-align:center;color:#999;">검색 결과가 없습니다.</p>'; return; }
    matched.forEach(p => {
      const div = document.createElement('div');
      div.className = 'result-card';
      div.innerHTML = `<img src="${p.img}" alt="${p.name}"><span>${p.name}</span>`;
      div.addEventListener('click', () => goToProduct(p));
      result.appendChild(div);
    });
  }
  $('#searchBtn').addEventListener('click', () => { openModal('searchModal'); renderSearchResult(''); });
  $('#searchInput').addEventListener('input', e => renderSearchResult(e.target.value));

  /* ---------------- 메인 배너 ---------------- */
  (function mainBanner() {
    const slides = $all('.banner-slide');
    const progress = $('#bannerProgress');
    slides.forEach((s, i) => {
      const dot = document.createElement('span');
      if (i === 0) dot.className = 'is-active';
      dot.addEventListener('click', () => go(i));
      progress.appendChild(dot);
    });
    let idx = 0, timer;
    function go(i) {
      slides[idx].classList.remove('is-active');
      progress.children[idx].classList.remove('is-active');
      const v = slides[idx].querySelector('video'); if (v) v.pause();
      idx = (i + slides.length) % slides.length;
      slides[idx].classList.add('is-active');
      progress.children[idx].classList.add('is-active');
      const nv = slides[idx].querySelector('video'); if (nv) { nv.currentTime = 0; nv.play().catch(() => {}); }
      restart();
    }
    function restart() { clearInterval(timer); timer = setInterval(() => go(idx + 1), 8000); }
    $('.banner-arrow--prev').addEventListener('click', () => go(idx - 1));
    $('.banner-arrow--next').addEventListener('click', () => go(idx + 1));
    restart();
  })();

  /* ---------------- 컨텐츠1 : 마퀴 ---------------- */
  (function marquee() {
    const track = $('#marqueeTrack');
    function buildCard(c) {
      const card = document.createElement('div');
      card.className = 'p-card';
      const imgwrap = document.createElement('div');
      imgwrap.className = 'p-card__imgwrap';
      c.hanbokImages.forEach((f, i) => {
        const img = document.createElement('img');
        img.src = imgPath(c.dir, f);
        img.alt = `${c.name} 착용 이미지 ${i + 1}`;
        if (i === 0) img.classList.add('is-active');
        imgwrap.appendChild(img);
      });
      const hoverImg = document.createElement('img');
      // 달빛하얀소복은 DB 이미지 순서와 관계없이 실제 상품 단독컷을 사용합니다.
      const isDalbitSobok = c.name === '달빛하얀소복' || c.dir === '달빛하얀소복';
      const hoverFile = isDalbitSobok ? '정면.png' : c.productOnly;
      hoverImg.src = imgPath(c.dir, hoverFile);
      hoverImg.alt = `${c.name} 상품 단독 이미지`;
      hoverImg.className = 'is-hover';
      imgwrap.appendChild(hoverImg);

      const cartBtn = document.createElement('button');
      cartBtn.className = 'p-card__cart';
      cartBtn.textContent = '🛒';
      cartBtn.addEventListener('click', e => {
        e.stopPropagation();
        const defaultVariant = pickDefaultVariant(c.variants);
        addToCart({ name: c.name + ' 한복', productId: c.productId, variantId: defaultVariant ? defaultVariant.id : null });
      });

      const stockLabel = ['S', 'M', 'L'].map(size => {
        const v = c.variants[size];
        if (!v) return '';
        const label = v.stock <= 0 ? '품절' : `${v.stock}개`;
        return `<span class="${v.stock <= 0 ? 'is-soldout' : ''}">[ ${size} · ${label} ]</span>`;
      }).join(' ');

      const body = document.createElement('div');
      body.className = 'p-card__body';
      body.innerHTML = `
        <div class="p-card__name">${c.name}</div>
        <div class="p-card__desc">개량한복 · 사진 촬영에 어울리는 우아한 실루엣</div>
        <div class="p-card__rating">★★★★☆ 4.8</div>
        <div class="p-card__price">${formatWon(c.price)}</div>
        <div class="p-card__stock">${stockLabel}</div>`;

      card.appendChild(imgwrap);
      card.appendChild(cartBtn);
      card.appendChild(body);
      card.addEventListener('click', () => goToProduct({ name: c.name, slug: c.slug }));

      let cycle = 0, cycleTimer;
      function startCycle() {
        cycleTimer = setInterval(() => {
          const imgs = imgwrap.querySelectorAll('img:not(.is-hover)');
          imgs[cycle].classList.remove('is-active');
          cycle = (cycle + 1) % imgs.length;
          imgs[cycle].classList.add('is-active');
        }, 2000);
      }
      startCycle();
      return card;
    }
    const cards = COLLECTIONS.map(buildCard);
    cards.forEach(c => track.appendChild(c));
    COLLECTIONS.map(buildCard).forEach(c => track.appendChild(c)); // seamless loop 복제
  })();

  /* ---------------- 컨텐츠2 : coverflow 배너 ---------------- */
  (function coverflow() {
    const imgs = $all('#coverflowTrack img');
    const progress = $('#coverflowProgress');
    imgs.forEach((_, i) => {
      const dot = document.createElement('span');
      if (i === 0) dot.className = 'is-active';
      progress.appendChild(dot);
    });
    let idx = 0, timer;
    function render() {
      imgs.forEach((img, i) => {
        img.classList.remove('is-current', 'is-prev', 'is-next');
        if (i === idx) img.classList.add('is-current');
        else if (i === (idx - 1 + imgs.length) % imgs.length) img.classList.add('is-prev');
        else if (i === (idx + 1) % imgs.length) img.classList.add('is-next');
        else img.style.opacity = 0;
        if (i === idx || i === (idx - 1 + imgs.length) % imgs.length || i === (idx + 1) % imgs.length) img.style.opacity = 1;
      });
      $all('span', progress).forEach((d, i) => d.classList.toggle('is-active', i === idx));
    }
    function go(i) { idx = (i + imgs.length) % imgs.length; render(); restart(); }
    function restart() { clearInterval(timer); timer = setInterval(() => go(idx + 1), 4000); }
    $('.coverflow-arrow--prev').addEventListener('click', () => go(idx - 1));
    $('.coverflow-arrow--next').addEventListener('click', () => go(idx + 1));
    imgs.forEach((img, i) => img.addEventListener('click', () => go(i)));
    render(); restart();
  })();

  /* ---------------- 컨텐츠2 : 굿즈/악세사리 버튼+카드 ---------------- */
  function buildSubSection(btnWrap, cardWrap, key, isAccessory) {
    const withData = COLLECTIONS.filter(c => (isAccessory ? c.accessories.length : c.goods.length));
    withData.forEach((c, i) => {
      const btn = document.createElement('button');
      btn.className = 'coll-btn' + (i === 0 ? ' is-active' : '');
      btn.textContent = c.name;
      btn.addEventListener('click', () => {
        $all('.coll-btn', btnWrap).forEach(b => b.classList.remove('is-active'));
        btn.classList.add('is-active');
        renderCards(c);
      });
      btnWrap.appendChild(btn);
    });
    function renderCards(c) {
      cardWrap.innerHTML = '';
      const list = isAccessory ? c.accessories : c.goods;
      list.forEach(item => {
        const card = document.createElement('div');
        card.className = 'sub-card' + (isAccessory ? ' sub-card--accessory' : '');
        const isSoldOut = item.stock <= 0;
        card.innerHTML = `
          <div style="position:relative;">
            <img class="sub-card__img" src="${imgPath(c.dir, item.file)}" alt="${item.name}">
            <button class="sub-card__cart">🛒</button>
          </div>
          <div class="sub-card__body">
            <div><b>${item.name}</b></div>
            <p style="font-size:13px;color:#777;line-height:1.5;">${c.name} 컬렉션과 어울리는 구성품입니다.<br>선물 및 소장용으로 인기가 많습니다.</p>
            <div class="p-card__rating">★★★★☆ 4.7</div>
            <div class="sub-card__price">${formatWon(item.price)}</div>
            <div class="sub-card__stock">${isSoldOut ? '품절' : `[ ${item.stock} ]개 남았어요`}</div>
          </div>`;
        card.addEventListener('click', () => goToProduct(item));
        card.querySelector('.sub-card__cart').addEventListener('click', e => {
          e.stopPropagation();
          if (isSoldOut) { showToast('품절된 상품입니다.'); return; }
          addToCart({ name: item.name, productId: item.productId, variantId: item.variantId });
        });
        cardWrap.appendChild(card);
      });
    }
    if (withData.length) renderCards(withData[0]);
  }
  buildSubSection($('#goodsButtons'), $('#goodsCards'), 'goods', false);
  buildSubSection($('#accessoryButtons'), $('#accessoryCards'), 'accessory', true);

  /* ---------------- 후기 (실제 reviews 테이블 연동) ---------------- */
  async function renderHomeReviews() {
    const grid = $('#reviewGrid');
    const { data: reviews } = await supabaseClient
      .from('reviews')
      .select('id, nickname, rating, content, created_at, products ( name ), review_tags ( tag )')
      .eq('is_visible', true)
      .order('created_at', { ascending: false })
      .limit(12);
    if (!reviews || !reviews.length) {
      grid.innerHTML = '<p class="reviews__empty">아직 등록된 후기가 없습니다. 첫 구매 후기를 남겨보세요!</p>';
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
        <div class="review-card__tags">${tags}${tags && r.products ? ' · ' : ''}${r.products ? r.products.name : ''}</div>`;
      grid.appendChild(div);
    });
  }
  await renderHomeReviews();

  /* ---------------- 푸터 SHOP 목록 ---------------- */
  const footerShop = $('#footerShop');
  COLLECTIONS.forEach(c => {
    const li = document.createElement('li');
    li.style.cursor = 'pointer';
    li.textContent = c.name;
    li.addEventListener('click', () => goToProduct({ name: c.name, slug: c.slug }));
    footerShop.appendChild(li);
  });

  /* ---------------- 장바구니 / 로그인 / 회원가입 (js/shop-common.js 공용 로직 사용) ---------------- */
  wireCartUI();
  wireAuthUI();
  await applyAuthUI();

  /* ---------------- 배송조회 ---------------- */
  const TRACK_STATUS_ORDER = ['paid', 'preparing', 'shipping', 'delivered', 'confirmed'];
  const TRACK_STATUS_LABEL = { paid: '결제완료', preparing: '상품준비중', shipping: '배송중', delivered: '배송완료', confirmed: '구매확정' };

  async function renderTrackModal() {
    const info = $('#trackOrderInfo');
    const steps = $('#trackSteps');
    const session = await getCurrentSession();
    if (!session) {
      info.textContent = '로그인 후 최근 주문의 배송 상태를 확인하실 수 있습니다.';
      steps.innerHTML = TRACK_STATUS_ORDER.map(s => `<div class="track-step">${TRACK_STATUS_LABEL[s]}</div>`).join('');
      return;
    }
    const { data: order } = await supabaseClient
      .from('orders')
      .select('order_number, order_status, shipments ( status )')
      .eq('user_id', session.user.id)
      .order('ordered_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!order) {
      info.textContent = '아직 주문 내역이 없습니다.';
      steps.innerHTML = TRACK_STATUS_ORDER.map(s => `<div class="track-step">${TRACK_STATUS_LABEL[s]}</div>`).join('');
      return;
    }
    const shipmentStatus = order.shipments && order.shipments[0] ? order.shipments[0].status : null;
    const currentStatus = shipmentStatus === 'delivered' ? 'delivered' : shipmentStatus === 'shipping' ? 'shipping'
      : order.order_status === 'confirmed' ? 'confirmed' : 'preparing';
    const currentIdx = TRACK_STATUS_ORDER.indexOf(currentStatus);
    info.textContent = `주문번호 ${order.order_number}`;
    steps.innerHTML = TRACK_STATUS_ORDER.map((s, i) => {
      const cls = i < currentIdx ? 'is-done' : i === currentIdx ? 'is-current' : '';
      return `<div class="track-step ${cls}">${TRACK_STATUS_LABEL[s]}</div>`;
    }).join('');
  }

  $('#trackBtn').addEventListener('click', async () => { openModal('trackModal'); await renderTrackModal(); });

  /* ---------------- 챗봇 (chatbot_keywords DB + GPT Edge Function) ---------------- */
  (async function chatbot() {
    const FALLBACK_KEYWORDS = {
      '배송안내': '결제 완료 후 상품준비중 → 배송중 → 배송완료 순으로 진행되며, 배송조회 아이콘에서 실시간 확인이 가능합니다.',
      '교환안내': '상품 수령 후 7일 이내 미착용 상태에서 교환 신청이 가능합니다.',
    };
    let chatSessionId = null;

    async function ensureChatSession() {
      if (chatSessionId) return chatSessionId;
      const session = await getCurrentSession();
      const { data, error } = await supabaseClient
        .from('chat_sessions')
        .insert({ user_id: session ? session.user.id : null, session_key: crypto.randomUUID() })
        .select('id').single();
      chatSessionId = error ? null : data.id;
      return chatSessionId;
    }
    async function saveMessage(who, message) {
      const id = await ensureChatSession();
      if (!id) return;
      const role = who === 'bot' ? 'assistant' : 'user'; // chat_messages.role은 user/assistant/system만 허용
      await supabaseClient.from('chat_messages').insert({ chat_session_id: id, role, message });
    }

    const { data: keywordRows } = await supabaseClient
      .from('chatbot_keywords').select('keyword, answer').eq('active', true).order('sort_order');
    const KEYWORDS = {};
    (keywordRows && keywordRows.length ? keywordRows : Object.entries(FALLBACK_KEYWORDS).map(([keyword, answer]) => ({ keyword, answer })))
      .forEach(k => { KEYWORDS[k.keyword] = k.answer; });

    const kwWrap = $('#chatbotKeywords');
    Object.keys(KEYWORDS).forEach(k => {
      const btn = document.createElement('button');
      btn.textContent = k;
      btn.addEventListener('click', () => {
        addBubble(k, 'user'); saveMessage('user', k);
        addBubble(KEYWORDS[k], 'bot'); saveMessage('bot', KEYWORDS[k]);
      });
      kwWrap.appendChild(btn);
    });
    function addBubble(text, who) {
      const div = document.createElement('div');
      div.className = 'chat-bubble chat-bubble--' + who;
      div.textContent = text;
      $('#chatbotMessages').appendChild(div);
      $('#chatbotMessages').scrollTop = $('#chatbotMessages').scrollHeight;
    }
    addBubble('안녕하세요 고객님! 연화재실입니다. 궁금하신 점을 키워드로 선택하거나 직접 입력해주세요.', 'bot');

    function fallbackReply(text) {
      if (/배송|택배/.test(text)) return KEYWORDS['배송안내'] || FALLBACK_KEYWORDS['배송안내'];
      if (/교환|환불|반품/.test(text)) return KEYWORDS['교환안내'] || FALLBACK_KEYWORDS['교환안내'];
      return '문의 감사합니다! 더 자세한 답변은 우측 하단 "상담하기"를 이용해주세요.';
    }
    async function getReply(text) {
      try {
        const { data, error } = await supabaseClient.functions.invoke('chatbot', { body: { message: text } });
        if (error || !data || data.error || !data.reply) throw error || new Error(data && data.error);
        return data.reply;
      } catch (err) {
        return fallbackReply(text);
      }
    }
    $('#chatbotForm').addEventListener('submit', async e => {
      e.preventDefault();
      const val = $('#chatbotInput').value.trim();
      if (!val) return;
      addBubble(val, 'user'); saveMessage('user', val);
      $('#chatbotInput').value = '';
      const reply = await getReply(val);
      addBubble(reply, 'bot'); saveMessage('bot', reply);
    });
    $('#chatbotInput').addEventListener('keydown', e => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); $('#chatbotForm').requestSubmit(); }
    });
    $('#chatbotIcon').addEventListener('click', () => openModal('chatbotPanel'));
  })();

  /* ---------------- 상담하기 ---------------- */
  (function consult() {
    const steps = ['성별', '연령', '목적', '취향', '추천'];
    const progressWrap = $('#consultProgress');
    steps.forEach((s, i) => {
      const span = document.createElement('span');
      span.textContent = `0${i + 1} ${s}`;
      progressWrap.appendChild(span);
    });
    const state = { gender: null, age: null, purpose: null, picks: [], consultationId: null };
    let step = 0;

    async function startConsultationSession() {
      const session = await getCurrentSession();
      const { data, error } = await supabaseClient
        .from('consultation_sessions')
        .insert({
          user_id: session ? session.user.id : null,
          session_key: crypto.randomUUID(),
          current_step: 0,
        })
        .select('id').single();
      state.consultationId = error ? null : data.id;
    }
    const PURPOSE_DB_VALUE = { '졸업사진': 'graduation', '가족사진': 'family_photo', '여행': 'travel', '코스프레': 'cosplay', '공연': 'performance' };
    async function updateConsultationSession(fields) {
      if (!state.consultationId) return;
      if (fields.purpose) fields = { ...fields, purpose: PURPOSE_DB_VALUE[fields.purpose] || null };
      await supabaseClient.from('consultation_sessions').update(fields).eq('id', state.consultationId);
    }
    async function saveConsultationSelections() {
      if (!state.consultationId || !state.picks.length) return;
      await supabaseClient.from('consultation_selections').insert(
        state.picks.filter(p => p.productId).map(p => ({ consultation_id: state.consultationId, product_id: p.productId }))
      );
    }
    async function saveRecommendationResults(best, others) {
      if (!state.consultationId) return;
      const rows = [];
      if (best.productId) rows.push({ consultation_id: state.consultationId, product_id: best.productId, match_score: 96, ranking: 1, reason: `${state.gender || ''} · ${state.age || ''} · ${state.purpose || ''} 고객님께 가장 잘 맞는 의상` });
      others.forEach((o, i) => {
        if (o.productId) rows.push({ consultation_id: state.consultationId, product_id: o.productId, match_score: 96 - (i + 1) * 3, ranking: i + 2, reason: `${state.purpose || ''} 컨셉과 함께 어울리는 추천 의상` });
      });
      if (rows.length) await supabaseClient.from('recommendation_results').insert(rows);
      await updateConsultationSession({ completed: true, completed_at: new Date().toISOString() });
    }

    function setProgress() {
      $all('span', progressWrap).forEach((s, i) => s.classList.toggle('is-active', i === step));
    }
    function renderStep() {
      setProgress();
      const body = $('#consultBody');
      body.innerHTML = '';
      body.classList.remove('consult-body'); void body.offsetWidth; body.classList.add('consult-body');
      const title = document.createElement('h3');
      title.style.textAlign = 'center';
      title.style.fontFamily = 'var(--font-yeongwol)';

      if (step === 0) {
        title.textContent = '반갑습니다, 고객님! 고객님의 성별을 알려주세요.';
        body.appendChild(title);
        body.appendChild(optionRow(['남자', '여자'], 'gender'));
      } else if (step === 1) {
        title.textContent = '고객님의 연령대를 알려주세요.';
        body.appendChild(title);
        body.appendChild(optionRow(['10대', '20~30대', '40대', '50대', '60대 이상'], 'age'));
      } else if (step === 2) {
        title.textContent = '구매 목적은 무엇인가요?';
        body.appendChild(title);
        body.appendChild(optionRow(['졸업사진', '가족사진', '여행', '코스프레', '공연'], 'purpose'));
      } else if (step === 3) {
        title.textContent = '마음에 드시는 의상을 모두 골라주세요';
        body.appendChild(title);
        const grid = document.createElement('div');
        grid.className = 'consult-grid';
        const pool = shuffle(ALL_PRODUCTS.filter(p => p.type === 'hanbok' || p.type === 'goods')).slice(0, 30);
        pool.forEach(p => {
          const item = document.createElement('div');
          item.className = 'cg-item';
          item.innerHTML = `<img src="${p.img}" alt="${p.name}"><span>${p.name}</span>`;
          item.addEventListener('click', () => {
            const idx = state.picks.indexOf(p);
            if (idx > -1) { state.picks.splice(idx, 1); item.classList.remove('is-selected'); }
            else { state.picks.push(p); item.classList.add('is-selected'); }
          });
          grid.appendChild(item);
        });
        body.appendChild(grid);
        const next = document.createElement('button');
        next.className = 'consult-next';
        next.textContent = '다음';
        next.addEventListener('click', async () => {
          await saveConsultationSelections();
          step++;
          renderStep();
        });
        body.appendChild(next);
      } else if (step === 4) {
        renderResult(body);
      }
    }
    function optionRow(labels, key) {
      const row = document.createElement('div');
      row.className = 'consult-options';
      labels.forEach(l => {
        const btn = document.createElement('button');
        btn.textContent = l;
        btn.addEventListener('click', () => {
          state[key] = l;
          step++;
          updateConsultationSession({ gender: state.gender, age_group: state.age, purpose: state.purpose, current_step: step });
          renderStep();
        });
        row.appendChild(btn);
      });
      return row;
    }
    function shuffle(arr) { return arr.map(v => [Math.random(), v]).sort((a, b) => a[0] - b[0]).map(v => v[1]); }
    function renderResult(body) {
      const base = state.picks.length ? state.picks : shuffle(ALL_PRODUCTS.filter(p => p.type === 'hanbok'));
      const best = base[0];
      const others = shuffle(ALL_PRODUCTS.filter(p => p.type === 'hanbok' && p.name !== best.name)).slice(0, 3);
      saveRecommendationResults(best, others);
      body.innerHTML = `
        <h3 style="text-align:center;font-family:var(--font-yeongwol);">고객님 취향을 분석했어요!</h3>
        <p style="text-align:center;color:#777;font-size:13px;">선택하신 정보를 기준으로 잘 어울릴 만한 의상을 골라봤어요.<br>
        ${state.gender || ''} · ${state.age || ''} · ${state.purpose || ''}</p>
        <hr style="border:none;border-top:1px solid #eee;margin:20px 0;">
        <div style="text-align:center;">
          <p style="color:var(--purple);font-weight:800;">BEST MATCH 96%</p>
          <img src="${best.img}" alt="${best.name}" style="width:220px;height:280px;object-fit:cover;margin:0 auto;">
          <h4 style="font-family:var(--font-yeongwol);font-size:20px;">${best.name}</h4>
          <p style="font-size:13px;color:#777;">고객님의 선택과 가장 잘 맞는 의상이에요</p>
          <div style="display:flex;gap:10px;justify-content:center;margin-top:12px;">
            <button class="consult-next" style="margin:0;" id="consultDetail">상품 자세히 보기 →</button>
            <button class="consult-next" style="margin:0;background:var(--purple);" id="consultAddCart">장바구니 담기</button>
          </div>
        </div>
        <hr style="border:none;border-top:1px solid #eee;margin:24px 0;">
        <p style="text-align:center;font-family:var(--font-yeongwol);">이런 의상도 좋아하실 것 같아요</p>
        <div style="display:flex;gap:12px;justify-content:center;margin-top:12px;">
          ${others.map((o, i) => `
            <div style="text-align:center;font-size:12px;">
              <img src="${o.img}" alt="${o.name}" style="width:110px;height:140px;object-fit:cover;">
              <p style="color:var(--purple);font-weight:800;">${96 - (i + 1) * 3}%</p>
              <p>${o.name}</p>
            </div>`).join('')}
        </div>
        <button class="consult-next" id="consultRestart">처음부터 다시하기</button>`;
      $('#consultDetail').addEventListener('click', () => goToProduct(best));
      $('#consultAddCart').addEventListener('click', () => addToCart({ name: best.name, productId: best.productId, variantId: best.variantId }));
      $('#consultRestart').addEventListener('click', () => {
        step = 0; state.gender = state.age = state.purpose = null; state.picks = []; state.consultationId = null;
        renderStep();
        startConsultationSession();
      });
    }
    $('#consultIcon').addEventListener('click', () => {
      step = 0; state.gender = state.age = state.purpose = null; state.picks = []; state.consultationId = null;
      renderStep();
      openModal('consultPanel');
      startConsultationSession();
    });
  })();

  /* ---------------- 탑버튼 ---------------- */
  (function topBtn() {
    const btn = $('#topBtn');
    let hideTimer;
    window.addEventListener('scroll', () => {
      btn.classList.add('is-visible');
      clearTimeout(hideTimer);
      hideTimer = setTimeout(() => btn.classList.remove('is-visible'), 3000);
    });
    btn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
  })();

  /* ---------------- 랜덤 배회 아이콘 + 영상 팝업 ---------------- */
  (function roamIcon() {
    const icon = $('#roamIcon');
    const toggle = $('#roamToggle');
    let x = window.innerWidth / 2, y = window.innerHeight / 2;
    let vx = (Math.random() - 0.5) * 1.2, vy = (Math.random() - 0.5) * 1.2;
    let raf;
    function step() {
      x += vx; y += vy;
      const maxX = window.innerWidth - 80, maxY = window.innerHeight - 80;
      if (x < 0 || x > maxX) { vx *= -1; x = Math.max(0, Math.min(x, maxX)); }
      if (y < 100 || y > maxY) { vy *= -1; y = Math.max(100, Math.min(y, maxY)); }
      icon.style.transform = `translate(${x}px, ${y}px)`;
      icon.src = vx < 0 ? 'img/좌좌.png' : 'img/우우.png';
      raf = requestAnimationFrame(step);
    }
    function start() { icon.hidden = false; if (!raf) step(); }
    function stop() { icon.hidden = true; cancelAnimationFrame(raf); raf = null; }
    toggle.addEventListener('change', () => (toggle.checked ? start() : stop()));
    icon.style.position = 'fixed'; icon.style.left = '0'; icon.style.top = '0';
    if (toggle.checked) start();

    icon.addEventListener('click', () => {
      const overlay = $('#videoOverlay');
      const video = $('#roamVideo');
      overlay.hidden = false;
      requestAnimationFrame(() => overlay.classList.add('is-visible'));
      video.currentTime = 0;
      video.play().catch(() => {});
      setTimeout(() => {
        overlay.classList.remove('is-visible');
        setTimeout(() => { overlay.hidden = true; video.pause(); }, 300);
      }, 5000);
    });
  })();

})();
