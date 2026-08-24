-- 通知送信トリガーをGitHub Actions scheduled workflowからSupabase pg_cronに変更
-- 理由：GitHub Actionsのscheduled workflowは無料枠では混雑時に大幅（実測で数十分規模）に
-- 遅延することがあり、通知が想定時刻に届かない事象が発生した。pg_cron+pg_netならSupabase
-- 内部のPostgresから直接dispatch APIを呼び出すため、外部サービスのキュー待ちの影響を受けない。

create extension if not exists pg_cron with schema extensions;
create extension if not exists pg_net with schema extensions;

-- CRON_SECRETは本マイグレーションの実行前に、SQL Editorで以下を別途実行しておくこと
-- （実際の値はGitHub Actionsで使っていたものと同じでよい。Vaultに保存するためgitには含めない）：
--
--   select vault.create_secret('<CRON_SECRETの実際の値>', 'cron_secret');
--
-- 既に他の名前で登録済みの場合は select vault.update_secret(...) を使う。

select cron.schedule(
  'sporive-notify-dispatch',
  '*/10 * * * *',
  $$
  select net.http_post(
    url := 'https://sporive.vercel.app/api/notifications/dispatch',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (
        select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret'
      )
    ),
    body := '{}'::jsonb,
    -- pg_netのデフォルトタイムアウトは2000msだが、dispatch APIは対象利用者数分の
    -- DB問い合わせ・push送信を順に行うため、それより長めに確保しておく
    timeout_milliseconds := 15000
  );
  $$
);
