-- Phase 11 のテスト（動作確認）で発見：emergency_maintenance フラグのチェックは
-- middleware内でログイン判定より前（未ログイン訪問者も含む）に実行されるが、
-- feature_flags のSELECTポリシーが authenticated ロールのみ許可していたため、
-- 未ログインの訪問者に対しては緊急メンテナンスモードが機能しない不具合があった。
-- feature_flags は機密情報を含まない運用トグルのため、anon ロールにもSELECTを許可する。
drop policy "認証済み利用者は機能フラグを参照可能" on feature_flags;

create policy "誰でも機能フラグを参照可能"
  on feature_flags for select to authenticated, anon
  using (true);
