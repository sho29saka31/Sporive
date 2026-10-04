# Development Plan: Overview（Sporive）

[Development Plan](Development-Plan) の一部。全体方針・技術スタック詳細(§1, §2)。

## 1. 全体方針

- **7月デモ版**（〜2026年7月末）：Phase 0〜6
- **8月試験運用**（2026年8月〜）：Phase 7〜9
- **追加計画フェーズ**（2026-08-24策定）：Phase 10〜12。試験運用中に判明した通知・管理機能・セキュリティ面の拡張要望に対応する
- 各フェーズは「動く状態で完結」させ、フェーズ末ごとにVercelへデプロイして確認する
- 外部サービス（Supabase / Gemini / Google Cloud / Vercel）のセットアップはユーザー（Shoki）側の作業が必要な箇所があるため、各フェーズの「ユーザー作業」欄に明記する

### スコープ優先順位（デモ版がタイトになった場合の削り順、策定時点）

1. **Google カレンダー連携（Phase 6）** — OAuth スコープ・トークン管理が最も外部依存が大きい（2026-09-14に機能自体を全廃。[ADR](ADR) ADR-004参照）
2. **Web Push 通知（Phase 5）** — 通知トリガー（pg_cron）は仕組みが独立しており後付けしやすい
3. AI提案（Phase 3）・進捗記録（Phase 4）はデモの核なので削らない

## 2. 技術スタック詳細

| 領域 | 採用 | 備考 |
|---|---|---|
| フレームワーク | Next.js 16（App Router）+ TypeScript | API Routes（Route Handlers）でサーバー処理を一元化。Phase 0 実装時点の最新安定版 16.2 を採用 |
| スタイリング | Tailwind CSS v4 | ネイビー基調のデザイントークンを `globals.css` の `@theme` で定義 |
| PWA | Web App Manifest + 自前 Service Worker | Web Push に自前SWが必須のため、next-pwa 等のプラグインは使わず手書きで管理 |
| DB / 認証 | Supabase（`@supabase/supabase-js` + `@supabase/ssr`） | RLS（Row Level Security）を全テーブルで有効化 |
| AI | Gemini API（`@google/genai`） | JSON構造化出力（responseSchema）で週間プランを生成。使用モデルは`GEMINI_MODEL`環境変数で指定（コード側にデフォルト値は持たず、未設定時はエラー） |
| Web Push | `web-push` npm パッケージ（VAPID） | 購読情報は Supabase に保存 |
| 通知トリガー | Supabase pg_cron + pg_net（10分間隔） | `CRON_SECRET`（Supabase Vault保存）付きで Vercel の API を叩く。GitHub Actions scheduled workflowから2026-08-24に移行（無料枠での遅延が大きかったため） |
| グラフ（進捗・管理画面） | Recharts | 軽量・無料 |
| メール送信 | Resend（カスタムSMTP） | Supabase既定のメール送信（1時間あたり数通に制限）を置き換える。無料枠：3,000通/月・100通/日 |
| CAPTCHA | Cloudflare Turnstile | hCaptchaより無料枠の制約がないため採用。Supabase Auth の Attack Protection 設定で有効化 |
| MFA | Supabase Auth TOTP | 認証アプリ方式のみ。電話番号方式（Advanced MFA Phone）は有料（$75/月〜）のため不採用 |

環境変数の一覧は [Environment](ENVIRONMENT) を参照。
