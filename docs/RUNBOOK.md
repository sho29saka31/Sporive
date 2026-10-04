# Runbook（Sporive）

運用中に発生しうる事象への対処手順。

## プロフィール登録・データ書き込みが「permission denied for table X」で失敗する

**原因**：`sporive`スキーマの`anon`/`authenticated`ロールへのGRANTが欠落している（2026-09-14に実際に発生した障害）。RLSポリシーが存在していても、GRANTがなければPostgRESTはそもそもテーブルへのアクセス自体を拒否する。

**確認方法**：
```sql
select table_name, grantee, privilege_type
from information_schema.role_table_grants
where table_schema = 'sporive' and grantee in ('anon', 'authenticated');
```
対象テーブルの行が出てこなければGRANT漏れ。

**対処**：
```sql
grant usage on schema sporive to anon, authenticated;
grant select, insert, update, delete on all tables in schema sporive to anon, authenticated;
grant usage, select on all sequences in schema sporive to anon, authenticated;
alter default privileges in schema sporive grant select, insert, update, delete on tables to anon, authenticated;
alter default privileges in schema sporive grant usage, select on sequences to anon, authenticated;
```
RLSポリシーは別途正しく設定されている前提（GRANTは「テーブルにアクセスできるか」、RLSは「どの行にアクセスできるか」の別レイヤー）。

## 通知が届かない・遅延する

1. `monitoring_heartbeat`相当の仕組みはSporive自体にはないため、まず`notification_logs`に直近の送信記録があるか確認
2. pg_cronジョブ（`0009_notify_pg_cron.sql`）が正常に動作しているか、Supabaseダッシュボードの **Database → Cron Jobs** で実行履歴を確認
3. `net.http_post`のタイムアウト（15000ms指定）を超過していないか、pg_netのレスポンスログ（6時間で自動削除される点に注意）を確認
4. `/api/notifications/dispatch`への直接リクエストで`CRON_SECRET`の不一致がないか確認（Supabase Vaultの`cron_secret`とVercel環境変数`CRON_SECRET`が一致している必要がある）
5. 呼び出し先URLは `0034_update_dispatch_cron_url.sql` で `https://sporive.saka2931.jp/api/notifications/dispatch` に更新済み（当初の `0009` は旧 `sporive.vercel.app`）。`select jobname, command like '%sporive.saka2931.jp%' from cron.job where jobname = 'sporive-notifications-dispatch';` で確認できる。ドメインを変更する場合は `cron.alter_job` で宛先を更新する

## Gemini API呼び出しが失敗する・タイムアウトする

- `GEMINI_MODEL`環境変数が正しく設定されているか確認（未設定だとエラーになる設計）
- Vercel無料プランの既定10秒タイムアウトを回避するため、該当Route Handlerには`maxDuration = 45`を明示している。それでも失敗する場合はGemini API自体の障害・レート制限の可能性がある

## 緊急にサイト全体を止めたい（緊急メンテナンスモード）

- **adac の `/admin/features`** で Sporive の `emergency_maintenance` をONにする（Sporive自身の管理画面からは操作できない）。コード変更・デプロイ不要
- 効果：①ページは `/maintenance`（503表示）へ転送（`/privacy` `/terms` `/admin*` `/api/*` は除外）②`saka2931-service` のRLS（`maintenance_lockdown`）がanon/authenticatedのDB直接アクセスを拒否（管理者とservice_roleは対象外）
- ページ転送は次のリクエストから、DB側は同期（トリガー+pg_net）で数秒以内に反映。同期に失敗しても5分ごとの再同期cronで収束する。解除後に画面は戻ったのにデータが拒否される場合は `select * from auth_app.maintenance_state;`（`service='sporive'`）の `active` を確認する
- フラグ値の取得に失敗した場合は「止めない」側に倒れる（誤って全サイトを止めないため。フェイルオープン）
- 新しい `sporive` テーブルを追加したときは `maintenance_lockdown` ポリシーを付ける（付け忘れるとそのテーブルだけロック対象外になる）
- 定期メンテナンス（JST 2:30〜3:30）は時刻ベースで自動。同じく `/maintenance` へ転送される

## 特定の機能だけ一時停止したい

- adac の `/admin/features` の各フラグ（AI機能マスター・個別AI機能・運動強度チェック・新規ユーザー登録・通知機能・負債管理機能）をOFFにする
- フラグ取得失敗時は「有効」がデフォルトのため、`saka2931-infra`側の障害で誤って機能が止まることはない（フェイルオープン設計）

## ログインできない・ログイン画面に飛ばされ続ける

ログイン・登録・MFA・パスキー・パスワード再設定は **auth.saka2931.jp** の機能。まず authリポジトリの `docs/RUNBOOK.md` を参照する。Sporive側で確認すること：

1. 未ログイン時に `https://auth.saka2931.jp/login?return_to=...` へ転送されているか（middleware）
2. ログイン後に戻ってきても再度転送される → `.saka2931.jp` スコープのCookieをSporiveが読めていない。SporiveのSupabase URL/anon keyが `saka2931-service` を指しているか、ブラウザがCookieを拒否していないか
3. ログイン後に `/onboarding/profile` に送られる → `sporive.profiles` に行が無い（初回登録）。登録後は `sporive-onboarded` Cookieにキャッシュされる
4. 表示名が空 → auth の `GET /api/profile` が応答しているか（`lib/authApp.ts::getDisplayName()` は失敗時 `null` を返す）
5. 管理者APIが401/403になる → 管理者はTOTP登録が必須。authの `/account/mfa` で登録し、ログインし直す

## Google OAuthログインが失敗する（policy_enforced等）

