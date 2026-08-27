(function(){
  'use strict';
  const db=window.supabaseClient;
  const $=selector=>document.querySelector(selector);
  const $$=selector=>Array.from(document.querySelectorAll(selector));
  const message=$('#authPageMessage');
  const setMessage=(text,isError=true)=>{message.textContent=text;message.style.color=isError?'#b51f2e':'#356642';};
  function showPanel(mode){
    const signup=mode==='signup';
    const findId=mode==='find-id';
    $('#authLoginPanel').hidden=signup||findId;
    $('#authSignupPanel').hidden=!signup;
    $('#authFindIdPanel').hidden=!findId;
    $('#authLoginTab').classList.toggle('is-active',!signup&&!findId);
    $('#authSignupTab').classList.toggle('is-active',signup);
    $('#authFindIdTab').classList.toggle('is-active',findId);
    history.replaceState(null,'',`?mode=${findId?'find-id':signup?'signup':'login'}`);
    message.textContent='';
  }
  $$('[data-auth-tab]').forEach(button=>button.addEventListener('click',()=>showPanel(button.dataset.authTab)));
  $$('[data-go-auth]').forEach(button=>button.addEventListener('click',()=>showPanel(button.dataset.goAuth)));
  const initialMode=new URLSearchParams(location.search).get('mode');
  showPanel(initialMode==='signup'?'signup':initialMode==='find-id'?'find-id':'login');

  const agreements=$$('.page-agree-item');
  const updateSignup=()=>{$('#pageSignupSubmit').disabled=!agreements.every(item=>item.checked);};
  $('#pageAgreeAll').addEventListener('change',event=>{agreements.forEach(item=>item.checked=event.target.checked);updateSignup();});
  agreements.forEach(item=>item.addEventListener('change',updateSignup));

  $('#pageLoginForm').addEventListener('submit',async event=>{
    event.preventDefault();
    const button=event.submitter;button.disabled=true;button.textContent='로그인 중...';
    const enteredId=$('#pageLoginEmail').value.trim();
    const enteredPassword=$('#pageLoginPassword').value;
    const isTestAccount=enteredId.toLowerCase()==='test'&&enteredPassword==='1234';
    const {error}=await db.auth.signInWithPassword({
      email:isTestAccount?'test.yeonhwajaesil@gmail.com':enteredId,
      password:isTestAccount?'test1234':enteredPassword
    });
    if(error){setMessage('로그인 실패: '+error.message);button.disabled=false;button.textContent='로그인하기';return;}
    setMessage('로그인되었습니다. 사이트로 이동합니다.',false);
    setTimeout(()=>{if(window.opener&&!window.opener.closed){window.opener.location.reload();window.close();}else location.href='index.html';},700);
  });

  $('#pageSignupForm').addEventListener('submit',async event=>{
    event.preventDefault();
    const password=$('#pageSignupPassword').value;
    if(password!==$('#pageSignupPasswordConfirm').value){setMessage('비밀번호가 일치하지 않습니다.');return;}
    const button=event.submitter;button.disabled=true;button.textContent='가입 중...';
    const {data,error}=await db.auth.signUp({
      email:$('#pageSignupEmail').value.trim(),
      password,
      options:{data:{name:$('#pageSignupName').value.trim(),phone:$('#pageSignupPhone').value.trim()}}
    });
    if(error){setMessage('회원가입 실패: '+error.message);button.disabled=false;button.textContent='동의하고 가입하기';return;}
    if(data.session&&data.user){
      const address=$('#pageSignupAddress').value.trim();
      await db.from('profiles').update({
        name:$('#pageSignupName').value.trim(),
        phone:$('#pageSignupPhone').value.trim(),
        ...(address?{address}:{})
      }).eq('id',data.user.id);
      await db.from('user_consents').insert({user_id:data.user.id,service_terms:true,location_terms:agreements[1]?.checked||false});
      setMessage('회원가입이 완료되어 10% 할인쿠폰이 발급되었습니다.',false);
      setTimeout(()=>{if(window.opener&&!window.opener.closed){window.opener.location.reload();window.close();}else location.href='index.html';},1000);
    }else{
      setMessage('가입 확인 메일을 발송했습니다. 이메일 인증 후 로그인해주세요.',false);
      button.disabled=false;button.textContent='동의하고 가입하기';
    }
  });

  $('#pageFindIdForm').addEventListener('submit',async event=>{
    event.preventDefault();
    const button=event.submitter;button.disabled=true;button.textContent='찾는 중...';
    const {data,error}=await db.rpc('find_member_email',{
      p_name:$('#pageFindIdName').value.trim(),
      p_phone:$('#pageFindIdPhone').value.trim()
    });
    const result=$('#findIdResult');
    result.hidden=false;
    if(error||!data){result.innerHTML='입력한 정보와 일치하는 회원을 찾지 못했습니다.';}
    else result.innerHTML=`가입하신 아이디는<strong>${data}</strong>입니다.`;
    button.disabled=false;button.textContent='아이디 찾기';
  });
})();
