# Environment（Sporive）

`.env.local` を作成して値を設定する（サンプルファイル `.env.local.example` はGitHubに置かない方針）。Vercelでは **Settings → Environment Variables** にProduction/Preview/Development全てへ設定する（設定後はRedeployが必要）。

ログイン関連（Google OAuth・Turnstile・認証メール）の設定は **authリポジトリ側** で管理しており、Sporiveの環境変数には含まれない（`NEXT_PUBLIC_TURNSTILE_SITE_KEY`・Google関連の変数は削除済み）。

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
| Supabase | `saka2931-service`（`sporive`スキーマ、legal-life・authと共有） | Auth・アプリ本体データ |
| Supabase | `saka2931-infra`（adac/statusと共有） | 機能フラグ・お知らせ（読み取り専用） |
| Vercel | Sporiveプロジェクト | ホスティング（`sporive.saka2931.jp`） |
| Vercel | authプロジェクト（`auth.saka2931.jp`） | ログイン・アカウント管理（Sporiveから転送） |
| Google Gemini API | Google AI Studio | AIトレーニング提案 |

## Supabase Dashboard側の設定（コードでは管理しない）

Authentication系の設定（Site URL / Redirect URLs / Providers / CAPTCHA / MFA / SMTP / Email Templates）は **プロジェクト単位でauthアプリのために管理** している。Sporive単独で変更しないこと（変更手順は authリポジトリの `docs/Setup.md`）。Sporiveが依存するのは次の項目のみ。

- Authentication → Sessions（JWT有効期限・リフレッシュトークンローテーション）
- Project Settings → Data API → Exposed schemas に `sporive`
- Database → Vault（`cron_secret`）、Database → Cron Jobs（通知dispatch・クリーンアップ）

詳細な取得手順は [Setup](Setup.md) を参照。

## 補足

- `NEXT_PUBLIC_INFRA_SUPABASE_*` は緊急メンテナンスの判定にも使う（`feature_flags` の `emergency_maintenance`）
- `NODE_ENV` 以外にコードが参照する環境変数は上表のみ。新しい変数を追加したら本表とVercelの3環境の2か所を更新する
