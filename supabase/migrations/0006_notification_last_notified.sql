-- 通知の送信済み管理（Phase 5改善）
--
-- GitHub Actionsのscheduled workflowは5分間隔を保証せず、混雑時は数十分〜
-- 数時間遅延することがある。「現在の5分スロットとnotify_timeの一致」で判定すると
-- 遅延した回では通知がスキップされてしまうため、「設定時刻を過ぎた最初の実行で
-- 送信し、送信済みの日付を記録して同日の重複送信を防ぐ」方式に変更する。

alter table notification_settings
  add column last_notified_on date;

comment on column notification_settings.last_notified_on is
  '当日通知を最後に送信（または送信判定）した日付。同日の重複送信を防ぐ';
