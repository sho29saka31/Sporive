-- Phase 10 のテスト（動作確認）で発見：daily_reminder_enabled / debt_reminder_enabled は
-- Phase 10 で当日予定通知・負債リマインダーを「常時有効」に変更した際にUIから
-- ON/OFF切り替えが削除され、アプリコードから参照されなくなった不要カラム。
alter table notification_settings
  drop column daily_reminder_enabled,
  drop column debt_reminder_enabled;
