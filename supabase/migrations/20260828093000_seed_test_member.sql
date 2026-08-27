-- 화면 검수용 일반회원 계정: 화면 입력 test / 1234
-- Supabase Auth 내부에서는 이메일 test.yeonhwajaesil@gmail.com / 비밀번호 test1234로 안전하게 매핑합니다.
do $$
declare
  v_user_id uuid := '11111111-2222-4333-8444-555555555555';
begin
  if not exists (select 1 from auth.users where lower(email) = 'test.yeonhwajaesil@gmail.com') then
    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at, confirmation_token, recovery_token,
      email_change, email_change_token_new
    ) values (
      '00000000-0000-0000-0000-000000000000', v_user_id,
      'authenticated', 'authenticated', 'test.yeonhwajaesil@gmail.com',
      extensions.crypt('test1234', extensions.gen_salt('bf')), now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"name":"테스트 사용자","phone":"010-0000-0000"}'::jsonb,
      now(), now(), '', '', '', ''
    );

    insert into auth.identities (
      id, user_id, provider_id, identity_data, provider,
      last_sign_in_at, created_at, updated_at
    ) values (
      gen_random_uuid(), v_user_id, 'test.yeonhwajaesil@gmail.com',
      jsonb_build_object('sub',v_user_id::text,'email','test.yeonhwajaesil@gmail.com','email_verified',true),
      'email', now(), now(), now()
    );
  else
    select id into v_user_id from auth.users where lower(email) = 'test.yeonhwajaesil@gmail.com' limit 1;
  end if;

  insert into public.profiles (id, email, name, phone, role, status)
  values (v_user_id, 'test.yeonhwajaesil@gmail.com', '테스트 사용자', '010-0000-0000', 'user', 'active')
  on conflict (id) do update
  set name='테스트 사용자', phone='010-0000-0000', role='user', status='active';
end;
$$;
