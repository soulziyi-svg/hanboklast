-- Security hardening based on Supabase advisor findings
-- 1) product_review_stats should enforce the querying user's RLS, not the view owner's
alter view public.product_review_stats set (security_invoker = true);

-- 2) pin search_path on set_updated_at (was mutable)
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- 3) trigger-only functions must not be directly callable via PostgREST RPC
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.protect_profile_role() from public, anon, authenticated;
revoke execute on function public.issue_signup_coupon() from public, anon, authenticated;
revoke execute on function public.set_review_verified() from public, anon, authenticated;

-- 4) create_order must never be reachable by an unauthenticated (anon) caller
revoke all on function public.create_order(text, text, text, text, text, text, text) from public;
revoke all on function public.create_order(text, text, text, text, text, text, text) from anon;
grant execute on function public.create_order(text, text, text, text, text, text, text) to authenticated;
