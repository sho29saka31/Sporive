# Development Plan: Phases (Demo)（Sporive）

[Development Plan](Development-Plan.md) の一部。Phase 0〜6（7月デモ版）。

## 🏗 Phase 0：プロジェクト基盤（デモ版）✅完了

Next.js プロジェクトの土台と、全画面共通の骨格を作る。

- Next.js 16 + TypeScript + Tailwind CSS v4 のセットアップ
- ネイビー基調のデザイントークン定義（アクセントカラーのパレットも仮決め）
- PWA マニフェスト・アイコン・Service Worker の雛形
- 固定 header（ベル・アカウントアイコン）＋固定 footer（4タブ：ホーム/スケジュール/進捗/すべて）のレイアウト
- デバイス判定：利用者画面はスマホ以外なら「スマホで開いてください」誘導画面
- 4タブそれぞれのプレースホルダーページ
- Vercel デプロイ設定・CI（lint / typecheck / build）

**ユーザー作業**：Vercel アカウントでリポジトリを Import（初回のみ）

## 🔐 Phase 1：認証（デモ版）✅完了

- Supabase Auth セットアップ（`@supabase/ssr` でセッション管理、middleware で認証ガード）
- Google OAuth サインアップ
- OAuth 後のパスワード設定画面（同一メールにパスワードログインを追加＝アイデンティティ連携）
- メール＋パスワードログイン
- 初回プロフィール入力（生年・目標など、AI提案の入力になる）
- アカウント設定画面（header アイコンから遷移）

**ユーザー作業**：Supabase プロジェクト作成、Google Cloud Console で OAuth クライアント作成・同意画面設定

## 🗄 Phase 2：DBスキーマ・データ層（デモ版）✅完了

- [Development Plan Structure](Development-Plan-Structure.md) §4 のマイグレーション作成（`supabase/migrations/`）
- RLS ポリシー定義
- 型定義（Supabase 型生成）とデータアクセス層

**ユーザー作業**：Supabase へのマイグレーション適用（SQL Editor 貼り付け or CLI）

## 🤖 Phase 3：AIトレーニング計画提案（デモ版・コア）✅完了

- 目標・プロフィール・希望頻度を入力 → Gemini API で週間計画を JSON 生成
- シニア（年齢層）判定で低強度中心のプロンプトに切り替え
- 提案の確認・編集 UI（手動での計画作成もここで対応）
- 「登録」ボタン押下時に AI が改善案を提示 → 採用/無視を選択して確定
- 確定した計画を `training_plans` / `plan_items` に保存
- ホームタブ：今日の計画表示・実行画面

## 📊 Phase 4：進捗記録・スケジュール表示（デモ版・コア）✅完了

- トレーニング実行画面から実績を記録（セット数・重量・回数・時間）
- スケジュールタブ：週間予定の一覧・完了状態表示
- 進捗タブ：ログ一覧とグラフ（重量・回数の推移）、トレーニング頻度の表示

## 🔔 Phase 5：Web Push 通知（デモ版）✅完了

- Service Worker の push 受信・通知表示処理
- 購読登録 API（`push_subscriptions` に保存）と購読 UI
- 通知設定画面（当日予定通知 ON/OFF・時刻指定。負債リマインダーは Phase 7 で有効化）
- 送信 API `/api/notifications/dispatch`（`CRON_SECRET` 認証、その時刻に通知すべき利用者を判定して web-push 送信）
- Supabase pg_cron + pg_net（10分おきに dispatch を呼ぶ。当初はGitHub Actions scheduled workflowだったが、無料枠での遅延が大きく2026-08-24に移行）

**ユーザー作業**：VAPID鍵の生成（コマンド提供）、Supabase VaultへCRON_SECRETの登録（`select vault.create_secret(...)`）

## 📅 Phase 6：Google カレンダー連携（デモ版・最後）✅完了 → 🗑️ 2026-09-14廃止

- OAuth refresh token の保存（Phase 1 で取得済みの許可を利用）
- freebusy API で空き時間を取得し、AI提案のプロンプトに反映
- 計画確定時にトレーニング予定をカレンダーへ自動追加

**ユーザー作業**：Google Cloud Console で Calendar API 有効化

> **2026-09-14廃止**：未検証のOAuthアプリが制限付きスコープ（`.../auth/calendar`）を要求していたため、Google Advanced Protection Program加入ユーザーがGoogleサインイン自体をブロックされる実障害（エラー400: policy_enforced）が発生した。カレンダー連携機能を全廃し、週間予定の確認は既存のスケジュール画面（`/schedule`）でのアプリ内表示に一本化した。詳細は [ADR](ADR.md) ADR-004・[CHANGELOG](CHANGELOG.md) を参照。
