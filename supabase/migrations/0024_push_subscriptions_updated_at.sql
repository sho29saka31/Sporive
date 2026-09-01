-- 【不具合修正】push_subscriptionsの1年経過クリーンアップがcreated_at基準のため、
-- 現役の購読（作成以降ずっと使い続けているだけのもの）まで削除されてしまう
-- （5回目の再監査で発見）
--
-- Web Pushの購読はendpointが変わらない限り何年でも有効であり、利用者が
-- 一度購読してから設定を一切変更していなくても created_at は当初のまま。
-- cleanup_old_notifications()（0011_notification_cleanup_cron.sql）は
-- 「作成から1年以上更新されていない」購読を削除する意図だったが、実際には
-- created_atしか無く一度も更新されないため、作成からちょうど365日経過した
-- 時点で正常な購読が無条件に削除されてしまっていた。
--
-- updated_at列を追加し、購読の新規登録・再登録（/api/notifications/subscribe）の
-- たびに更新するようにした上で、クリーンアップ判定もupdated_at基準に変更する。

alter table push_subscriptions
  add column updated_at timestamptz not null default now();

-- 既存行はcreated_atを初期値として使う（新規追加直後に誤って一斉削除されないように）
update push_subscriptions set updated_at = created_at;

create or replace function cleanup_old_notifications()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from notification_logs
  where sent_at < now() - interval '30 days';

  -- push_subscriptionsには有効期限を示すカラムがなく、Web Push仕様上も
  -- クライアント側の失効を事前に知る方法がないため、実際に送信を試みて
  -- 410/404が返った時点で削除する方式（/api/notifications/dispatch側で対応済み）
  -- を主とする。本ジョブでは、それでも残り続ける「登録・更新から1年以上
  -- 経過している」購読のみを対象に、念のための定期整理を行う。
  delete from push_subscriptions
  where updated_at < now() - interval '365 days';
end;
$$;
