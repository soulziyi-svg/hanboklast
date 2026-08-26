/**
 * 연화재실 app.js
 * 주의: 아직 supabase MCP OAuth 인증이 완료되지 않아 Supabase Auth / Database 연동이
 * 되어있지 않습니다. 그 사이 사용자 경험을 보여주기 위해 로그인/장바구니는
 * 브라우저 localStorage를 임시로 사용합니다. (Supabase 연동 완료 즉시 교체 예정 - TODO)
 */
(function () {
  'use strict';

  const $ = (sel, root) => (root || document).querySelector(sel);
  const $all = (sel, root) => Array.from((root || document).querySelectorAll(sel));

  /* ---------------- 공통 유틸 ---------------- */
  function showToast(msg, ms) {
    const toast = $('#toast');
    toast.textContent = msg;
    toast.hidden = false;
    clearTimeout(showToast._t);
    showToast._t = setTimeout(() => { toast.hidden = true; }, ms || 2000);
  }

  function openModal(id) { const el = document.getElementById(id); if (el) el.hidden = false; }
  function closeModal(id) { const el = document.getElementById(id); if (el) el.hidden = true; }

  $all('[data-close]').forEach(btn => btn.addEventListener('click', () => closeModal(btn.dataset.close)));
  $all('[data-open]').forEach(btn => btn.addEventListener('click', () => openModal(btn.dataset.open)));
  $all('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', e => { if (e.target === overlay) overlay.hidden = true; });
  });

  /* ---------------- 전체 상품 평탄화 (검색/상담용) ---------------- */
  const ALL_PRODUCTS = [];
  COLLECTIONS.forEach(c => {
    ALL_PRODUCTS.push({
      type: 'hanbok', collection: c, name: c.name,
      img: imgPath(c.dir, c.hanbokImages[0]), price: c.price,
    });
    c.accessories.forEach(a => ALL_PRODUCTS.push({
      type: 'accessory', collection: c, name: a.name, img: imgPath(c.dir, a.file), price: a.price,
    }));
    c.goods.forEach(g => ALL_PRODUCTS.push({
      type: 'goods', collection: c, name: g.name, img: imgPath(c.dir, g.file), price: g.price,
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
    showToast(`"${p.name}" 상세페이지는 다음 업데이트에서 제공됩니다.`);
  }

  const megaHanbok = $('#megaHanbok');
  COLLECTIONS.forEach(c => {
    const li = document.createElement('li');
    li.textContent = c.name;
    li.addEventListener('click', () => goToProduct({ name: c.name }));
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
    const items = [{ name: c.name + ' 한복' }, ...c.accessories, ...c.goods];
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
      hoverImg.src = imgPath(c.dir, c.productOnly);
      hoverImg.alt = `${c.name} 상품 단독 이미지`;
      hoverImg.className = 'is-hover';
      imgwrap.appendChild(hoverImg);

      const cartBtn = document.createElement('button');
      cartBtn.className = 'p-card__cart';
      cartBtn.textContent = '🛒';
      cartBtn.addEventListener('click', e => {
        e.stopPropagation();
        addToCart({ name: c.name + ' 한복', img: imgPath(c.dir, c.hanbokImages[0]), price: c.price, id: c.id });
      });

      const body = document.createElement('div');
      body.className = 'p-card__body';
      body.innerHTML = `
        <div class="p-card__name">${c.name}</div>
        <div class="p-card__desc">개량한복 · 사진 촬영에 어울리는 우아한 실루엣</div>
        <div class="p-card__rating">★★★★☆ 4.8</div>
        <div class="p-card__price">${formatWon(c.price)}</div>
        <div class="p-card__stock"><span>재고 정보는 DB 연동 후 표시</span></div>`;

      card.appendChild(imgwrap);
      card.appendChild(cartBtn);
      card.appendChild(body);
      card.addEventListener('click', () => goToProduct({ name: c.name }));

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
      card.addEventListener('mouseenter', () => { hoverImg.style.opacity = 1; });
      card.addEventListener('mouseleave', () => { hoverImg.style.opacity = 0; });

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
        const isHot = Math.random() < 0.35;
        card.innerHTML = `
          <div style="position:relative;">
            <img class="sub-card__img" src="${imgPath(c.dir, item.file)}" alt="${item.name}">
            <button class="sub-card__cart">🛒</button>
          </div>
          <div class="sub-card__body">
            <div>${isHot ? '<span class="sub-card__hot">HOT</span>' : ''}<b>${item.name}</b></div>
            <p style="font-size:13px;color:#777;line-height:1.5;">${c.name} 컬렉션과 어울리는 구성품입니다.<br>선물 및 소장용으로 인기가 많습니다.<br>상세 재고는 DB 연동 후 표시됩니다.</p>
            <div class="p-card__rating">★★★★☆ 4.7</div>
            <div class="sub-card__price">${formatWon(item.price)}</div>
            <div class="sub-card__stock">[ ${Math.floor(Math.random() * 30) + 5} ]개 남았어요</div>
          </div>`;
        card.addEventListener('click', () => goToProduct(item));
        card.querySelector('.sub-card__cart').addEventListener('click', e => {
          e.stopPropagation();
          addToCart({ name: item.name, img: imgPath(c.dir, item.file), price: item.price, id: c.id + '-' + item.name });
        });
        cardWrap.appendChild(card);
      });
    }
    if (withData.length) renderCards(withData[0]);
  }
  buildSubSection($('#goodsButtons'), $('#goodsCards'), 'goods', false);
  buildSubSection($('#accessoryButtons'), $('#accessoryCards'), 'accessory', true);

  /* ---------------- 후기 (텍스트만, 실제 리뷰 이미지 폴더 없음) ---------------- */
  (function reviews() {
    const samples = [
      { name: '장철희', date: '2026.07.15', text: '졸업사진 찍으려고 친구 6명이 같이 빌렸어요. 좋은추억 입어보고 갑니다.', tags: '#여행 #졸업사진 #프로필사진', product: '설화먹비', rating: 5 },
      { name: '김O영', date: '2026.07.02', text: '외국인 친구들이랑 서울 여행 중에 입었는데 다들 너무 좋아했어요!', tags: '#여행 #외국인친구', product: '홍연화담', rating: 4.5 },
      { name: '박O수', date: '2026.06.28', text: '가족사진 찍으러 다녀왔는데 색감이 정말 곱더라구요.', tags: '#가족사진', product: '봄빛연분홍', rating: 5 },
      { name: '이O진', date: '2026.06.20', text: '코스프레 컨셉으로 입었는데 만족도 최고였습니다.', tags: '#코스프레 #파티', product: '흑청월화', rating: 4.5 },
      { name: '최O아', date: '2026.06.10', text: '고등학교 졸업사진 컨셉 완전 특별했어요. 친구들도 다 부러워함.', tags: '#졸업사진', product: '묵화연무', rating: 5 },
      { name: '정O우', date: '2026.05.30', text: '파티 컨셉으로 대여했는데 사진이 정말 잘 나왔어요.', tags: '#파티', product: '먹빛화연', rating: 4 },
      { name: '한O림', date: '2026.05.22', text: '전통적인 느낌이 살아있으면서도 편하게 움직일 수 있어서 좋았어요.', tags: '#여행 #프로필사진', product: '달빛하얀소복', rating: 5 },
      { name: '오O빈', date: '2026.05.15', text: '악세사리까지 세트로 챙겨주셔서 촬영이 훨씬 풍성했습니다.', tags: '#가족사진 #악세사리', product: '설화먹비', rating: 4.5 },
      { name: '윤O서', date: '2026.05.02', text: '색이 정말 고와서 사진발 잘 받았어요. 재구매 의사 있습니다.', tags: '#여행', product: '봄빛연분홍', rating: 5 },
      { name: '임O찬', date: '2026.04.20', text: '공연 무대의상으로 활용했는데 반응이 너무 좋았어요.', tags: '#공연', product: '흑청월화', rating: 4.5 },
      { name: '서O은', date: '2026.04.10', text: '좋아하는 캐릭터 컨셉으로 촬영했는데 만족스러웠습니다.', tags: '#코스프레', product: '홍연화담', rating: 4 },
      { name: '문O호', date: '2026.03.28', text: '굿즈까지 같이 구매했는데 완성도가 높아서 좋았습니다.', tags: '#굿즈 #프로필사진', product: '묵화연무', rating: 5 },
    ];
    const grid = $('#reviewGrid');
    samples.forEach(r => {
      const full = Math.floor(r.rating);
      const half = r.rating % 1 !== 0;
      const stars = '★'.repeat(full) + (half ? '⯪' : '') + '☆'.repeat(5 - full - (half ? 1 : 0));
      const div = document.createElement('div');
      div.className = 'review-card';
      div.innerHTML = `
        <div class="review-card__head"><span>${r.name}</span><span>${r.date}</span></div>
        <div class="review-card__rating">${stars} ${r.rating}</div>
        <p class="review-card__text">"${r.text}"</p>
        <div class="review-card__tags">${r.tags} · ${r.product}</div>`;
      grid.appendChild(div);
    });
  })();

  /* ---------------- 푸터 SHOP 목록 ---------------- */
  const footerShop = $('#footerShop');
  COLLECTIONS.forEach(c => {
    const li = document.createElement('li');
    li.style.cursor = 'pointer';
    li.textContent = c.name;
    li.addEventListener('click', () => goToProduct({ name: c.name }));
    footerShop.appendChild(li);
  });

  /* ---------------- 장바구니 (임시 localStorage - Supabase 연동 전) ---------------- */
  const CART_KEY = 'yeonhwajaesil_cart_temp';
  function getCart() { try { return JSON.parse(localStorage.getItem(CART_KEY)) || []; } catch (e) { return []; } }
  function setCart(items) { localStorage.setItem(CART_KEY, JSON.stringify(items)); renderCartBadge(); }
  function addToCart(product) {
    const cart = getCart();
    const found = cart.find(i => i.id === product.id);
    if (found) found.qty += 1; else cart.push({ ...product, qty: 1 });
    setCart(cart);
    showToast('✓ 장바구니에 추가되었습니다.');
  }
  function renderCartBadge() {
    const cart = getCart();
    $('#cartCount').textContent = cart.reduce((s, i) => s + i.qty, 0);
  }
  function renderCartModal() {
    const cart = getCart();
    const wrap = $('#cartItems');
    wrap.innerHTML = '';
    if (!cart.length) {
      wrap.innerHTML = '<div class="cart-empty">아직 장바구니가 비어있어요.<br>오늘은 어떤 모습이 되어볼까요?</div>';
    } else {
      cart.forEach((item, idx) => {
        const row = document.createElement('div');
        row.className = 'cart-item';
        row.innerHTML = `
          <img src="${item.img}" alt="${item.name}">
          <div class="cart-item__body">
            <h4>${item.name}</h4>
            <p style="font-size:13px;color:#777;">수량 [ - ${item.qty} + ]</p>
            <p style="font-weight:800;">${formatWon(item.price * item.qty)}</p>
          </div>
          <button data-idx="${idx}" style="color:red;">삭제</button>`;
        row.querySelector('button').addEventListener('click', () => {
          const c = getCart(); c.splice(idx, 1); setCart(c); renderCartModal();
        });
        wrap.appendChild(row);
      });
    }
    const total = cart.reduce((s, i) => s + i.price * i.qty, 0);
    $('#cartQty').textContent = cart.reduce((s, i) => s + i.qty, 0) + '개';
    $('#cartProductTotal').textContent = formatWon(total);
    $('#cartAddonTotal').textContent = formatWon(0);
    $('#cartGrandTotal').textContent = formatWon(total);
  }
  $('#cartBtn').addEventListener('click', () => { renderCartModal(); openModal('cartModal'); });
  $('#cartCheckoutBtn').addEventListener('click', () => {
    showToast('결제 및 주문 저장은 Supabase 연동(orders 테이블) 완료 후 제공됩니다.');
  });
  renderCartBadge();

  /* ---------------- 로그인 / 회원가입 (임시 데모 - Supabase Auth 연동 전) ---------------- */
  const AUTH_KEY = 'yeonhwajaesil_auth_temp';
  $('#agreeAll').addEventListener('change', e => {
    $all('.agree-item').forEach(cb => cb.checked = e.target.checked);
    checkSignupEnabled();
  });
  $all('.agree-item').forEach(cb => cb.addEventListener('change', checkSignupEnabled));
  function checkSignupEnabled() {
    $('#signupSubmit').disabled = !$all('.agree-item').every(cb => cb.checked);
  }
  $('#signupForm').addEventListener('submit', e => {
    e.preventDefault();
    showToast('Supabase Auth 연동(auth.signUp) 완료 후 실제 회원가입이 처리됩니다.');
    closeModal('signupModal');
  });
  $('#loginForm').addEventListener('submit', e => {
    e.preventDefault();
    const email = $('#loginEmail').value.trim();
    if (!email) return;
    const isAdmin = email === 'heechic@naver.com';
    sessionStorage.setItem(AUTH_KEY, JSON.stringify({ email, isAdmin }));
    applyAuthUI();
    closeModal('loginModal');
    showToast('로그인 되었습니다. (데모 로그인 · Supabase 연동 전)');
  });
  function applyAuthUI() {
    let auth = null;
    try { auth = JSON.parse(sessionStorage.getItem(AUTH_KEY)); } catch (e) {}
    if (auth) {
      $('#welcomeText').hidden = false;
      $('#welcomeText').textContent = `${auth.email}님 반갑습니다.`;
      $('#loginBtn').querySelector('.btn--login__face--front').textContent = '로그아웃';
      $('#adminLinkBtn').hidden = !auth.isAdmin;
    } else {
      $('#welcomeText').hidden = true;
      $('#loginBtn').querySelector('.btn--login__face--front').textContent = '로그인';
      $('#adminLinkBtn').hidden = true;
    }
  }
  $('#loginBtn').addEventListener('click', () => {
    let auth = null;
    try { auth = JSON.parse(sessionStorage.getItem(AUTH_KEY)); } catch (e) {}
    if (auth) {
      sessionStorage.removeItem(AUTH_KEY);
      applyAuthUI();
      showToast('로그아웃 되었습니다.');
    } else {
      openModal('loginModal');
    }
  });
  applyAuthUI();

  /* ---------------- 배송조회 ---------------- */
  $('#trackBtn').addEventListener('click', () => openModal('trackModal'));

  /* ---------------- 챗봇 (mock 모드) ---------------- */
  (function chatbot() {
    const KEYWORDS = {
      '구매안내': '한복/악세사리/굿즈 모두 사이트에서 사이즈·수량 선택 후 장바구니 담기 → 구매하기로 진행하실 수 있어요.',
      '배송안내': '결제 완료 후 상품준비중 → 배송중 → 배송완료 순으로 진행되며, 배송조회 아이콘에서 실시간 확인이 가능합니다.',
      '교환안내': '상품 수령 후 7일 이내 미착용 상태에서 교환 신청이 가능합니다.',
      '사이즈 가이드': '각 상품 상세페이지의 사이즈표(가슴/허리/총장)를 참고해주세요. S/M/L 사이즈를 운영합니다.',
      '상담원 안내': '상담원 연결이 필요하시면 우측 하단 "상담하기" 버튼을 이용해주세요.',
    };
    const kwWrap = $('#chatbotKeywords');
    Object.keys(KEYWORDS).forEach(k => {
      const btn = document.createElement('button');
      btn.textContent = k;
      btn.addEventListener('click', () => { addBubble(k, 'user'); addBubble(KEYWORDS[k], 'bot'); });
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

    function mockReply(text) {
      const t = text.toLowerCase();
      const matched = COLLECTIONS.find(c => text.includes(c.name));
      if (matched && /재고|사이즈|구매/.test(text)) {
        return `안녕하세요 고객님. ${matched.name}의 실시간 재고는 Supabase 연동 완료 후 정확한 수치로 안내해드릴 수 있어요. 현재는 mock 모드로 동작 중입니다.`;
      }
      if (/배송|택배/.test(text)) return KEYWORDS['배송안내'];
      if (/교환|환불|반품/.test(text)) return KEYWORDS['교환안내'];
      if (/가격|할인/.test(text)) return '상품별 정확한 가격/할인 정보는 각 상세페이지에서 확인하실 수 있어요.';
      return '문의 감사합니다! 현재는 mock chatbot 모드로 동작 중이며, 실제 GPT 연동은 Supabase Edge Function 구성 후 제공될 예정입니다.';
    }
    $('#chatbotForm').addEventListener('submit', e => {
      e.preventDefault();
      const val = $('#chatbotInput').value.trim();
      if (!val) return;
      addBubble(val, 'user');
      $('#chatbotInput').value = '';
      setTimeout(() => addBubble(mockReply(val), 'bot'), 300);
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
    const state = { gender: null, age: null, purpose: null, picks: [] };
    let step = 0;

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
        next.addEventListener('click', () => { step++; renderStep(); });
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
        btn.addEventListener('click', () => { state[key] = l; step++; renderStep(); });
        row.appendChild(btn);
      });
      return row;
    }
    function shuffle(arr) { return arr.map(v => [Math.random(), v]).sort((a, b) => a[0] - b[0]).map(v => v[1]); }
    function renderResult(body) {
      const base = state.picks.length ? state.picks : shuffle(ALL_PRODUCTS.filter(p => p.type === 'hanbok'));
      const best = base[0];
      const others = shuffle(ALL_PRODUCTS.filter(p => p.type === 'hanbok' && p.name !== best.name)).slice(0, 3);
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
      $('#consultAddCart').addEventListener('click', () => addToCart({ name: best.name, img: best.img, price: best.price, id: 'consult-' + best.name }));
      $('#consultRestart').addEventListener('click', () => { step = 0; state.gender = state.age = state.purpose = null; state.picks = []; renderStep(); });
    }
    $('#consultIcon').addEventListener('click', () => { step = 0; renderStep(); openModal('consultPanel'); });
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
