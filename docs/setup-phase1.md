# Phase 1 セットアップ手順（ユーザー作業・最終版）

Phase 1（認証）を動かすために、Supabase と Google Cloud のセットアップが必要です。
コード側の実装は完了しているため、以下の設定を行えば動作します。
本ドキュメントは実際のセットアップ・動作確認で判明した内容を反映した最終版です。

## 1. Supabase プロジェクトの作成

1. https://supabase.com でプロジェクトを作成（Region は Tokyo 推奨）
   - プロジェクト作成時の詳細設定（データAPIを有効にする／新しいテーブルを自動的に公開する／自動RLSを有効にする）は**すべてデフォルト（ON）のまま**でよい
   - PostgreSQLタイプは **「PostgreSQL」（デフォルト）** を選択する（OrioleDBはアルファ版のため選ばない。作成後に変更不可）
2. プロジェクト作成後、左メニュー **Project Settings → API Keys** から以下を控える
   - **Project URL**：`Project Settings → General`、またはダッシュボードのURL（`https://supabase.com/dashboard/project/<プロジェクトID>/...`）の `<プロジェクトID>` から `https://<プロジェクトID>.supabase.co` の形式で特定できる
   - **anon public key**（新しいダッシュボードでは **publishable key**：`sb_publishable_...` という表記の場合もある）→ `.env.local` の `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role key**（新しいダッシュボードでは **secret key**：`sb_secret_...`）→ `SUPABASE_SERVICE_ROLE_KEY`（Phase 5以降で使用。**現時点では取得だけ済ませ、共有・チャットへの貼り付けはしない**。RLSを無視する強い権限のため慎重に扱う）
3. `SQL Editor` を開き、以下のマイグレーションを順に貼り付けて実行する
   - `supabase/migrations/0001_profiles_and_calendar_tokens.sql`
   - `supabase/migrations/0002_training_and_progress.sql`（Phase 2以降）
   - すでに実行済みのSQLを誤って再実行すると `type already exists` 等のエラーが出るが、これは無害（テーブルが既に存在する場合のエラーなので、`select * from <テーブル名>;` で中身を確認すれば実害がないことが分かる）
4. `Authentication → Sign In / Providers → Email` で以下を確認
   - **「Allow new users to sign up」**：ON
   - **Password Requirements（パスワード要件）**：デフォルトで「半角英大文字・小文字・数字・記号をそれぞれ1文字以上必須」になっている場合がある。アプリ側（`/signup/set-password`）のバリデーションもこの要件に合わせて実装済みのため、**変更不要**（変更する場合はアプリ側のバリデーションも合わせて修正が必要）
5. `Authentication → URL Configuration` を設定する（**重要・忘れると本番でログイン後にlocalhostへ飛ばされる不具合が起きる**）
   - **Site URL**：本番のVercelドメインを設定する。例：`https://sporive.vercel.app`
   - **Redirect URLs**（許可リスト。複数追加可）：
     ```
     https://sporive.vercel.app/auth/callback
     http://localhost:3000/auth/callback
     ```
     プレビュー環境（PRごとのVercel URL）でも試す場合は、そのURLも追加するか、`https://sporive-git-*-<チーム名>.vercel.app/**` のようなワイルドカードを追加する

## 2. Google Cloud Console の設定

1. Google Cloud Console でプロジェクトを作成（または既存を利用）
2. `API とサービス → 有効な API` で **Google Calendar API** を有効化
3. `API とサービス → OAuth 同意画面` を設定
   - User Type：外部（External）
   - 公開ステータス：**テスト中（Testing）のままでOK**（デモ版はテストユーザーのみで運用するため、Google審査は不要）
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
   - 発行された **クライアントID** と **クライアントシークレット** を控える（クライアントシークレットは機密情報のため、次の手順3でSupabaseのダッシュボードに直接入力し、チャット等では共有しない）

## 3. Supabase に Google プロバイダを設定

1. Supabase の `Authentication → Sign In / Providers → Google` を開く
2. 有効化し、手順2で発行した クライアントID / クライアントシークレット を**直接入力**して保存
   （このクライアントID/シークレットは Next.js の環境変数には設定しない。Supabase側の設定のみで完結する）

## 4. アプリ側の環境変数

`.env.local.example` を `.env.local` にコピーし、Supabase の値を設定する。

```bash
cp .env.local.example .env.local
```

Vercel にデプロイする場合は、Vercel プロジェクトの `Settings → Environment Variables` にも `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` を設定する（Production / Preview / Development すべてにチェック）。保存後は **Redeploy** が必要。

`SUPABASE_SERVICE_ROLE_KEY` はPhase 5以降で必要になった時点で追加する（現時点では未設定でよい）。

## 5. 動作確認の流れ

1. `/signup` にアクセスし「Googleで始める」→ Google の同意画面（カレンダーへのアクセス許可を含む）→ 自動的に `/signup/set-password` へ
2. パスワードを設定（8文字以上、英大文字・小文字・数字・記号をそれぞれ1文字以上含む）→ `/onboarding/profile` で表示名・生年・目標を登録 → `/home` へ
3. 一度ログアウトし、`/login` から「Googleでログイン」または、設定したメール＋パスワードでログインできることを確認

## トラブルシューティング

- **Supabaseのダッシュボード自体が開けない／ログイン状態がおかしい**：ブラウザのCookieだけでなくlocalStorageにセッション情報が残っていることが多い。ブラウザの「サイトデータを削除（Clear site data）」で一括削除するか、シークレット/プライベートウィンドウで開く
- **Google同意後にlocalhostへ飛ばされて進めない**：上記「1-5. URL Configuration」のSite URL / Redirect URLsが未設定・誤りの可能性が高い
- **`weak_password` エラー**：Supabaseの Password Requirements とアプリ側のバリデーションが一致していない可能性がある（現在は一致させてある）
- **パスワード設定済みのはずが毎回パスワード設定画面に戻される**：既知の不具合として修正済み（`user_metadata` ベースの判定に変更済み。PR #6で対応）

## 補足

- カレンダーの `auth/calendar` スコープは Google 上「制限付きスコープ」だが、OAuth同意画面が **テスト中** のままであれば、テストユーザー登録された100アカウントまでは審査なしで利用できる。試験運用で一般公開する場合はGoogleの審査（CASA）が必要になる可能性があるため、8月試験運用の規模によっては要件定義書 第13章の検討事項として追記する
