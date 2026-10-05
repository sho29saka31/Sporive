# Requirements: Auth（Sporive）

[Requirements](Requirements.md) の一部。アカウント・認証機能(要件定義書 §4, §4-1)。

## 4. アカウント・認証機能

> **現行（2026-09-16〜）**：以下の認証機能はすべて **auth.saka2931.jp**（authリポジトリ）が提供し、Sporiveは未ログイン時に `return_to` 付きで転送するだけになった（[ADR](ADR.md) ADR-009）。現行の仕様は authリポジトリの `docs/` を参照。ここでの記述は当初の要件として残す。変更点：マジックリンクは廃止、ログイン手段は パスワード（Turnstile付き）/ Google（OAuth・One Tap）/ パスキー、表示名はauthが所有、アカウント削除は30日の予約制。

- **アカウント作成時**：Googleアカウント認証（OAuth）を実施
- OAuth認証後、同じメールアドレスに対して**パスワードを設定**する画面を表示
- **ログイン時**：Google OAuthログイン、またはメールアドレス＋パスワードログインのどちらも可能（Supabase Authのアイデンティティ連携機能を利用）
- 大量アカウント作成対策：新規登録がGoogle OAuthのみ（メール/パスワード単体での新規登録フォームは存在しない）のため、Googleの認証自体がゲートとなり実質的に抑制済みと判断。追加対策は見送り
- 実装タイミング：**7月デモ版でここまで実装**

## 4-1. 認証セキュリティ強化

> 現行の実施状況：CAPTCHA（Turnstile）・メール送信・MFA（TOTP）・パスキーはauthアプリ側で運用。JWT有効期限・リフレッシュトークンローテーション等のSupabase Dashboard設定は [Setup Security Hardening](Setup-Security-Hardening.md) を参照。

- **JWT（アクセストークン）有効期限**：Supabaseのデフォルト（3600秒）から**1800秒（30分）**に短縮（Supabase Dashboard設定）
- **リフレッシュトークンローテーション**：有効化する。使用済みのリフレッシュトークンが再度使われた場合（漏洩・不正利用の兆候）、該当セッションを強制失効させる再利用検知もあわせて有効になる（Supabase Dashboard設定）
- **Auth Rate Limits**：ブルートフォース対策として、サインイン試行の制限を強化（Supabase Dashboard設定）
- **CAPTCHA**：Cloudflare Turnstileを採用（無料枠の制約がないため、hCaptchaより優先。利用にはTurnstileのアカウント登録が必要）
- **カスタムSMTP**：Resendを採用。Supabase既定のメール送信は1時間あたり数通に制限されており本番運用に不向きなため（Resend無料枠：3,000通/月・100通/日）
- **メールテンプレートの日本語化**：パスワード再設定・確認メール等をSupabase標準の英語から日本語に変更
- **MFA（多要素認証）**：TOTP（認証アプリ）方式のみ採用。全プランで無料。電話番号によるAdvanced MFA Phoneは有料（$75/月〜＋SMS従量課金）のため不採用（**実装済み**：アカウント設定＞セキュリティ画面でQRコードを読み取って有効化。middlewareでAAL2未達の利用者を認証コード入力画面へ誘導）
- **カスタムアクセストークンフック**（当初の設計。**現行では未使用**）：Postgres関数としてAuth Hookを実装し、JWTクレームに`is_admin`・`is_super_admin`を埋め込む設計だった。現行は `sporive.profiles` をリクエストごとに読んで判定しており、権限の付与・削除は次のリクエストから反映される（[Architecture](ARCHITECTURE.md)）。関数 `0013_custom_access_token_hook.sql` はDBに残るが、アプリは参照しない
- **ログイン中の端末一覧・全ログアウト**：検証の結果、Supabase Authには一般利用者が自身のセッション一覧を取得できる公開APIが無いため、当初は端末一覧の表示を見送った。**現行**：authアプリが `auth_app.sessions` で独自に管理し、`auth.saka2931.jp/account/devices` で一覧・強制ログアウトができる

採用理由・意思決定の背景は [ADR](ADR.md) も参照。
