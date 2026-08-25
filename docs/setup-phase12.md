# Phase 12 セットアップ手順（ユーザー作業）

Phase 12（認証セキュリティ強化、要件定義書 §4-1）のうち、Claudeのコード変更では対応できない項目の手順です。MFA（多要素認証）はアプリ側に実装済みのため対象外です。

## 1. Supabase Dashboard設定（コード変更不要）

Supabaseダッシュボード → 対象プロジェクト → **Authentication** から設定します。

### 1-1. JWT（アクセストークン）有効期限の短縮

1. **Authentication** → **Sessions**（または **Settings** 内の JWT expiry 設定）を開く
2. **JWT expiry limit** を `3600`（既定・1時間）から `1800`（30分）に変更して保存

### 1-2. リフレッシュトークンローテーション

1. **Authentication** → **Sessions** の **Refresh token rotation** を有効化（既定で有効な場合もあります。無効なら有効にしてください）
2. 併せて **Reuse interval**（使用済みリフレッシュトークンの再利用検知の猶予秒数）が極端に長くなっていないか確認してください（既定値のままで問題ありません）

### 1-3. Auth Rate Limits（ブルートフォース対策）

1. **Authentication** → **Rate Limits** を開く
2. **Sign in / Sign up** 系のレート制限が有効になっていることを確認し、必要に応じて既定値より厳しく調整してください（利用者数が少ないうちは既定値のままでも問題ありません）

### 1-4. メールテンプレートの日本語化

1. **Authentication** → **Email Templates** を開く
2. 以下のテンプレートを日本語文面に差し替えます（件名・本文とも）
   - **Confirm signup**（使用していなければ後回しで可。SporiveはGoogle OAuth登録のため通常は不使用）
   - **Reset Password**（パスワード再設定メール。実際に利用しています）
   - **Change Email Address**（メールアドレス変更確認。実際に利用しています）
3. 文面の日本語訳はClaudeに依頼していただければ用意します（このドキュメントには含めていません。ダッシュボードでの貼り付け作業自体はユーザー側での実施が必要です）

## 2. Cloudflare Turnstile（CAPTCHA）

無料枠の制約がないためhCaptchaより優先して採用します。

1. https://dash.cloudflare.com/ でCloudflareアカウントを作成（未作成の場合）
2. 左メニュー **Turnstile** → **Add site**
3. サイト名（例：Sporive）、ドメインに `sporive.vercel.app` を追加
4. Widget Mode は **Managed**（推奨）を選択
5. 発行される **Site Key**（公開用）と **Secret Key**（秘匿）を控える
6. Claudeにこの2つの値をお伝えください。Vercelの環境変数（`NEXT_PUBLIC_TURNSTILE_SITE_KEY` / `TURNSTILE_SECRET_KEY`）に設定した上で、ログイン・サインアップ画面への組み込みを行います

## 3. Resend（カスタムSMTP）

Supabase既定のメール送信は1時間あたり数通に制限されており本番運用に不向きなため、Resendに切り替えます（無料枠：3,000通/月・100通/日）。

1. https://resend.com/ でアカウントを作成
2. ドメイン認証（Sporiveで使うメール送信元ドメインをResendに追加し、DNSレコード（SPF/DKIM）を設定）。独自ドメインがない場合はResendの提供するテスト用ドメインで一旦運用開始も可能です
3. **API Keys** から送信用のAPIキーを発行
4. Supabaseダッシュボード → **Project Settings** → **Authentication** → **SMTP Settings** で以下を設定
   - Host: `smtp.resend.com`
   - Port: `465`（SSL）または `587`（STARTTLS）
   - Username: `resend`
   - Password: 発行したAPIキー
   - Sender email / Sender name: Sporiveからの送信に使うメールアドレス・表示名
5. 設定後、パスワード再設定等のメールが正しく届くか実際に試してください

## 補足

- 上記1〜3はいずれもSupabase Dashboard・外部サービスの画面操作のみで完結し、Sporiveのコード変更を伴いません
- Turnstile・Resendは「アカウント登録・キー発行」までがユーザー作業、「アプリへの組み込み」はキーをお預かりした後にClaudeが実施します
- 環境変数などの機密情報はチャットに直接貼らず、Vercel/Supabaseの管理画面上で設定してください（Claudeが必要とする場合は、値そのものではなく「設定済みです」とお伝えいただければ動作確認できます）
