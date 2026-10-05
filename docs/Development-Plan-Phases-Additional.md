# Development Plan: Phases (Additional)（Sporive）

[Development Plan](Development-Plan.md) の一部。Phase 10〜12（追加計画フェーズ、2026-08-24策定）。

## 🔔 Phase 10：通知機能の再構成・定期メンテナンスモード ✅完了

[Requirements Notifications](Requirements-Notifications.md) §8-1〜8-4 に対応。

- `notification_settings` に追加カラムを設けるマイグレーション（[Development Plan Structure](Development-Plan-Structure.md) §4-1参照）
- 通知種別ごとの時刻・ON/OFF可否UI（`NotificationSettingsForm.tsx`の作り直し。時刻入力は10分刻み）
- 非通知時間帯・非通知曜日の判定ロジックを `dispatch` に追加
- 再エンゲージメント通知（3日以上未記録の判定）・週次レポート（Gemini呼び出し、日曜固定）を `dispatch` に追加
- `notification_logs` の30日超過分・期限切れ`push_subscriptions`を削除する定期クリーンアップジョブ（pg_cron、SQLのみ、Vercel API非経由）
- 定期メンテナンスモード：`middleware.ts`にJST 1:00〜2:30（お知らせバー）・2:30〜3:30（当時はトップページ以外アクセス不可・ログイン不可、`/admin`配下は対象外。現行はトップも含めHTTP 503の`/maintenance`を返す）の時間帯判定を追加
- `/settings/notifications` を「お知らせ」画面に改名し、通知履歴／お知らせタブの切替UIを追加

## 🔑 Phase 11：管理者権限の拡張・高度な設定 ✅完了

[Requirements Admin](Requirements-Admin.md) §10-2〜10-3、[Requirements Auth](Requirements-Auth.md) §4-1（カスタムアクセストークンフック関連）に対応。

- `profiles.is_super_admin` 追加、カスタムアクセストークンフック（Postgres関数のAuth Hook）でJWTに`is_admin`・`is_super_admin`を埋め込み（当時の実装。現行は `profiles` を都度参照する方式に変更済みで、フックはアプリから参照されない）
- `feature_flags`・`site_announcements`・`announcement_reads` テーブルの作成（後に`saka2931-infra`側の`feature_flags`・`service_announcements`に統合）
- 「高度な設定」ページを新設。`is_super_admin`でガード（当時はJWTクレーム、現行は `profiles.is_super_admin` を都度参照）
  - 機能タブ：AI機能（マスター＋個別4機能）・運動強度チェック・新規ユーザー登録・通知機能全体・Googleカレンダー連携（後に廃止）・緊急メンテナンスモード・負債管理機能の各フラグと、各機能側でのフラグ参照実装
  - お知らせタブ：タイトル・本文・レベル（お知らせ/注意/警告）・影響範囲ページ／開けなくするページの入力フォーム。レベルごとに専用スタイルで表示するコンポーネント
- 利用者側：お知らせバー（該当ページで警告時にブロック）、お知らせ履歴タブでの一覧・既読管理

## 🔒 Phase 12：認証セキュリティ強化（認証部分はauthアプリへ移管）

[Requirements Auth](Requirements-Auth.md) §4-1 に対応。2026-09-16に認証機能そのものを `auth.saka2931.jp` へ集約したため（[ADR](ADR.md) ADR-009）、実装項目は auth リポジトリ側の管理に移った。

- [x] MFA（TOTP）：authアプリの `/account/mfa` ＋ `/mfa-challenge`。Sporiveのmiddlewareは保険としてAAL2待ちをauthへ転送。管理者はTOTP登録を必須化
- [x] ログイン中の端末一覧・強制ログアウト：当初は見送りだったが、`auth_app.sessions` による独自管理をauthに実装（`/account/devices`）。Sporiveは `PushCleanupWatcher` で登録・監視
- [x] Cloudflare Turnstile導入：authアプリの全ログイン経路に実装（Sporive側のTurnstile依存・環境変数は削除済み）
- [x] パスキー・Google One Tap：authアプリで新規提供
- [ ] Supabase Dashboard設定（JWT有効期限30分、リフレッシュトークンローテーション、Auth Rate Limits、メールテンプレート日本語化）：コード変更なしのユーザー作業。実施状況は未確認のため [Setup Security Hardening](Setup-Security-Hardening.md) と authリポジトリの `docs/Setup.md` で点検する
- [x] Resend導入・カスタムSMTP設定：設定済み（Sender nameは `auth`）。メール送信のレート制限（Supabase側）は未調整の可能性があり要確認
- [ ] 漏洩パスワード保護（Leaked password protection）：有料プラン向けのため利用不可

**ユーザー作業の詳細**：[Setup Security Hardening](Setup-Security-Hardening.md) を参照。Cloudflare Turnstile・Resendのアカウント登録とAPIキー取得、Supabase Dashboardでの各種Auth設定変更が必要。
