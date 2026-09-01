-- 【セキュリティ修正】profiles.is_admin / is_super_admin への権限昇格を防止
--
-- 現行のRLSポリシー（0005_rls_hardening.sql）は行の所有者（auth.uid() = id）
-- のみをチェックしており、カラム単位の制限がない。そのため、ログイン済みの
-- 一般利用者がSupabase JSクライアント経由で
--   supabase.from('profiles').update({ is_admin: true, is_super_admin: true }).eq('id', myId)
-- を直接呼び出すだけで、自分自身を管理者・super-adminに昇格できてしまう
-- （アプリのUI・Server Actionを経由しない限り気づけない）。
--
-- is_admin/is_super_adminはservice_role（サーバー側の管理操作）からのみ
-- 変更可能にし、authenticated/anonロールからの変更は常に元の値へ
-- 強制的に戻すBEFOREトリガーで保護する。

create or replace function public.protect_admin_columns()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.role() <> 'service_role' then
    if tg_op = 'UPDATE' then
      new.is_admin := old.is_admin;
      new.is_super_admin := old.is_super_admin;
    elsif tg_op = 'INSERT' then
      new.is_admin := false;
      new.is_super_admin := false;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists protect_admin_columns_trigger on profiles;

create trigger protect_admin_columns_trigger
  before insert or update on profiles
  for each row
  execute function public.protect_admin_columns();
