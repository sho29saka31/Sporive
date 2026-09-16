-- セキュリティ監査(3周目)で発見: cleanup_old_notifications()とprotect_admin_columns()は
-- migrationファイル上は `revoke execute ... from anon, authenticated, public;` が
-- 書かれているが、実際のDB上ではanon/authenticated双方にEXECUTE権限が付与された
-- ままだった(実測: has_function_privilege('anon'/'authenticated', ..., 'execute') = true)。
-- 原因を問わず、意図通りの状態に修正するため明示的に再度revokeする。
--
-- cleanup_old_notifications()はSECURITY DEFINERでRLSをバイパスしてnotification_logs/
-- push_subscriptionsをDELETEするため、これがanonに開放されていると未認証の第三者が
-- `POST /rest/v1/rpc/cleanup_old_notifications` を任意のタイミングで叩けてしまう
-- (実害はcronの前倒し程度だが、legal-life/authの同種関数は例外なくrevoke済みであり
-- Sporiveだけがこの慣行から外れていた)。
-- protect_admin_columns()はtrigger型のためPostgRESTからRPCとして呼べず実害はないが、
-- Supabase Advisorの指摘対象であり同様に閉じておく。

revoke execute on function sporive.cleanup_old_notifications() from public, anon, authenticated;
revoke execute on function sporive.protect_admin_columns() from public, anon, authenticated;
