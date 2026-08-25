# Sporive セットアップ手順（ユーザー作業）

Sporiveの開発・運用に必要な、外部サービス側の設定手順をまとめたドキュメントです。
コード側の実装が必要な項目はClaudeが対応するため、ここに記載しているのはダッシュボード操作など**ユーザー側の作業のみ**です。

- 「1〜6」は初期セットアップ（Phase 1・2）で、**設定済みです**。新しく環境を作り直す場合の手順として残しています
- 「7」はPhase 12（認証セキュリティ強化）で追加が必要な、**未完了の作業**です

## 1. Supabase プロジェクトの作成

1. https://supabase.com でプロジェクトを作成（Region は Tokyo 推奨）
   - プロジェクト作成時の詳細設定（データAPIを有効にする／新しいテーブルを自動的に公開する／自動RLSを有効にする）は**すべてデフォルト（ON）のまま**でよい
   - PostgreSQLタイプは **「PostgreSQL」（デフォルト）** を選択する（OrioleDBはアルファ版のため選ばない。作成後に変更不可）
2. プロジェクト作成後、左メニュー **Project Settings → API Keys** から以下を控える
   - **Project URL**：`Project Settings → General`、またはダッシュボードのURL（`https://supabase.com/dashboard/project/<プロジェクトID>/...`）の `<プロジェクトID>` から `https://<プロジェクトID>.supabase.co` の形式で特定できる
   - **anon public key**（新しいダッシュボードでは **publishable key**：`sb_publishable_...` という表記の場合もある）→ `.env.local` の `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role key**（新しいダッシュボードでは **secret key**：`sb_secret_...`）→ `SUPABASE_SERVICE_ROLE_KEY`（Phase 5以降で使用。**取得だけ済ませ、共有・チャットへの貼り付けはしない**。RLSを無視する強い権限のため慎重に扱う）

## 2. マイグレーションの適用

1. Supabaseダッシュボードの左メニュー **SQL Editor** を開く
2. `supabase/migrations/` 配下のSQLファイルを、**ファイル名の番号順**にすべて貼り付けて **Run** を実行する（現時点で `0001`〜`0019` まで存在し、すべて適用済み）
3. 以降、Claudeが新しいマイグレーションファイル（`00XX_....sql`）を追加した際は、その都度同じ手順で番号順に適用する
4. すでに実行済みのSQLを誤って再実行すると `type already exists` 等のエラーが出るが、これは無害（テーブルが既に存在する場合のエラーなので、`select * from <テーブル名>;` で中身を確認すれば実害がないことが分かる）
5. `Authentication → Sign In / Providers → Email` で以下を確認
   - **「Allow new users to sign up」**：ON
   - **Password Requirements（パスワード要件）**：デフォルトで「半角英大文字・小文字・数字・記号をそれぞれ1文字以上必須」になっている場合がある。アプリ側（`/signup/set-password`）のバリデーションもこの要件に合わせて実装済みのため、**変更不要**（変更する場合はアプリ側のバリデーションも合わせて修正が必要）
6. `Authentication → URL Configuration` を設定する（**重要・忘れると本番でログイン後にlocalhostへ飛ばされる不具合が起きる**）
   - **Site URL**：本番のVercelドメインを設定する。例：`https://sporive.vercel.app`
   - **Redirect URLs**（許可リスト。複数追加可）：
     ```
     https://sporive.vercel.app/auth/callback
     http://localhost:3000/auth/callback
     ```
     プレビュー環境（PRごとのVercel URL）でも試す場合は、そのURLも追加するか、`https://sporive-git-*-<チーム名>.vercel.app/**` のようなワイルドカードを追加する

## 3. Google Cloud Console の設定

1. Google Cloud Console でプロジェクトを作成（または既存を利用）
2. `API とサービス → 有効な API` で **Google Calendar API** を有効化
3. `API とサービス → OAuth 同意画面` を設定
   - User Type：外部（External）
   - 公開ステータス：**テスト中（Testing）のままでOK**（試験運用はテストユーザーのみで運用するため、Google審査は不要）
   - **アプリのホームページ**：`https://sporive.vercel.app`
   - **プライバシーポリシーへのリンク**：`https://sporive.vercel.app/privacy`
   - **利用規約へのリンク**：`https://sporive.vercel.app/terms`
   - **スコープ**（「データアクセス」→「スコープを追加または削除」）：
     - `.../auth/userinfo.email`
     - `.../auth/userinfo.profile`
     - `openid`
     - `https://www.googleapis.com/auth/calendar`（検索欄に「calendar」と入力して探す。フルアクセス版を選ぶ。制限付きスコープの扱いになるが、テスト中ステータスなら審査不要）
   - テストユーザーに自分（と試験運用の協力者）のGoogleアカウントを追加
4. `API とサービス → 認証情報` で OAuth クライアントID（ウェブアプリケーション）を作成
   - **承認済みのJavaScript生成元**：
     ```
     https://sporive.vercel.app
     http://localhost:3000
     ```
   - **承認済みのリダイレクトURI**（Supabaseのcallback URLのみでよい。アプリの `/auth/callback` は登録不要）：
     ```
     https://<Supabaseのプロジェクト参照ID>.supabase.co/auth/v1/callback
     ```
   - 発行された **クライアントID** と **クライアントシークレット** を控える（クライアントシークレットは機密情報のため、次の手順4でSupabaseのダッシュボードに直接入力し、チャット等では共有しない）

## 4. Supabase に Google プロバイダを設定

1. Supabase の `Authentication → Sign In / Providers → Google` を開く
2. 有効化し、手順3で発行した クライアントID / クライアントシークレット を**直接入力**して保存
   （このクライアントID/シークレットは Next.js の環境変数には設定しない。Supabase側の設定のみで完結する）

