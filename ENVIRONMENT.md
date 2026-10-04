# Environment（Sporive）

`.env.local.example`を`.env.local`にコピーして値を設定する。Vercelでは **Settings → Environment Variables** にProduction/Preview/Development全てへ設定する（設定後はRedeployが必要）。

`GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET`はNext.jsの環境変数としては使用しない（コード側で参照していない）。Supabase Dashboardの「Authentication → Providers → Google」に直接入力する（下記「Supabase Dashboard側の設定」参照）。

| 変数 | 用途 | 必須 |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabaseクライアント（`saka2931-service`プロジェクト） | ○ |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | 同上 | ○ |
| `SUPABASE_SERVICE_ROLE_KEY` | サーバー側処理（通知送信・管理画面集計・CSVエクスポート）。RLSを無視する強い権限のため取り扱い注意 | ○ |
| `GEMINI_API_KEY` | Google Gemini API | ○ |
| `GEMINI_MODEL` | 使用モデル名。コード側にデフォルト値なし、未設定時はエラー（現在値: `gemini-3.5-flash-lite`） | ○ |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | Web Push（`npx web-push generate-vapid-keys`で生成） | ○ |
| `VAPID_PRIVATE_KEY` | 同上 | ○ |
| `CRON_SECRET` | Supabase pg_cron → `/api/notifications/dispatch`の認証。Supabase Vaultにも`cron_secret`として同じ値を保存する | ○ |
| `NEXT_PUBLIC_GTM_CONTAINER_ID` | Google Tag Manager コンテナID | 任意 |
| `NEXT_PUBLIC_INFRA_SUPABASE_URL` | `saka2931-infra`（adac/statusと共有）読み取り専用クライアント用URL | ○ |
| `NEXT_PUBLIC_INFRA_SUPABASE_ANON_KEY` | 同上のanonキー。お知らせ・機能フラグのSELECTのみ許可 | ○ |

## 関連する外部サービスプロジェクト

| サービス | プロジェクト/ID | 用途 |
|---|---|---|
| Supabase | `saka2931-service`（`sporive`スキーマ、legal-lifeと共有） | Auth・アプリ本体データ |
| Supabase | `saka2931-infra`（adac/statusと共有） | 機能フラグ・お知らせ（読み取り専用） |
| Vercel | Sporiveプロジェクト | ホスティング（`sporive.saka2931.jp`） |
| Google Cloud | OAuth同意画面「saka2931 service」 | Google OAuthログイン |
| Google Gemini API | Google AI Studio | AIトレーニング提案 |

## Supabase Dashboard側の設定（コードでは管理しない）

- Authentication → URL Configuration（Site URL / Redirect URLs）
- Authentication → Providers → Google（Client ID/Secretを直接入力、Next.js環境変数には設定しない）
- Authentication → Sessions（JWT有効期限・リフレッシュトークンローテーション）
- Authentication → SMTP Settings（Resendカスタムスキー、[Setup](Setup) §7-3参照）

詳細な取得手順は [Setup](Setup) を参照。
