/**
 * 연화재실 공통 쇼핑 로직 (index.html / product.html 공용)
 * Supabase Auth 세션 관리 + carts/cart_items(+addons) 장바구니 + create_order 결제를
 * 한 곳에서 관리하여 여러 페이지에 중복 구현하지 않도록 합니다.
 *
 * 사용하는 페이지는 다음 DOM이 존재해야 합니다:
 * #toast, #loginModal(#loginForm,#loginEmail,#loginPassword), #loginBtn, #welcomeText, #adminLinkBtn,
 * #cartBtn, #cartModal(#cartItems,#orderName,#orderPhone,#orderAddress,#cartQty,#cartProductTotal,
 * #cartAddonTotal,#cartGrandTotal,#cartCheckoutBtn), #cartCount
 * (#signupModal/#signupForm 등은 있을 때만 자동으로 연결합니다.)
 */
window.ShopCommon = (function () {
  'use strict';

  const supabaseClient = window.supabaseClient;
  const $ = (sel, root) => (root || document).querySelector(sel);
  const $all = (sel, root) => Array.from((root || document).querySelectorAll(sel));

  function showToast(msg, ms) {
    const toast = $('#toast');
    if (!toast) return;
    toast.textContent = msg;
    toast.hidden = false;
    clearTimeout(showToast._t);
    showToast._t = setTimeout(() => { toast.hidden = true; }, ms || 2000);
  }
  function openModal(id) { const el = document.getElementById(id); if (el) el.hidden = false; }
  function closeModal(id) { const el = document.getElementById(id); if (el) el.hidden = true; }

  // 모달 내용이 동적으로 생성되는 페이지(관리자페이지 등)에서도 동작하도록 이벤트 위임 방식을 사용합니다.
  document.addEventListener('click', e => {
    const closeBtn = e.target.closest('[data-close]');
    if (closeBtn) { closeModal(closeBtn.dataset.close); return; }
    const openBtn = e.target.closest('[data-open]');
    if (openBtn) { openModal(openBtn.dataset.open); return; }
    if (e.target.classList && e.target.classList.contains('modal-overlay')) { e.target.hidden = true; }
  });

  function formatWon(n) {
    return (n || 0).toLocaleString('ko-KR') + '원';
  }

  function pickDefaultVariant(variants) {
    if (!variants) return null;
    return variants.M || variants.S || variants.L || Object.values(variants)[0] || null;
  }

  /* ---------------- 세션 / 장바구니 ---------------- */
  async function getCurrentSession() {
    const { data } = await supabaseClient.auth.getSession();
    return data.session;
  }

  async function getActiveCartId(userId) {
    const { data } = await supabaseClient
      .from('carts').select('id').eq('user_id', userId).eq('status', 'active').maybeSingle();
    return data ? data.id : null;
  }

  async function getOrCreateActiveCart(userId) {
    const existing = await getActiveCartId(userId);
    if (existing) return existing;
    const { data, error } = await supabaseClient
      .from('carts').insert({ user_id: userId }).select('id').single();
    if (error) throw error;
    return data.id;
  }

  /**
   * @param {object} product
   * @param {string} product.productId
   * @param {string} product.variantId
   * @param {string} [product.name]
   * @param {number} [product.quantity=1]
   * @param {{productId:string, variantId:string, quantity:number}[]} [product.addons]
   */
  async function addToCart(product) {
    const session = await getCurrentSession();
    if (!session) { showToast('로그인이 필요합니다.'); openModal('loginModal'); return false; }
    if (!product.productId || !product.variantId) { showToast('상품 옵션 정보를 불러올 수 없습니다.'); return false; }
    const quantity = product.quantity || 1;
    const addons = product.addons || [];
    try {
      const cartId = await getOrCreateActiveCart(session.user.id);

      if (addons.length === 0) {
        const { data: existing } = await supabaseClient
          .from('cart_items').select('id, quantity')
          .eq('cart_id', cartId).eq('product_variant_id', product.variantId).maybeSingle();
        if (existing) {
          await supabaseClient.from('cart_items').update({ quantity: existing.quantity + quantity }).eq('id', existing.id);
        } else {
          const { error } = await supabaseClient.from('cart_items').insert({
            cart_id: cartId, product_id: product.productId, product_variant_id: product.variantId, quantity,
          });
          if (error) throw error;
        }
      } else {
        // 추가구성(악세사리 등)이 포함된 경우 기존 항목과 합치지 않고 새 줄로 담습니다.
        const { data: inserted, error } = await supabaseClient.from('cart_items')
          .insert({ cart_id: cartId, product_id: product.productId, product_variant_id: product.variantId, quantity })
          .select('id').single();
        if (error) throw error;
        const { error: addonError } = await supabaseClient.from('cart_item_addons').insert(
          addons.map(a => ({
            cart_item_id: inserted.id, addon_product_id: a.productId, addon_variant_id: a.variantId,
            quantity: a.quantity || 1,
          }))
        );
        if (addonError) throw addonError;
      }

      await renderCartBadge();
      showToast(`✓ ${product.name || '상품'} 장바구니에 추가되었습니다.`);
      return true;
    } catch (err) {
      showToast('장바구니 담기에 실패했습니다.');
      return false;
    }
  }

  async function fetchCartItems(userId) {
    const cartId = await getActiveCartId(userId);
    if (!cartId) return { cartId: null, items: [] };
    const { data, error } = await supabaseClient
      .from('cart_items')
      .select(`
        id, quantity,
        products ( id, name, sale_price, product_images ( image_url, is_primary ) ),
        product_variants ( size ),
        cart_item_addons ( id, quantity, addon_product:products ( name, sale_price ) )
      `)
      .eq('cart_id', cartId);
    if (error) return { cartId, items: [] };
    return { cartId, items: data || [] };
  }

  function updateCartTotals(productTotal, addonTotal, qty) {
    $('#cartQty').textContent = (qty || 0) + '개';
    $('#cartProductTotal').textContent = formatWon(productTotal);
    $('#cartAddonTotal').textContent = formatWon(addonTotal);
    $('#cartGrandTotal').textContent = formatWon(productTotal + addonTotal);
  }

  async function renderCartBadge() {
    const badge = $('#cartCount');
    if (!badge) return;
    const session = await getCurrentSession();
    if (!session) { badge.textContent = '0'; return; }
    const { items } = await fetchCartItems(session.user.id);
    badge.textContent = items.reduce((s, i) => s + i.quantity, 0);
  }

  async function renderCartModal() {
    const wrap = $('#cartItems');
    if (!wrap) return;
    wrap.innerHTML = '';
    const session = await getCurrentSession();
    if (!session) {
      wrap.innerHTML = '<div class="cart-empty">로그인 후 이용하실 수 있는 기능입니다.</div>';
      updateCartTotals(0, 0, 0);
      return;
    }
    const { items } = await fetchCartItems(session.user.id);
    if (!items.length) {
      wrap.innerHTML = '<div class="cart-empty">아직 장바구니가 비어있어요.<br>오늘은 어떤 모습이 되어볼까요?</div>';
      updateCartTotals(0, 0, 0);
      return;
    }
    let productTotal = 0, addonTotal = 0, qty = 0;
    items.forEach(item => {
      const product = item.products;
      const size = item.product_variants && item.product_variants.size !== 'FREE' ? ' / ' + item.product_variants.size : '';
      const images = product.product_images || [];
      const img = images.find(i => i.is_primary) || images[0];
      productTotal += product.sale_price * item.quantity;
      qty += item.quantity;
      const addons = item.cart_item_addons || [];
      const addonLines = addons.map(a => {
        addonTotal += (a.addon_product ? a.addon_product.sale_price : 0) * a.quantity;
        return `<p style="font-size:12px;color:#999;">+ ${a.addon_product ? a.addon_product.name : ''} × ${a.quantity}</p>`;
      }).join('');
      const row = document.createElement('div');
      row.className = 'cart-item';
      row.innerHTML = `
        <img src="${img ? img.image_url : ''}" alt="${product.name}">
        <div class="cart-item__body">
          <h4>${product.name}${size}</h4>
          <p style="font-size:13px;color:#777;">수량 ${item.quantity}개</p>
          ${addonLines}
          <p style="font-weight:800;">${formatWon(product.sale_price * item.quantity)}</p>
        </div>
        <button style="color:red;">삭제</button>`;
      row.querySelector('button').addEventListener('click', async () => {
        await supabaseClient.from('cart_items').delete().eq('id', item.id);
        await renderCartBadge();
        await renderCartModal();
      });
      wrap.appendChild(row);
    });
    updateCartTotals(productTotal, addonTotal, qty);
  }

  async function prefillOrderForm() {
    const session = await getCurrentSession();
    if (!session || !$('#orderName')) return;
    const { data: profile } = await supabaseClient
      .from('profiles').select('name, phone, address').eq('id', session.user.id).single();
    if (!profile) return;
    if (profile.name && !$('#orderName').value) $('#orderName').value = profile.name;
    if (profile.phone && !$('#orderPhone').value) $('#orderPhone').value = profile.phone;
    if (profile.address && !$('#orderAddress').value) $('#orderAddress').value = profile.address;
  }

  function wireCartUI() {
    if ($('#cartBtn')) {
      $('#cartBtn').addEventListener('click', async () => {
        openModal('cartModal');
        await renderCartModal();
        await prefillOrderForm();
      });
    }
    if ($('#cartCheckoutBtn')) {
      $('#cartCheckoutBtn').addEventListener('click', async () => {
        const session = await getCurrentSession();
        if (!session) { showToast('로그인이 필요합니다.'); openModal('loginModal'); return; }
        const name = $('#orderName').value.trim();
        const phone = $('#orderPhone').value.trim();
        const address = $('#orderAddress').value.trim();
        if (!name || !phone || !address) { showToast('주문자명 / 연락처 / 배송주소를 입력해주세요.'); return; }
        try {
          const { data: order, error } = await supabaseClient.rpc('create_order', {
            p_customer_name: name, p_customer_phone: phone, p_postcode: null,
            p_address: address, p_address_detail: null, p_delivery_memo: null, p_coupon_code: null,
          });
          if (error) throw error;
          await supabaseClient.from('profiles').update({ name, phone, address }).eq('id', session.user.id);
          showToast(`주문이 완료되었습니다. 주문번호 ${order.order_number}`);
          closeModal('cartModal');
          await renderCartBadge();
        } catch (err) {
          showToast(err.message || '주문 처리 중 오류가 발생했습니다.');
        }
      });
    }
  }

  /* ---------------- 인증 ---------------- */
  async function applyAuthUI() {
    const session = await getCurrentSession();
    if (session) {
      const { data: profile } = await supabaseClient
        .from('profiles').select('role, name, email').eq('id', session.user.id).single();
      if ($('#welcomeText')) {
        $('#welcomeText').hidden = false;
        $('#welcomeText').textContent = `${(profile && (profile.name || profile.email)) || session.user.email}님 반갑습니다.`;
      }
      if ($('#loginBtn')) $('#loginBtn').querySelector('.btn--login__face--front').textContent = '로그아웃';
      if ($('#adminLinkBtn')) $('#adminLinkBtn').hidden = !(profile && profile.role === 'admin');
    } else {
      if ($('#welcomeText')) $('#welcomeText').hidden = true;
      if ($('#loginBtn')) $('#loginBtn').querySelector('.btn--login__face--front').textContent = '로그인';
      if ($('#adminLinkBtn')) $('#adminLinkBtn').hidden = true;
    }
    await renderCartBadge();
  }

  function wireAuthUI() {
    if ($('#signupForm')) {
      $('#agreeAll').addEventListener('change', e => {
        $all('.agree-item').forEach(cb => cb.checked = e.target.checked);
        checkSignupEnabled();
      });
      $all('.agree-item').forEach(cb => cb.addEventListener('change', checkSignupEnabled));
      function checkSignupEnabled() {
        $('#signupSubmit').disabled = !$all('.agree-item').every(cb => cb.checked);
      }

      $('#signupForm').addEventListener('submit', async e => {
        e.preventDefault();
        const email = $('#signupEmail').value.trim();
        const password = $('#signupPassword').value;
        const passwordConfirm = $('#signupPasswordConfirm').value;
        const address = $('#signupAddress').value.trim();
        const locationConsent = !!$all('.agree-item')[1] && $all('.agree-item')[1].checked;

        if (password !== passwordConfirm) { showToast('비밀번호가 일치하지 않습니다.'); return; }

        const { data, error } = await supabaseClient.auth.signUp({ email, password });
        if (error) { showToast('회원가입 실패: ' + error.message); return; }

        if (data.session && data.user) {
          if (address) await supabaseClient.from('profiles').update({ address }).eq('id', data.user.id);
          await supabaseClient.from('user_consents').insert({
            user_id: data.user.id, service_terms: true, location_terms: locationConsent,
          });
        }

        closeModal('signupModal');
        showToast(data.session ? '회원가입이 완료되었습니다.' : '가입 확인 메일을 발송했습니다. 인증 후 로그인해주세요.');
        await applyAuthUI();
      });
    }

    if ($('#loginForm')) {
      $('#loginForm').addEventListener('submit', async e => {
        e.preventDefault();
        const email = $('#loginEmail').value.trim();
        const password = $('#loginPassword').value;
        const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
        if (error) { showToast('로그인 실패: ' + error.message); return; }
        await applyAuthUI();
        closeModal('loginModal');
        showToast('로그인 되었습니다.');
      });
    }

    if ($('#loginBtn')) {
      $('#loginBtn').addEventListener('click', async () => {
        const session = await getCurrentSession();
        if (session) {
          await supabaseClient.auth.signOut();
          await applyAuthUI();
          showToast('로그아웃 되었습니다.');
        } else {
          openModal('loginModal');
        }
      });
    }

    supabaseClient.auth.onAuthStateChange(() => { applyAuthUI(); });
  }

  return {
    $, $all, showToast, openModal, closeModal, pickDefaultVariant, formatWon,
    getCurrentSession, getActiveCartId, getOrCreateActiveCart,
    addToCart, fetchCartItems, renderCartBadge, renderCartModal, prefillOrderForm,
    wireCartUI, applyAuthUI, wireAuthUI,
  };
})();