## 5. アプリ側の環境変数

`.env.local.example` を `.env.local` にコピーし、Supabase の値を設定する。

```bash
cp .env.local.example .env.local
```

Vercel にデプロイする場合は、Vercel プロジェクトの `Settings → Environment Variables` にも `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` を設定する（Production / Preview / Development すべてにチェック）。保存後は **Redeploy** が必要。

`SUPABASE_SERVICE_ROLE_KEY` 以降のサーバー用環境変数（`GEMINI_API_KEY` 等、詳細は [development-plan.md](development-plan.md) §2の環境変数表を参照）は、各機能の実装時にClaudeから案内があった時点で追加する。

## 6. 動作確認の流れ

1. `/signup` にアクセスし「Googleで始める」→ Google の同意画面（カレンダーへのアクセス許可を含む）→ 自動的に `/signup/set-password` へ
2. パスワードを設定（8文字以上、英大文字・小文字・数字・記号をそれぞれ1文字以上含む）→ `/onboarding/profile` で表示名・生年・目標を登録 → `/home` へ
3. 一度ログアウトし、`/login` から「Googleでログイン」または、設定したメール＋パスワードでログインできることを確認

### トラブルシューティング

- **Supabaseのダッシュボード自体が開けない／ログイン状態がおかしい**：ブラウザのCookieだけでなくlocalStorageにセッション情報が残っていることが多い。ブラウザの「サイトデータを削除（Clear site data）」で一括削除するか、シークレット/プライベートウィンドウで開く
- **Google同意後にlocalhostへ飛ばされて進めない**：上記「2-6. URL Configuration」のSite URL / Redirect URLsが未設定・誤りの可能性が高い
- **`weak_password` エラー**：Supabaseの Password Requirements とアプリ側のバリデーションが一致していない可能性がある（現在は一致させてある）

### 補足

- カレンダーの `auth/calendar` スコープは Google 上「制限付きスコープ」だが、OAuth同意画面が **テスト中** のままであれば、テストユーザー登録された100アカウントまでは審査なしで利用できる。一般公開する場合はGoogleの審査（CASA）が必要になる可能性があり、試験運用の規模によっては要件定義書 第14章「今後の検討事項」に追記する

---

## 7. Phase 12：認証セキュリティ強化の追加セットアップ（未完了）

Phase 12（認証セキュリティ強化、要件定義書 §4-1）のうち、Claudeのコード変更では対応できない項目の手順です。MFA（多要素認証）はアプリ側に実装済みのため対象外です。

### 7-1. Supabase Dashboard設定（コード変更不要）

Supabaseダッシュボード → 対象プロジェクト → **Authentication** から設定します。

**JWT（アクセストークン）有効期限の短縮**

1. **Authentication** → **Sessions**（または **Settings** 内の JWT expiry 設定）を開く
2. **JWT expiry limit** を `3600`（既定・1時間）から `1800`（30分）に変更して保存

**リフレッシュトークンローテーション**

1. **Authentication** → **Sessions** の **Refresh token rotation** を有効化（既定で有効な場合もあります。無効なら有効にしてください）
2. 併せて **Reuse interval**（使用済みリフレッシュトークンの再利用検知の猶予秒数）が極端に長くなっていないか確認してください（既定値のままで問題ありません）

**Auth Rate Limits（ブルートフォース対策）**

1. **Authentication** → **Rate Limits** を開く
2. **Sign in / Sign up** 系のレート制限が有効になっていることを確認し、必要に応じて既定値より厳しく調整してください（利用者数が少ないうちは既定値のままでも問題ありません）

**メールテンプレートの日本語化**

1. **Authentication** → **Email Templates** を開く
2. 以下のテンプレートを日本語文面に差し替えます（件名・本文とも）
   - **Confirm signup**（使用していなければ後回しで可。SporiveはGoogle OAuth登録のため通常は不使用）
   - **Reset Password**（パスワード再設定メール。実際に利用しています）
   - **Change Email Address**（メールアドレス変更確認。実際に利用しています）
3. 文面の日本語訳はClaudeに依頼していただければ用意します（このドキュメントには含めていません。ダッシュボードでの貼り付け作業自体はユーザー側での実施が必要です）

### 7-2. Cloudflare Turnstile（CAPTCHA）

無料枠の制約がないためhCaptchaより優先して採用します。

1. https://dash.cloudflare.com/ でCloudflareアカウントを作成（未作成の場合）
2. 左メニュー **Turnstile** → **Add site**
3. サイト名（例：Sporive）、ドメインに `sporive.vercel.app` を追加
4. Widget Mode は **Managed**（推奨）を選択
5. 発行される **Site Key**（公開用）と **Secret Key**（秘匿）を控える
6. Claudeにこの2つの値をお伝えください。Vercelの環境変数（`NEXT_PUBLIC_TURNSTILE_SITE_KEY` / `TURNSTILE_SECRET_KEY`）に設定した上で、ログイン・サインアップ画面への組み込みを行います

### 7-3. Resend（カスタムSMTP）

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

### 7-4. 補足

- 上記7-1〜7-3はいずれもSupabase Dashboard・外部サービスの画面操作のみで完結し、Sporiveのコード変更を伴いません
- Turnstile・Resendは「アカウント登録・キー発行」までがユーザー作業、「アプリへの組み込み」はキーをお預かりした後にClaudeが実施します
- 環境変数などの機密情報はチャットに直接貼らず、Vercel/Supabaseの管理画面上で設定してください（Claudeが必要とする場合は、値そのものではなく「設定済みです」とお伝えいただければ動作確認できます）
