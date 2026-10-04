# Setup: Security Hardening（Sporive）

[Setup](Setup.md) の一部。Phase 12（認証セキュリティ強化、[Requirements Auth](Requirements-Auth.md) §4-1）の追加セットアップ(§7)。

> **現行（2026-10-04）**：認証関連の設定は **auth リポジトリの `docs/Setup.md`** が正。Supabase Auth の設定はプロジェクト単位で `saka2931-service` 共有のため、Sporive側から単独で変更しない。以下はSporive作成当初の手順の記録で、Turnstile は auth 専用サイトに作り替え済み（`sporive.saka2931.jp` 用のサイトは使わない）。実施済みかどうかはSupabase Dashboardで確認すること。

Claudeのコード変更では対応できない、ダッシュボード操作のみの項目です。MFA・Turnstile・パスキーの実装はauthアプリ側に移っています。

## 7-1. Supabase Dashboard設定（コード変更不要）

Supabaseダッシュボード → 対象プロジェクト → **Authentication** から設定します。

**JWT（アクセストークン）有効期限の短縮**

1. **Authentication** → **Sessions**（または **Settings** 内の JWT expiry 設定）を開く
2. **JWT expiry limit** を `3600`（既定・1時間）から `1800`（30分）に変更して保存

**リフレッシュトークンローテーション**

1. **Authentication** → **Sessions** の **Refresh token rotation** を有効化
2. 併せて **Reuse interval**（使用済みリフレッシュトークンの再利用検知の猶予秒数）が極端に長くなっていないか確認する

**Auth Rate Limits（ブルートフォース対策）**

1. **Authentication** → **Rate Limits** を開く
2. **Sign in / Sign up** 系のレート制限が有効になっていることを確認

**メールテンプレートの日本語化**

1. **Authentication** → **Email Templates** を開く
2. 以下のテンプレートを日本語文面に差し替える（件名・本文とも）
   - **Reset Password**（パスワード再設定メール。実際に利用）
   - **Change Email Address**（メールアドレス変更確認。実際に利用）
   - Confirm signupはSporiveがGoogle OAuth登録のため通常は不使用

## 7-2. Cloudflare Turnstile（CAPTCHA）

無料枠の制約がないためhCaptchaより優先して採用。

1. https://dash.cloudflare.com/ でCloudflareアカウントを作成
2. 左メニュー **Turnstile** → **Add site**
3. サイト名（例：auth）、ドメインに `auth.saka2931.jp` を追加（現行はauth専用サイト）
4. Widget Mode は **Managed**（推奨）を選択
5. 発行される **Site Key**（公開用）は authのVercel環境変数 `NEXT_PUBLIC_TURNSTILE_SITE_KEY`、**Secret Key**（秘匿）は Supabase Dashboard の CAPTCHA 設定に入力する（Sporiveの環境変数には設定しない）

## 7-3. Resend（カスタムSMTP）

Supabase既定のメール送信は1時間あたり数通に制限されており本番運用に不向きなため、Resendに切り替え（無料枠：3,000通/月・100通/日）。

1. https://resend.com/ でアカウントを作成
2. ドメイン認証（送信元ドメインをResendに追加し、DNSレコード（SPF/DKIM）を設定）
3. **API Keys** から送信用のAPIキーを発行
4. Supabaseダッシュボード → **Project Settings** → **Authentication** → **SMTP Settings** で以下を設定
   - Host: `smtp.resend.com`
   - Port: `465`(SSL) または `587`(STARTTLS)
   - Username: `resend`
   - Password: 発行したAPIキー
   - Sender email / Sender name: 送信に使うメールアドレス・表示名
5. 設定後、パスワード再設定等のメールが正しく届くか実際に試す

## 7-4. 補足

- 上記7-1〜7-3はいずれもSupabase Dashboard・外部サービスの画面操作のみで完結し、Sporiveのコード変更を伴わない
- 環境変数などの機密情報はチャットに直接貼らず、Vercel/Supabaseの管理画面上で設定する
