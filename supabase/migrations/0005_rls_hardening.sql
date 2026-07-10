-- RLS強化：Supabase公式セキュリティチェックリストへの準拠
--
-- 1. UPDATEポリシーに WITH CHECK を追加
--    （WITH CHECKがないと、更新時に行のuser_id/idを他人へ書き換えられてしまう）
-- 2. すべてのポリシーに TO authenticated を指定
--    （匿名ロールにはそもそもポリシーを評価させない。意図の明確化と性能向上）
-- 3. auth.uid() を (select auth.uid()) に変更
--    （initPlanで1回だけ評価されるようにする性能最適化。公式推奨）

-- profiles
drop policy "本人のプロフィールのみ参照可能" on profiles;
drop policy "本人のプロフィールのみ作成可能" on profiles;
drop policy "本人のプロフィールのみ更新可能" on profiles;

create policy "本人のプロフィールのみ参照可能"
  on profiles for select to authenticated
  using ((select auth.uid()) = id);
create policy "本人のプロフィールのみ作成可能"
  on profiles for insert to authenticated
  with check ((select auth.uid()) = id);
create policy "本人のプロフィールのみ更新可能"
  on profiles for update to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- calendar_tokens
drop policy "本人のトークンのみ参照可能" on calendar_tokens;
drop policy "本人のトークンのみ書き込み可能" on calendar_tokens;
drop policy "本人のトークンのみ更新可能" on calendar_tokens;

create policy "本人のトークンのみ参照可能"
  on calendar_tokens for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "本人のトークンのみ書き込み可能"
  on calendar_tokens for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy "本人のトークンのみ更新可能"
  on calendar_tokens for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- training_plans
drop policy "本人の計画のみ参照可能" on training_plans;
drop policy "本人の計画のみ作成可能" on training_plans;
drop policy "本人の計画のみ更新可能" on training_plans;
drop policy "本人の計画のみ削除可能" on training_plans;

create policy "本人の計画のみ参照可能"
  on training_plans for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "本人の計画のみ作成可能"
  on training_plans for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy "本人の計画のみ更新可能"
  on training_plans for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy "本人の計画のみ削除可能"
  on training_plans for delete to authenticated
  using ((select auth.uid()) = user_id);

-- plan_items（training_plans経由の所有チェック）
drop policy "本人の計画項目のみ参照可能" on plan_items;
drop policy "本人の計画項目のみ作成可能" on plan_items;
drop policy "本人の計画項目のみ更新可能" on plan_items;
drop policy "本人の計画項目のみ削除可能" on plan_items;

create policy "本人の計画項目のみ参照可能"
  on plan_items for select to authenticated
  using (exists (
    select 1 from training_plans
    where training_plans.id = plan_items.plan_id
      and training_plans.user_id = (select auth.uid())
  ));
create policy "本人の計画項目のみ作成可能"
  on plan_items for insert to authenticated
  with check (exists (
    select 1 from training_plans
    where training_plans.id = plan_items.plan_id
      and training_plans.user_id = (select auth.uid())
  ));
create policy "本人の計画項目のみ更新可能"
  on plan_items for update to authenticated
  using (exists (
    select 1 from training_plans
    where training_plans.id = plan_items.plan_id
      and training_plans.user_id = (select auth.uid())
  ))
  with check (exists (
    select 1 from training_plans
    where training_plans.id = plan_items.plan_id
      and training_plans.user_id = (select auth.uid())
  ));
create policy "本人の計画項目のみ削除可能"
  on plan_items for delete to authenticated
  using (exists (
    select 1 from training_plans
    where training_plans.id = plan_items.plan_id
      and training_plans.user_id = (select auth.uid())
  ));

-- workout_logs
drop policy "本人の記録のみ参照可能" on workout_logs;
drop policy "本人の記録のみ作成可能" on workout_logs;
drop policy "本人の記録のみ更新可能" on workout_logs;
drop policy "本人の記録のみ削除可能" on workout_logs;

create policy "本人の記録のみ参照可能"
  on workout_logs for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "本人の記録のみ作成可能"
  on workout_logs for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy "本人の記録のみ更新可能"
  on workout_logs for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy "本人の記録のみ削除可能"
  on workout_logs for delete to authenticated
  using ((select auth.uid()) = user_id);

-- push_subscriptions
drop policy "本人の購読のみ参照可能" on push_subscriptions;
drop policy "本人の購読のみ作成可能" on push_subscriptions;
drop policy "本人の購読のみ削除可能" on push_subscriptions;

create policy "本人の購読のみ参照可能"
  on push_subscriptions for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "本人の購読のみ作成可能"
  on push_subscriptions for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy "本人の購読のみ削除可能"
  on push_subscriptions for delete to authenticated
  using ((select auth.uid()) = user_id);

-- notification_settings
drop policy "本人の通知設定のみ参照可能" on notification_settings;
drop policy "本人の通知設定のみ作成可能" on notification_settings;
drop policy "本人の通知設定のみ更新可能" on notification_settings;

create policy "本人の通知設定のみ参照可能"
  on notification_settings for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "本人の通知設定のみ作成可能"
  on notification_settings for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy "本人の通知設定のみ更新可能"
  on notification_settings for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- debts
drop policy "本人の負債のみ参照可能" on debts;
drop policy "本人の負債のみ更新可能" on debts;

create policy "本人の負債のみ参照可能"
  on debts for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "本人の負債のみ更新可能"
  on debts for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- streaks
drop policy "本人のストリークのみ参照可能" on streaks;

create policy "本人のストリークのみ参照可能"
  on streaks for select to authenticated
  using ((select auth.uid()) = user_id);

-- ai_proposal_logs
drop policy "本人のAI提案ログのみ参照可能" on ai_proposal_logs;
drop policy "本人のAI提案ログのみ作成可能" on ai_proposal_logs;

create policy "本人のAI提案ログのみ参照可能"
  on ai_proposal_logs for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "本人のAI提案ログのみ作成可能"
  on ai_proposal_logs for insert to authenticated
  with check ((select auth.uid()) = user_id);
