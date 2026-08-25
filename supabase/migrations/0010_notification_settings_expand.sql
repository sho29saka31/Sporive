-- 通知種別ごとに時刻・ON/OFF可否を分離する（要件定義書 §8-1、計画：Phase 10）
-- 共通の notify_time は廃止し、種別ごとのカラムに置き換える。
-- 既存の notify_time の値は、当日予定通知・負債リマインダーの両方の初期値として引き継ぐ。

alter table notification_settings
  add column daily_reminder_time time not null default '08:00',
  add column debt_reminder_time time not null default '20:00',
  add column reengagement_enabled boolean not null default true,
  add column weekly_report_enabled boolean not null default false,
  add column weekly_report_time time not null default '09:00',
  add column quiet_hours_start time,
  add column quiet_hours_end time,
  add column quiet_days smallint[] not null default '{}';

update notification_settings
  set daily_reminder_time = notify_time,
      debt_reminder_time = notify_time;

alter table notification_settings drop column notify_time;

comment on column notification_settings.reengagement_enabled is
  '再エンゲージメント通知（3日以上トレーニング記録がない利用者への通知）のON/OFF。時刻は17:00固定でシステム側の定数として扱うため、時刻カラムは持たない';
comment on column notification_settings.weekly_report_time is
  '週次レポートの送信時刻。曜日は日曜固定でシステム側の定数として扱うため、曜日カラムは持たない';
comment on column notification_settings.quiet_days is
  '非通知曜日。0=日曜〜6=土曜の配列。空配列は無効（曜日指定なし）';
