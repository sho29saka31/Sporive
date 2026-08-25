-- カスタムアクセストークンフック（要件定義書 §4-1・§10-2、計画：Phase 11）
-- JWTクレームに is_admin・is_super_admin を埋め込み、管理者判定のたびに
-- 発生していたprofilesへのDB往復を削減する。
--
-- 【重要】この関数を作成しただけではフックは有効化されない。Supabase Dashboardの
-- Authentication > Hooks で「Customize Access Token (JWT) Claims」を有効にし、
-- この関数（public.custom_access_token_hook）を選択する操作が別途必要（SQLでは
-- 完結しない）。

create or replace function public.custom_access_token_hook(event jsonb)
returns jsonb
language plpgsql
stable
set search_path = public, pg_temp
as $$
declare
  claims jsonb;
  profile_is_admin boolean;
  profile_is_super_admin boolean;
begin
  select is_admin, is_super_admin
    into profile_is_admin, profile_is_super_admin
    from public.profiles
    where id = (event->>'user_id')::uuid;

  claims := coalesce(event->'claims', '{}'::jsonb);
  claims := jsonb_set(claims, '{is_admin}', to_jsonb(coalesce(profile_is_admin, false)));
  claims := jsonb_set(claims, '{is_super_admin}', to_jsonb(coalesce(profile_is_super_admin, false)));

  event := jsonb_set(event, '{claims}', claims);
  return event;
end;
$$;

-- Supabase Authサービス（supabase_auth_admin）がこの関数とprofilesを参照できるようにする
grant usage on schema public to supabase_auth_admin;
grant execute on function public.custom_access_token_hook to supabase_auth_admin;
revoke execute on function public.custom_access_token_hook from authenticated, anon, public;

grant select on public.profiles to supabase_auth_admin;

drop policy if exists "Auth adminはプロフィールを参照可能" on public.profiles;
create policy "Auth adminはプロフィールを参照可能"
  on public.profiles
  as permissive
  for select
  to supabase_auth_admin
  using (true);
