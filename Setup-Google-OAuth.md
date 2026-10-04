# Setup: Google OAuth（Sporive）

[Setup](Setup) の一部。Google Cloud Console設定・Supabase連携(§3, §4)。**設定済み**（新規環境構築時の手順として記録）。

## 3. Google Cloud Console の設定

1. Google Cloud Console でプロジェクトを作成（または既存を利用）
2. `API とサービス → OAuth 同意画面` を設定
   - User Type：外部（External）
   - **アプリのホームページ**：`https://sporive.saka2931.jp`
   - **プライバシーポリシーへのリンク**：`https://service.saka2931.jp/privacy`
   - **利用規約へのリンク**：`https://service.saka2931.jp/terms`
   - **スコープ**（「データアクセス」→「スコープを追加または削除」）：
     - `.../auth/userinfo.email`
     - `.../auth/userinfo.profile`
     - `openid`
     - いずれもGoogleの分類上「非センシティブ」のため、公開ステータスをテスト中・本番のどちらにしてもGoogleの審査は不要（2026-09-14にGoogleカレンダー連携[`.../auth/calendar`]を全廃したことで実現。[ADR](ADR) ADR-004参照）
3. `API とサービス → 認証情報` で OAuth クライアントID（ウェブアプリケーション）を作成
   - **承認済みのJavaScript生成元**：
     ```
     https://sporive.saka2931.jp
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
