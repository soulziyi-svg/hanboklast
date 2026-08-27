/**
 * 연화재실 공통 쇼핑 로직 (index.html / product.html 공용)
 * Supabase Auth 세션 관리 + carts/cart_items(+addons) 장바구니 + create_order 결제를
 * 한 곳에서 관리하여 여러 페이지에 중복 구현하지 않도록 합니다.
 *
 * 사용하는 페이지는 다음 DOM이 존재해야 합니다:
 * #toast, #loginBtn, #welcomeText, #adminLinkBtn,
 * #cartBtn, #cartModal(#cartItems,#orderName,#orderPhone,#orderAddress,#cartQty,#cartProductTotal,
 * #cartAddonTotal,#cartGrandTotal,#cartCheckoutBtn), #cartCount
 * 로그인과 회원가입은 auth.html 전용 화면에서 처리합니다.
 */
window.ShopCommon = (function () {
  'use strict';

  const supabaseClient = window.supabaseClient;
  const $ = (sel, root) => (root || document).querySelector(sel);
  const $all = (sel, root) => Array.from((root || document).querySelectorAll(sel));
  let selectedCartIds = null;
  let checkoutMode = 'all';
  let cartTotals = { product: 0, addon: 0, qty: 0 };

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
  function openAuthWindow(mode) { window.open(`auth.html?mode=${mode || 'login'}`, '_blank', 'noopener'); }

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
    if (!session) { showToast('로그인이 필요합니다.'); openAuthWindow('login'); return false; }
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
    cartTotals = { product: productTotal || 0, addon: addonTotal || 0, qty: qty || 0 };
    const subtotal = cartTotals.product + cartTotals.addon;
    const couponSelect = $('#orderCoupon');
    const selectedOption = couponSelect && couponSelect.selectedOptions ? couponSelect.selectedOptions[0] : null;
    let couponDiscount = 0;
    if (selectedOption && selectedOption.value) {
      const minOrder = Number(selectedOption.dataset.minOrder || 0);
      const value = Number(selectedOption.dataset.discountValue || 0);
      if (subtotal >= minOrder) {
        couponDiscount = selectedOption.dataset.discountType === 'percent' ? Math.floor(subtotal * value / 100) : value;
        const maximum = Number(selectedOption.dataset.maxDiscount || 0);
        if (maximum > 0) couponDiscount = Math.min(couponDiscount, maximum);
      }
    }
    $('#cartQty').textContent = (qty || 0) + '개';
    $('#cartProductTotal').textContent = formatWon(productTotal);
    $('#cartAddonTotal').textContent = formatWon(addonTotal);
    if ($('#cartCouponDiscount')) $('#cartCouponDiscount').textContent = '-' + formatWon(couponDiscount);
    $('#cartGrandTotal').textContent = formatWon(Math.max(subtotal - couponDiscount, 0));
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
      selectedCartIds = null;
      wrap.innerHTML = '<div class="cart-empty">아직 장바구니가 비어있어요.<br>오늘은 어떤 모습이 되어볼까요?</div>';
      updateCartTotals(0, 0, 0);
      return;
    }
    if (selectedCartIds === null) selectedCartIds = new Set(items.map(item => item.id));
    selectedCartIds = new Set([...selectedCartIds].filter(id => items.some(item => item.id === id)));
    let productTotal = 0, addonTotal = 0, qty = 0;
    items.forEach(item => {
      const product = item.products;
      const sizeLabels = { '220': 'S [220]', '230': 'M [230]', '240': 'L [240]' };
      const rawSize = item.product_variants && item.product_variants.size;
      const size = rawSize && rawSize !== 'FREE' ? ' / ' + (sizeLabels[rawSize] || rawSize) : '';
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
      row.dataset.itemId = item.id;
      row.dataset.productTotal = String(product.sale_price * item.quantity);
      row.dataset.addonTotal = String(addons.reduce((sum, addon) => sum + ((addon.addon_product ? addon.addon_product.sale_price : 0) * addon.quantity), 0));
      row.dataset.quantity = String(item.quantity);
      row.innerHTML = `
        <input class="cart-item__check" type="checkbox" aria-label="${product.name} 선택" ${selectedCartIds.has(item.id) ? 'checked' : ''}>
        <img src="${img ? img.image_url : ''}" alt="${product.name}">
        <div class="cart-item__body">
          <h4>${product.name}${size}</h4>
          <div class="cart-qty" aria-label="상품 수량 변경"><button type="button" data-qty="minus">−</button><input type="number" min="1" value="${item.quantity}" aria-label="수량"><button type="button" data-qty="plus">＋</button></div>
          ${addonLines}
          <p style="font-weight:800;">${formatWon(product.sale_price * item.quantity)}</p>
        </div>
        <button class="cart-item__delete" type="button">삭제</button>`;
      const check = row.querySelector('.cart-item__check');
      check.addEventListener('change', () => {
        if (check.checked) selectedCartIds.add(item.id); else selectedCartIds.delete(item.id);
        refreshSelectedCartTotals();
      });
      async function setQuantity(nextQuantity) {
        const quantity = Math.max(1, Number(nextQuantity) || 1);
        await supabaseClient.from('cart_items').update({ quantity }).eq('id', item.id);
        await renderCartBadge();
        await renderCartModal();
      }
      row.querySelector('[data-qty="minus"]').addEventListener('click', () => setQuantity(item.quantity - 1));
      row.querySelector('[data-qty="plus"]').addEventListener('click', () => setQuantity(item.quantity + 1));
      row.querySelector('.cart-qty input').addEventListener('change', e => setQuantity(e.target.value));
      row.querySelector('.cart-item__delete').addEventListener('click', async () => {
        await supabaseClient.from('cart_items').delete().eq('id', item.id);
        selectedCartIds.delete(item.id);
        await renderCartBadge();
        await renderCartModal();
      });
      wrap.appendChild(row);
    });
    refreshSelectedCartTotals();
  }

  function refreshSelectedCartTotals() {
    const rows = $all('.cart-item', $('#cartItems'));
    let productTotal = 0, addonTotal = 0, qty = 0;
    rows.forEach(row => {
      if (!row.querySelector('.cart-item__check')?.checked) return;
      productTotal += Number(row.dataset.productTotal || 0);
      addonTotal += Number(row.dataset.addonTotal || 0);
      qty += Number(row.dataset.quantity || 0);
    });
    updateCartTotals(productTotal, addonTotal, qty);
    const selectAll = $('#cartSelectAll');
    if (selectAll) {
      selectAll.checked = rows.length > 0 && rows.every(row => row.querySelector('.cart-item__check').checked);
      selectAll.indeterminate = rows.some(row => row.querySelector('.cart-item__check').checked) && !selectAll.checked;
    }
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
    const couponSelect = $('#orderCoupon');
    if (couponSelect) {
      const previousCoupon = couponSelect.value;
      couponSelect.innerHTML = '<option value="">쿠폰을 선택하세요</option>';
      const { data: userCoupons } = await supabaseClient
        .from('user_coupons')
        .select('id, coupons ( code, name, discount_type, discount_value, min_order_amount, max_discount_amount, ends_at )')
        .eq('user_id', session.user.id).eq('status', 'issued');
      (userCoupons || []).forEach(row => {
        if (!row.coupons || (row.coupons.ends_at && new Date(row.coupons.ends_at) < new Date())) return;
        const option = document.createElement('option');
        option.value = row.coupons.code;
        option.textContent = `${row.coupons.name} (${row.coupons.discount_type === 'percent' ? row.coupons.discount_value + '%' : formatWon(row.coupons.discount_value)})`;
        option.dataset.discountType = row.coupons.discount_type;
        option.dataset.discountValue = row.coupons.discount_value;
        option.dataset.minOrder = row.coupons.min_order_amount || 0;
        option.dataset.maxDiscount = row.coupons.max_discount_amount || 0;
        couponSelect.appendChild(option);
      });
      const savedCoupon = sessionStorage.getItem('yeonhwajaesil_selected_coupon') || '';
      const requestedCoupon = previousCoupon || savedCoupon;
      if ([...couponSelect.options].some(option => option.value === requestedCoupon)) couponSelect.value = requestedCoupon;
      updateCartTotals(cartTotals.product, cartTotals.addon, cartTotals.qty);
    }
  }

  function wireCartUI() {
    if ($('#cartBtn')) {
      $('#cartBtn').addEventListener('click', async () => {
        openModal('cartModal');
        await renderCartModal();
        await prefillOrderForm();
      });
    }
    if ($('#cartSelectAll')) $('#cartSelectAll').addEventListener('change', e => {
      $all('.cart-item', $('#cartItems')).forEach(row => {
        const check = row.querySelector('.cart-item__check');
        check.checked = e.target.checked;
      });
      selectedCartIds = new Set(e.target.checked ? $all('.cart-item', $('#cartItems')).map(row => row.dataset.itemId).filter(Boolean) : []);
      refreshSelectedCartTotals();
    });
    if ($('#orderCoupon')) $('#orderCoupon').addEventListener('change', event => {
      sessionStorage.setItem('yeonhwajaesil_selected_coupon', event.target.value);
      updateCartTotals(cartTotals.product, cartTotals.addon, cartTotals.qty);
    });
    if ($('#cartDeleteSelected')) $('#cartDeleteSelected').addEventListener('click', async () => {
      const ids = $all('.cart-item', $('#cartItems')).filter(row => row.querySelector('.cart-item__check')?.checked).map(row => row.dataset.itemId);
      if (!ids.length) { showToast('삭제할 상품을 선택해주세요.'); return; }
      await supabaseClient.from('cart_items').delete().in('id', ids);
      ids.forEach(id => selectedCartIds.delete(id));
      await renderCartBadge();
      await renderCartModal();
      showToast('선택한 상품을 삭제했습니다.');
    });
    if ($('#cartCheckoutBtn')) {
      $('#cartCheckoutBtn').addEventListener('click', async () => {
        const session = await getCurrentSession();
        if (!session) { showToast('로그인이 필요합니다.'); openAuthWindow('login'); return; }
        const rows = $all('.cart-item', $('#cartItems'));
        if (!rows.length) { showToast('장바구니가 비어있습니다.'); return; }
        rows.forEach(row => { row.querySelector('.cart-item__check').checked = true; });
        selectedCartIds = new Set(rows.map(row => row.dataset.itemId).filter(Boolean));
        refreshSelectedCartTotals();
        checkoutMode = 'all';
        await prefillOrderForm();
        closeModal('cartModal');
        openModal('paymentModal');
      });
    }
    if ($('#cartCheckoutSelectedBtn')) {
      $('#cartCheckoutSelectedBtn').addEventListener('click', async () => {
        const session = await getCurrentSession();
        if (!session) { showToast('로그인이 필요합니다.'); openAuthWindow('login'); return; }
        const ids = $all('.cart-item', $('#cartItems'))
          .filter(row => row.querySelector('.cart-item__check')?.checked)
          .map(row => row.dataset.itemId)
          .filter(Boolean);
        if (!ids.length) { showToast('구매할 상품을 선택해주세요.'); return; }
        selectedCartIds = new Set(ids);
        checkoutMode = 'selected';
        await prefillOrderForm();
        closeModal('cartModal');
        openModal('paymentModal');
      });
    }
    if ($('#paymentSubmitBtn')) {
      $('#paymentSubmitBtn').addEventListener('click', async () => {
        const session = await getCurrentSession();
        if (!session) { showToast('로그인이 필요합니다.'); openAuthWindow('login'); return; }
        const name = $('#orderName').value.trim();
        const phone = $('#orderPhone').value.trim();
        const address = $('#orderAddress').value.trim();
        if (!name || !phone || !address) { showToast('주문자명 / 연락처 / 배송주소를 입력해주세요.'); return; }
        try {
          const rpcName = checkoutMode === 'selected' ? 'create_selected_order' : 'create_order';
          const rpcParams = {
            p_customer_name: name, p_customer_phone: phone, p_postcode: null,
            p_address: address, p_address_detail: null, p_delivery_memo: null,
            p_coupon_code: $('#orderCoupon') ? ($('#orderCoupon').value || null) : null,
          };
          if (checkoutMode === 'selected') rpcParams.p_cart_item_ids = [...selectedCartIds];
          const { data: order, error } = await supabaseClient.rpc(rpcName, rpcParams);
          if (error) throw error;
          await supabaseClient.from('profiles').update({ name, phone, address }).eq('id', session.user.id);
          showToast(`주문이 완료되었습니다. 주문번호 ${order.order_number}`);
          closeModal('paymentModal');
          selectedCartIds = null;
          checkoutMode = 'all';
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
      if ($('#signupBtn')) $('#signupBtn').hidden = true;
      const { data: profile } = await supabaseClient
        .from('profiles').select('role, name, email').eq('id', session.user.id).single();
      if ($('#welcomeText')) {
        $('#welcomeText').hidden = false;
        $('#welcomeText').textContent = `${(profile && (profile.name || profile.email)) || session.user.email}님 반갑습니다.`;
      }
      if ($('#loginBtn')) $('#loginBtn').querySelector('.btn--login__face--front').textContent = '로그아웃';
      if ($('#adminLinkBtn')) $('#adminLinkBtn').hidden = !(profile && profile.role === 'admin');
      if ($('#mypageBtn')) $('#mypageBtn').hidden = false;
    } else {
      if ($('#signupBtn')) $('#signupBtn').hidden = false;
      if ($('#welcomeText')) $('#welcomeText').hidden = true;
      if ($('#loginBtn')) $('#loginBtn').querySelector('.btn--login__face--front').textContent = '로그인';
      if ($('#adminLinkBtn')) $('#adminLinkBtn').hidden = true;
      if ($('#mypageBtn')) $('#mypageBtn').hidden = true;
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
        showToast(data.session ? '회원가입이 완료되어 10% 할인쿠폰이 발급되었습니다.' : '가입 확인 메일을 발송했습니다. 인증 후 10% 할인쿠폰이 발급됩니다.');
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
          openAuthWindow('login');
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
