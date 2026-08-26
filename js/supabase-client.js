/**
 * 연화재실 Supabase 클라이언트 초기화
 * 여기 있는 키는 브라우저에서 사용이 허용된 Publishable(anon) Key입니다.
 * service_role / secret key는 절대 프론트엔드 코드에 포함하지 않습니다.
 */
(function () {
  'use strict';
  const SUPABASE_URL = 'https://aqhbuuuernicnbeycgfg.supabase.co';
  const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_PFIlObmwEs5gK3XccfJgOQ_hq6Rnl7U';

  if (!window.supabase || typeof window.supabase.createClient !== 'function') {
    window.supabaseClient = null;
    return;
  }

  window.supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });
})();
