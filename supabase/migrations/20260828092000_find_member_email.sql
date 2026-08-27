-- 이름과 연락처가 모두 일치할 때만 마스킹된 로그인 이메일을 반환합니다.
create or replace function public.find_member_email(p_name text, p_phone text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text;
  v_local text;
  v_domain text;
begin
  select email into v_email
  from public.profiles
  where status = 'active'
    and phone is not null
    and length(regexp_replace(coalesce(p_phone,''), '[^0-9]', '', 'g')) >= 10
    and lower(trim(name)) = lower(trim(p_name))
    and regexp_replace(coalesce(phone,''), '[^0-9]', '', 'g') = regexp_replace(coalesce(p_phone,''), '[^0-9]', '', 'g')
  limit 1;

  if v_email is null then return null; end if;
  v_local := split_part(v_email, '@', 1);
  v_domain := split_part(v_email, '@', 2);
  return left(v_local, least(3, length(v_local))) || repeat('*', greatest(length(v_local) - 3, 2)) || '@' || v_domain;
end;
$$;

revoke all on function public.find_member_email(text, text) from public;
grant execute on function public.find_member_email(text, text) to anon, authenticated;

-- 이메일 확인이 필요한 가입 방식에서도 이름과 연락처가 프로필에 저장되도록 합니다.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, name, phone, role)
  values (
    new.id,
    new.email,
    nullif(trim(new.raw_user_meta_data->>'name'), ''),
    nullif(trim(new.raw_user_meta_data->>'phone'), ''),
    case when lower(new.email) = 'heechic@naver.com' then 'admin' else 'user' end
  )
  on conflict (id) do update
  set email = excluded.email,
      name = coalesce(public.profiles.name, excluded.name),
      phone = coalesce(public.profiles.phone, excluded.phone);
  return new;
end;
$$;

revoke execute on function public.handle_new_user() from public, anon, authenticated;
notify pgrst, 'reload schema';
