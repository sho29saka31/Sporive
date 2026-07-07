# Phase 1 セットアップ手順（ユーザー作業）

Phase 1（認証）を動かすために、Supabase と Google Cloud のセットアップが必要です。
コード側の実装は完了しているため、以下の設定を行えば動作します。

## 1. Supabase プロジェクトの作成

1. https://supabase.com でプロジェクトを作成（Region は Tokyo 推奨）
2. `Project Settings > API` から以下を控える
   - Project URL → `.env.local` の `NEXT_PUBLIC_SUPABASE_URL`
   - anon public key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - service_role key → `SUPABASE_SERVICE_ROLE_KEY`（Phase 5 以降で使用。取得だけ済ませておく）
3. `SQL Editor` を開き、`supabase/migrations/0001_profiles_and_calendar_tokens.sql` の中身をそのまま貼り付けて実行する
4. `Authentication > Sign In / Providers > Email` で以下を確認
   - **「Allow new users to sign up」**：ON
   - **メールアドレスの自動リンク**：同一メールアドレスでの Google / Email 併用ログインを行うため、Authentication 設定内の **アカウントリンク（Account Linking）が有効**になっていることを確認してください（Supabase のプランにより表示場所が異なります。見当たらない場合は Supabase サポート/ドキュメントの "Identity Linking" を参照）

## 2. Google Cloud Console の設定

1. Google Cloud Console でプロジェクトを作成（または既存を利用）
2. `API とサービス > 有効な API` で **Google Calendar API** を有効化
3. `API とサービス > OAuth 同意画面` を設定
   - User Type：外部（External）
   - 公開ステータス：**テスト中（Testing）のままでOK**（デモ版はテストユーザーのみで運用するため、Google審査は不要）
   - スコープに `.../auth/calendar` を追加
   - テストユーザーに自分（と試験運用の協力者）のGoogleアカウントを追加
4. `API とサービス > 認証情報` で OAuth クライアントID（ウェブアプリケーション）を作成
   - 承認済みのリダイレクトURI に、Supabase の callback URL を追加：
     `https://<プロジェクトID>.supabase.co/auth/v1/callback`
   - 発行された **クライアントID** と **クライアントシークレット** を控える

## 3. Supabase に Google プロバイダを設定

1. Supabase の `Authentication > Providers > Google` を開く
2. 有効化し、手順2で発行した クライアントID / クライアントシークレット を入力して保存
   （このクライアントID/シークレットは Next.js の環境変数には設定しません。Supabase側の設定のみで完結します）

## 4. アプリ側の環境変数

`.env.local.example` を `.env.local` にコピーし、Supabase の値を設定してください。

```bash
cp .env.local.example .env.local
```

Vercel にデプロイする場合は、Vercel プロジェクトの Environment Variables にも同じ値を設定してください。
また、Vercel のドメイン（`https://xxx.vercel.app`）を Supabase の
`Authentication > URL Configuration > Redirect URLs` に追加してください
（例：`https://xxx.vercel.app/auth/callback`）。

## 5. 動作確認の流れ

1. `/signup` にアクセスし「Googleで始める」→ Google の同意画面（カレンダーへのアクセス許可を含む）→ 自動的に `/signup/set-password` へ
2. パスワードを設定 → `/onboarding/profile` で表示名・生年・目標を登録 → `/home` へ
3. 一度ログアウトし、`/login` から「Googleでログイン」または、設定したメール＋パスワードでログインできることを確認

## 補足

- カレンダーの `auth/calendar` スコープは Google 上「制限付きスコープ」ですが、OAuth同意画面が **テスト中** のままであれば、テストユーザー登録された100アカウントまでは審査なしで利用できます。試験運用で一般公開する場合は Google の審査（CASA）が必要になる可能性があるため、8月試験運用の規模によっては第13章の検討事項として要件定義書に追記します。
