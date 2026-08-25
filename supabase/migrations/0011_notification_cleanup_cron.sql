-- 定期クリーンアップジョブ（要件定義書 §8-2、計画：Phase 10）
-- notification_logsの30日超過分・古いpush_subscriptionsを毎日3:00（JST）に削除する。
-- 定期メンテナンスタイム（§8-3、JST 2:30〜3:30）の中で実行し、書き込み負荷が
-- 少ない時間帯にVercel APIを経由せずSupabase内部のSQLのみで完結させる。

create or replace function cleanup_old_notifications()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from notification_logs
  where created_at < now() - interval '30 days';

  -- push_subscriptionsには有効期限を示すカラムがなく、Web Push仕様上も
  -- クライアント側の失効を事前に知る方法がないため、実際に送信を試みて
  -- 410/404が返った時点で削除する方式（/api/notifications/dispatch側で対応済み）
  -- を主とする。本ジョブでは、それでも残り続ける「作成から1年以上更新されていない」
  -- 購読のみを対象に、念のための定期整理を行う。
  delete from push_subscriptions
  where created_at < now() - interval '365 days';
end;
$$;

select cron.schedule(
  'sporive-notification-cleanup',
  -- JST 3:00 = UTC 18:00（前日）
  '0 18 * * *',
  $$ select cleanup_old_notifications(); $$
);
