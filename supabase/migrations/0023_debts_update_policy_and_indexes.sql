-- 【セキュリティ修正】4回目の再監査で発見した1件のRLS上の欠陥を修正。
-- あわせて、頻出クエリ（user_id/日付での絞り込み、管理者集計）に対する
-- インデックスを追加する（4回目監査・管理者機能エージェントの指摘）。
--
-- debts：UPDATEポリシーが `auth.uid() = user_id` のみで、本人の負債行に対する
-- 更新である限り、resolved_at 以外の列（plan_item_id・missed_on・
-- sets_remaining・reps_remaining）も自由に書き換えられてしまっていた。
-- アプリ側（src/app/(user)/debts/actions.ts）は resolved_at のみを更新するが、
-- Supabase JSクライアントを直接叩けば、他人の plan_items を指す plan_item_id
-- への差し替えや、消化量（sets_remaining/reps_remaining）の改ざんが可能で、
-- 管理者集計（admin-stats.ts）・日次バッチ（daily-check.ts）の前提を崩しうる。
-- 本人による更新は「未消化を解消済みにする」（resolved_atのセット）のみを
-- 許可し、他の列は変更前の値と一致することを要求する。
-- PostgreSQLのRLSにはUPDATE用のOLD参照がないため、行のidで自己結合して
-- 更新前の値と比較する。

drop policy "本人の負債のみ更新可能" on debts;

create policy "本人の負債のみ更新可能"
  on debts for update to authenticated
  using ((select auth.uid()) = user_id)
  with check (
    (select auth.uid()) = user_id
    and user_id = (select d.user_id from debts d where d.id = debts.id)
    and missed_on = (select d.missed_on from debts d where d.id = debts.id)
    and plan_item_id is not distinct from
      (select d.plan_item_id from debts d where d.id = debts.id)
    and sets_remaining = (select d.sets_remaining from debts d where d.id = debts.id)
    and reps_remaining = (select d.reps_remaining from debts d where d.id = debts.id)
  );

-- パフォーマンス用インデックス（頻出の絞り込み条件に対応）
create index if not exists workout_logs_user_id_performed_on_idx
  on workout_logs (user_id, performed_on);
create index if not exists training_plans_user_id_week_start_date_idx
  on training_plans (user_id, week_start_date);
create index if not exists training_plans_active_week_start_date_idx
  on training_plans (week_start_date) where status = 'active';
create index if not exists plan_items_plan_id_idx
  on plan_items (plan_id);
create index if not exists debts_user_id_missed_on_idx
  on debts (user_id, missed_on);
create index if not exists debts_unresolved_user_id_idx
  on debts (user_id) where resolved_at is null;
create index if not exists ai_proposal_logs_user_id_created_at_idx
  on ai_proposal_logs (user_id, created_at desc);
create index if not exists push_subscriptions_user_id_idx
  on push_subscriptions (user_id);
