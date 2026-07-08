-- 週間計画の要約（AI提案時の方針説明）。スケジュール表示画面で確認できるように保存する
alter table training_plans
  add column summary text;
