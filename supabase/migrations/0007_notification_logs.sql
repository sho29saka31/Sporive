-- 通知履歴（/settings/notifications での表示用）
--
-- これまでdispatchは送信可否の判定（last_notified_on）のみを記録し、実際に
-- 何を送ったかは残らなかった。利用者が「通知した内容」を後から確認できるよう、
-- 送信した通知の内容を記録するテーブルを追加する。

create table notification_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  body text not null,
  sent_at timestamptz not null default now()
);

create index notification_logs_user_id_sent_at_idx
  on notification_logs (user_id, sent_at desc);

alter table notification_logs enable row level security;

-- 本人の履歴のみ閲覧可能。書き込みはservice_role（dispatchのAdmin API経由）のみとし、
-- 利用者からの書き込み・更新・削除は一切許可しない（ポリシー未定義＝デフォルト拒否）。
create policy "notification_logs_select_own"
  on notification_logs for select
  to authenticated
  using ((select auth.uid()) = user_id);

comment on table notification_logs is '送信済みプッシュ通知の履歴（利用者への表示用）';
