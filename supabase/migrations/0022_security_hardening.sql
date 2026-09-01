-- 【セキュリティ修正】3回目の再監査で発見した2件のRLS上の欠陥を修正
--
-- 1. workout_logs：plan_item_id の所有者検証が欠落しており、他人の
--    training_plans/plan_items に紐づく plan_item_id を指定して実績ログを
--    作成・更新できてしまっていた（user_idの所有者チェックのみで、
--    plan_item_id が本人の計画に属するかは未検証だった）。
--    plan_items自体のRLSは training_plans 経由の所有者チェックをしているのに、
--    workout_logs だけこの検証が非対称に欠けていた。
--
-- 2. site_announcements：SELECTポリシーが `using (true)` で、is_active・
--    scheduled_at によるフィルタが一切なく、ログイン済みの利用者が
--    Supabase JSクライアントを直接叩けば、まだ公開時刻に達していない予約中の
--    お知らせや無効化済みのお知らせの全文を先読みできてしまっていた
--    （公開判定はアプリケーションコード側のみで行われ、DB側では保護されて
--    いなかった）。管理画面（admin/settings/page.tsx）はservice_roleクライアント
--    で取得しているため、この修正による影響はない。

-- 1. workout_logs：plan_item_idが本人の計画に属することを検証
drop policy if exists "本人の記録のみ作成可能" on workout_logs;
drop policy if exists "本人の記録のみ更新可能" on workout_logs;

create policy "本人の記録のみ作成可能"
  on workout_logs for insert to authenticated
  with check (
    (select auth.uid()) = user_id
    and (
      plan_item_id is null
      or exists (
        select 1
        from plan_items
        join training_plans on training_plans.id = plan_items.plan_id
        where plan_items.id = workout_logs.plan_item_id
          and training_plans.user_id = (select auth.uid())
      )
    )
  );

create policy "本人の記録のみ更新可能"
  on workout_logs for update to authenticated
  using ((select auth.uid()) = user_id)
  with check (
    (select auth.uid()) = user_id
    and (
      plan_item_id is null
      or exists (
        select 1
        from plan_items
        join training_plans on training_plans.id = plan_items.plan_id
        where plan_items.id = workout_logs.plan_item_id
          and training_plans.user_id = (select auth.uid())
      )
    )
  );

-- 2. site_announcements：公開済み（is_active かつ 予約時刻を過ぎている）行のみ参照可能に
drop policy if exists "認証済み利用者はお知らせを参照可能" on site_announcements;

create policy "認証済み利用者は公開済みお知らせのみ参照可能"
  on site_announcements for select to authenticated
  using (
    is_active = true
    and (scheduled_at is null or scheduled_at <= now())
  );
