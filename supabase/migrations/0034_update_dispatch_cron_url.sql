-- 通知送信cron(sporive-notifications-dispatch)の宛先が、旧Vercelドメイン
-- (sporive.vercel.app)のままだった。独自ドメインへ移行済みのため、宛先のホストのみを
-- 本番ドメインへ置き換える(ヘッダー・Vaultからのシークレット取得・タイムアウト等、
-- 既存コマンドの他の部分は一切変更しない)。冪等: 既に置換済みなら何も変わらない。
--
-- 実行方法: Supabase Dashboard の SQL Editor で、このファイルの内容をそのまま実行する。
-- 実行後の確認:
--   select jobname, command like '%sporive.saka2931.jp%' as migrated
--   from cron.job where jobname = 'sporive-notifications-dispatch';

select cron.alter_job(
  job_id := (select jobid from cron.job where jobname = 'sporive-notifications-dispatch'),
  command := (
    select replace(command, 'https://sporive.vercel.app', 'https://sporive.saka2931.jp')
    from cron.job
    where jobname = 'sporive-notifications-dispatch'
  )
);
