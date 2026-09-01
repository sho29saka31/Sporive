-- 【不具合修正】push_subscriptionsにUPDATEポリシーがなく、購読の再登録が失敗する
--
-- /api/notifications/subscribe のPOSTハンドラは
--   supabase.from('push_subscriptions').upsert({...}, { onConflict: 'endpoint' })
-- を利用者セッション（RLS適用）で実行している。endpointにunique制約があるため、
-- 同一端末での再購読時はUPDATE分岐になるが、push_subscriptionsにはUPDATEの
-- RLSポリシーが一度も定義されておらず、PostgresのRLSは
-- INSERT ... ON CONFLICT DO UPDATE のUPDATE分岐にもUPDATEポリシーを要求するため、
-- 常にdb_error（500）になっていた。

create policy "本人の購読のみ更新可能"
  on push_subscriptions for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