- 要求しているOAuthスコープがGoogleの「非センシティブ」分類（email/profile/openid）に収まっているか確認する。Sensitive/Restrictedスコープを追加する場合はGoogle Cloud ConsoleでのOAuth同意画面の検証（スコープの理由・デモ動画）が必須になり、それを経ずに追加するとAdvanced Protection Programユーザーが全員ブロックされる

## デプロイ後に本番でログイン後localhostや別URLへ飛ばされる

- Supabase **Authentication → URL Configuration** は auth アプリ用（Site URL は `https://auth.saka2931.jp`）。プロジェクト共有のため、Sporive向けに書き換えない。症状が出たら authリポジトリの `docs/RUNBOOK.md` の「ログイン後に別URLへ飛ぶ」を参照

## Vercelの自動一時停止が心配

- pg_cronによる10分おきの通知dispatch呼び出しが副次的にDBアクティビティを発生させ、Supabase無料プランの7日間無アクティビティ自動一時停止を防止している。通知機能自体を長期間停止する場合は、この副次効果も失われる点に留意

## Search Consoleでサイトマップが読み込めない・ロゴ画像がnext/imageで表示されない

**原因**：middlewareの認証ガード（`updateSession`）の除外パターンに、`robots.txt`・`sitemap.xml`・OGP画像・ロゴ画像等の静的/SEO関連パスが含まれていないと、未ログインのクローラーや`next/image`最適化エンドポイントへのリクエストが`/login`へリダイレクトされてしまう（実際に発生した不具合）。

**対処**：リポジトリ直下の`middleware.ts`の`config.matcher`の除外パターンに、該当パスが含まれているか確認する。新しい静的アセット・公開ルートを追加した場合は、このパターンへの追加を忘れずに行う。

## npm auditで重大な脆弱性が報告された

1. `npm audit --production`で報告内容を確認する
2. `npm audit fix`（breaking changeを伴わない範囲）でまず修正を試みる。Next.jsのメジャーバージョンアップが必要な指摘は、既存コードとの互換性を確認した上で別途対応する
3. 2026-09-14の包括ドキュメント監査で、`next@16.2.10`のcritical脆弱性（Windows RCE・Image Optimization API経由のRCE等、GHSA-p293-qw3h-jr36ほか）を`next@16.3.5`（パッチ版）へのアップグレードで解消済み

## 本番エラーが発生しているが原因が分からない

利用者には `error.tsx`/`global-error.tsx`（500系の専用画面。稼働状況ページへのリンク付き）が表示される。これらは`console.error`のみでSentry等の外部エラートラッキングサービスとは連携していない（未導入）。障害が広範囲なら <https://status.saka2931.jp> と adac のインシデント投稿も確認する。本番エラーの調査は、Vercelダッシュボードの **Deployments → Runtime Logs**（または`vercel logs`コマンド）でサーバー側のログを確認する。クライアント側のみで発生したエラー（ネットワークエラー等）はVercelログに残らないため、再現手順の聞き取りやブラウザの開発者ツールでの確認も併用する。

## 「AI機能の利用回数が上限に達しました」（429）の問い合わせが来た

**原因**：`/api/ai/propose-plan`・`/api/ai/improve-plan`・`/api/ai/recovery`は3エンドポイント合算・ユーザー単位で60分あたり15回のレート制限がかかっている（ADR-008、`supabase/migrations/0031_ai_rate_limit.sql`）。想定される正当な原因は、短時間にAI提案・改善案の再生成を繰り返した場合。

**確認方法**：SupabaseのSQL Editorで該当ユーザーの直近リクエスト履歴を確認する

```sql
select endpoint, created_at
from sporive.ai_request_log
where user_id = '<該当ユーザーのUUID>'
order by created_at desc
limit 20;
```

**対処**：想定内の連打であれば60分の経過を待つよう案内する。想定外に大量のリクエストが記録されている場合は、UIを介さない直接API呼び出し（不正利用）の可能性を疑い、該当ユーザーのアクセスパターンを確認する。上限値（15回/60分）はマイグレーション内の`p_max_requests`/`p_window_minutes`のデフォルト値で調整可能。

**関連**：`sporive.ai_request_log`は専用cronジョブ`sporive-ai-request-log-cleanup`（毎日18:10 UTC）で古いレコードが自動削除される。レート制限インフラ自体（DB接続等）に障害が起きた場合はフェイルオープンでAIリクエストを許可するため、429ではなく通常のAI機能不調（502等）として現れる。

## 管理者画面が500エラーになる（permission denied for schema sporive）

**原因**：`service_role` に `sporive` スキーマの権限が無い（2026-09-16に実際に発生。`0033_grant_service_role_schema_privileges.sql` で修正済み）。`SUPABASE_SERVICE_ROLE_KEY` を使う管理画面・CSV出力・通知dispatchが失敗する。

**確認方法**：`select has_schema_privilege('service_role', 'sporive', 'usage');`

**対処**：`grant usage on schema sporive to service_role; grant select, insert, update, delete on all tables in schema sporive to service_role;`

## 「Deployment was blocked」でVercelのデプロイが止まる

ヘッドコミットの作者がVercelチームのメンバーでない。`git log origin/<branch> -1 --format='%an <%ae>'` を確認する。**gitの作者設定は変更しない**。誤った作者のコミットを含むPRは、正しい作者で作り直す（履歴の書き換えはしない）。

## Googleログインの審査・同意画面について

Google OAuth同意画面・クライアントは **auth.saka2931.jp 専用** に作り直してある。Sporiveには専用のGoogle設定は無い。審査や同意画面の変更は authリポジトリの `docs/Setup.md` を参照。
