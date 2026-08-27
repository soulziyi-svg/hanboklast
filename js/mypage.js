(async function(){
  'use strict';
  const db=window.supabaseClient,$=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
  const {showToast,openModal,closeModal}=window.ShopCommon;
  const {data:{session}}=await db.auth.getSession();
  if(!session){ location.href='index.html?login=1'; return; }
  const {data:profile}=await db.from('profiles').select('name,email,phone').eq('id',session.user.id).single();
  $('#myGreeting').textContent=`${profile?.name||profile?.email||session.user.email}님의 연화재실`;
  $('#logoutBtn').onclick=async()=>{await db.auth.signOut();location.href='index.html';};
  document.addEventListener('click',e=>{const c=e.target.closest('[data-close]');if(c)closeModal(c.dataset.close);});
  $$('.my-tabs button').forEach(btn=>btn.onclick=()=>{$$('.my-tabs button').forEach(x=>x.classList.toggle('is-active',x===btn));$$('.my-panel').forEach(x=>x.classList.toggle('is-active',x.id===btn.dataset.tab));});
  if(location.hash==='#inquiry') document.querySelector('[data-tab="inquiry"]')?.click();
  const labels={payment_pending:'결제 대기',paid:'결제 완료',preparing:'상품 준비중',shipping:'배송중',delivered:'배송 완료',confirmed:'구매 확정',cancel_requested:'취소 요청',cancelled:'취소 완료',exchange_requested:'교환 요청',return_requested:'반품 요청',returned:'반품 완료',refunded:'환불 완료'};
  async function loadOrders(){
    const {data:orders,error}=await db.from('orders').select('id,order_number,total_amount,order_status,ordered_at,order_items(id,product_id,product_name_snapshot,option_snapshot,quantity,products(slug,product_images(image_url,is_primary)))').eq('user_id',session.user.id).order('ordered_at',{ascending:false});
    if(error){$('#orderList').innerHTML='<p class="empty">주문 내역을 불러오지 못했습니다.</p>';return;}
    $('#orderList').innerHTML=(orders||[]).map(o=>`<article class="my-card"><div class="my-card__head"><b>${new Date(o.ordered_at).toLocaleDateString('ko-KR')} · ${o.order_number}</b><span class="status">${labels[o.order_status]||o.order_status}</span></div><div class="my-card__items">${o.order_items.map(i=>{const im=i.products?.product_images||[],src=(im.find(x=>x.is_primary)||im[0])?.image_url||'';return `<div class="my-item"><img src="${src}" alt=""><div><b>${i.product_name_snapshot}</b><p>${i.option_snapshot||''} · ${i.quantity}개</p></div></div>`}).join('')}</div><div class="my-actions">${o.order_status==='delivered'&&o.order_items.length?`<button data-confirm="${o.id}" data-review-product="${o.order_items[0].product_id}" data-review-item="${o.order_items[0].id}">구매확정 후 후기 작성</button>`:''}${['paid','preparing'].includes(o.order_status)?`<button data-claim="cancel" data-order="${o.id}">취소 요청</button>`:''}${['shipping','delivered','confirmed'].includes(o.order_status)?`<button data-claim="exchange" data-order="${o.id}">교환 요청</button><button data-claim="return" data-order="${o.id}">반품 요청</button>`:''}${o.order_status==='confirmed'?o.order_items.map(i=>`<button data-review-product="${i.product_id}" data-review-item="${i.id}">${i.product_name_snapshot} 후기 작성</button>`).join(''):''}</div></article>`).join('')||'<p class="empty">아직 구매한 상품이 없습니다.</p>';
    $$('[data-confirm]').forEach(b=>b.onclick=async()=>{
      if(!confirm('구매를 확정하면 취소가 어렵습니다. 구매확정 후 후기를 작성할까요?'))return;
      const orderId=b.dataset.confirm,productId=b.dataset.reviewProduct,orderItemId=b.dataset.reviewItem;
      b.disabled=true;b.textContent='구매확정 중...';
      const {error}=await db.rpc('confirm_my_order',{p_order_id:orderId});
      if(error){
        b.disabled=false;b.textContent='구매확정 후 후기 작성';
        const missingFunction=error.code==='PGRST202'||/confirm_my_order|schema cache/i.test(error.message||'');
        showToast(missingFunction?'구매확정 기능의 데이터베이스 설정이 아직 반영되지 않았습니다. 관리자에게 문의해주세요.':(error.message||'구매확정 처리에 실패했습니다.'));
        return;
      }
      showToast('구매가 확정되었습니다. 후기를 작성해주세요.');
      $('#reviewProductId').value=productId;
      $('#reviewOrderItemId').value=orderItemId;
      openModal('reviewModal');
      await loadOrders();
    });
    $$('[data-claim]').forEach(b=>b.onclick=async()=>{const reason=prompt('요청 사유를 입력해주세요.');if(!reason)return;const {error}=await db.from('order_claims').insert({order_id:b.dataset.order,user_id:session.user.id,claim_type:b.dataset.claim,reason});if(error)showToast(error.message);else{showToast('요청이 접수되었습니다.');loadClaims();}});
    $$('[data-review-product]:not([data-confirm])').forEach(b=>b.onclick=()=>{$('#reviewProductId').value=b.dataset.reviewProduct;$('#reviewOrderItemId').value=b.dataset.reviewItem;openModal('reviewModal');});
  }
  async function loadClaims(){const {data}=await db.from('order_claims').select('id,claim_type,reason,status,requested_at,orders(order_number)').eq('user_id',session.user.id).order('requested_at',{ascending:false});$('#claimList').innerHTML=(data||[]).map(x=>`<div class="my-card"><b>${x.orders?.order_number||''} · ${x.claim_type}</b><p>${x.reason||''}</p><span class="status">${x.status}</span></div>`).join('')||'<p class="empty">접수된 요청이 없습니다.</p>';}
  async function loadCoupons(){const {data}=await db.from('user_coupons').select('status,issued_at,used_at,coupons(code,name,discount_type,discount_value,min_order_amount,ends_at)').eq('user_id',session.user.id);$('#couponList').innerHTML=(data||[]).map(x=>`<div class="coupon-card"><b>${x.coupons?.name||''}</b><p>${x.coupons?.code||''} · ${x.coupons?.discount_type==='percent'?x.coupons.discount_value+'%':Number(x.coupons?.discount_value||0).toLocaleString()+'원'} 할인</p><small>최소 주문금액 ${Number(x.coupons?.min_order_amount||0).toLocaleString()}원 · ${x.status}</small></div>`).join('')||'<p class="empty">보유 쿠폰이 없습니다.</p>';}
  function loadViewed(){const list=JSON.parse(localStorage.getItem('yeonhwajaesil_viewed')||'[]');$('#viewedList').innerHTML=list.map(x=>`<a class="viewed-card" href="product.html?slug=${encodeURIComponent(x.slug)}"><img src="${x.image}" alt=""><b>${x.name}</b></a>`).join('')||'<p class="empty">최근 본 상품이 없습니다.</p>';}
  let reviewFiles=[];
  function renderReviewPreview(){
    const preview=$('#reviewPreview');preview.innerHTML='';
    if(!reviewFiles.length){preview.innerHTML='<p>첨부한 파일이 여기에 표시됩니다.</p>';return;}
    reviewFiles.forEach((file,index)=>{
      const item=document.createElement('div');item.className='review-preview__item';
      const url=URL.createObjectURL(file);
      item.innerHTML=file.type.startsWith('video/')?`<video src="${url}" controls muted></video>`:`<img src="${url}" alt="후기 첨부 미리보기">`;
      const remove=document.createElement('button');remove.type='button';remove.textContent='×';remove.setAttribute('aria-label','첨부 파일 삭제');
      remove.onclick=()=>{URL.revokeObjectURL(url);reviewFiles.splice(index,1);renderReviewPreview();};
      item.appendChild(remove);preview.appendChild(item);
    });
  }
  $('#reviewFiles').onchange=e=>{
    const files=[...e.target.files];
    if(files.some(file=>file.size>20*1024*1024)){showToast('파일당 최대 용량은 20MB입니다.');e.target.value='';return;}
    reviewFiles=[...reviewFiles,...files].slice(0,5);e.target.value='';renderReviewPreview();
  };
  $('#reviewForm').onsubmit=async e=>{
    e.preventDefault();
    const submit=$('#reviewSubmitBtn');submit.disabled=true;submit.textContent='등록 중...';
    const productId=$('#reviewProductId').value,orderItemId=$('#reviewOrderItemId').value;
    if(!productId||!orderItemId){showToast('구매 상품 정보를 찾지 못했습니다. 주문 내역에서 다시 시도해주세요.');submit.disabled=false;submit.textContent='후기 등록';return;}
    const {data:review,error}=await db.from('reviews').insert({user_id:session.user.id,product_id:productId,order_item_id:orderItemId,nickname:profile?.name||'구매자',rating:Number($('#reviewRating').value),content:$('#reviewContent').value.trim()}).select('id').single();
    if(error){showToast(error.message);submit.disabled=false;submit.textContent='후기 등록';return;}
    const mediaRows=[];
    for(const [index,file] of reviewFiles.entries()){
      const extension=(file.name.split('.').pop()||'bin').replace(/[^a-zA-Z0-9]/g,'');
      const path=`${session.user.id}/${review.id}/${crypto.randomUUID()}.${extension}`;
      const {error:uploadError}=await db.storage.from('review-images').upload(path,file,{contentType:file.type,upsert:false});
      if(uploadError)continue;
      const {data:publicData}=db.storage.from('review-images').getPublicUrl(path);
      mediaRows.push({review_id:review.id,image_url:publicData.publicUrl,alt_text:file.type.startsWith('video/')?'후기 영상':`후기 이미지 ${index+1}`,sort_order:index});
    }
    if(mediaRows.length)await db.from('review_images').insert(mediaRows);
    closeModal('reviewModal');showToast(reviewFiles.length&&mediaRows.length<reviewFiles.length?'후기는 등록됐지만 일부 파일 업로드에 실패했습니다.':'후기가 등록되었습니다.');
    reviewFiles=[];renderReviewPreview();e.target.reset();submit.disabled=false;submit.textContent='후기 등록';
  };
  $('#inquiryForm').onsubmit=async e=>{e.preventDefault();const submit=e.submitter;submit.disabled=true;submit.textContent='등록 중...';const {error}=await db.from('inquiries').insert({user_id:session.user.id,name:profile?.name||profile?.email||'회원',phone:profile?.phone||null,email:profile?.email||session.user.email,inquiry_type:$('#inquiryType').value,title:$('#inquiryTitle').value.trim(),content:$('#inquiryContent').value.trim()});submit.disabled=false;submit.textContent='문의 등록';if(error)showToast(error.message);else{showToast('문의가 등록되었습니다. 관리자가 확인 후 답변드립니다.');e.target.reset();}};
  await Promise.all([loadOrders(),loadClaims(),loadCoupons()]);loadViewed();
})();
