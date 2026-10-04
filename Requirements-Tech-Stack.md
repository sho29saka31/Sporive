# Requirements: Tech Stack（Sporive）

[Requirements](Requirements) の一部。技術構成(要件定義書 §3)。現在の実装状況は [Architecture](ARCHITECTURE) も参照。

| 項目 | 選定技術 | 補足 |
|---|---|---|
| フロントエンド | Next.js（PWA対応） | フロントとサーバー処理（API Routes）を一元化 |
| ホスティング | Vercel（無料プラン） | 軽量構成を目指す |
| AI | Google Gemini API（Google AI Studio） | 無料枠内で運用。トレーニング計画の提案に使用。使用モデル：`gemini-3.5-flash-lite`（環境変数で変更可能） |
| データベース/認証 | Supabase（PostgreSQL + Supabase Auth） | 進捗データ・負債管理・アカウント情報を保存 |
| 通知 | Web Push（VAPID、Firebase不使用の素のPush API） | 購読情報はSupabaseに保存 |
| グラフ | Recharts | 進捗ログ・管理者ダッシュボードのグラフ表示 |
| 通知送信トリガー | Supabase pg_cron + pg_net（10分おき） | Vercel Cron Jobsは無料プランで実行頻度に制限があり、利用者ごとの個別通知時間指定に対応できないため不採用。GitHub Actions scheduled workflowを採用していたが、無料枠では混雑時に実測で数十分規模の遅延が発生したため、Supabase内部のPostgresから直接VercelのAPIエンドポイントを呼び出すpg_cron+pg_net方式に移行（[CHANGELOG](CHANGELOG) 2026-08-24を参照） |
| ドメイン | `sporive.saka2931.jp` | saka2931.jpドメイン配下 |
| アクセス解析 | Google Tag Manager（GTM）経由でGoogle Analytics（GA4）を計測 | 無料枠内で運用（詳細は [Requirements SEO Analytics](Requirements-SEO-Analytics)） |
| サイト検証 | Google Search Console（HTMLタグ方式で所有権確認） | 詳細は [Requirements SEO Analytics](Requirements-SEO-Analytics) |

**注記（当初検討したが採用しなかった選択肢）**
- Appleログイン／Appleカレンダー連携：Apple Developer Program（年額$99）が必要なため非採用。将来的にコストを受け入れる場合は再検討可能
- Firebase：AI・通知含め当初検討したが、DBにSupabaseを選定したためベンダー統一の観点で通知もFirebase不使用の素のWeb Push APIに変更
- Googleカレンダー連携：2026-09-14に全廃。詳細は [ADR](ADR) の ADR-004 を参照
