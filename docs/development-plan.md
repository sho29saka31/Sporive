# Sporive 開発プラン

作成日：2026-07-07
対象：[要件定義書](requirements.md) に基づく開発フェーズ分割とタスク分解

> 要件定義書 第13章の未決事項（デモ版のタスク分解）に対する回答となるドキュメント。
> 実装は本プランのフェーズ順に進め、各フェーズを1つの作業単位（ブランチ／PR）として扱う。

---

## 1. 全体方針

- **7月デモ版**（〜2026年7月末）：Phase 0〜6
- **8月試験運用**（2026年8月〜）：Phase 7〜9
- 各フェーズは「動く状態で完結」させ、フェーズ末ごとにVercelへデプロイして確認する
- 外部サービス（Supabase / Gemini / Google Cloud / Vercel）のセットアップはユーザー（Shoki）側の作業が必要な箇所があるため、各フェーズの「ユーザー作業」欄に明記する

### スコープ優先順位（デモ版がタイトになった場合の削り順）

要件定義書 §12 の注記どおり、スケジュールが逼迫した場合は以下の順で後ろ倒しする：

1. **Google カレンダー連携（Phase 6）** — OAuth スコープ・トークン管理が最も外部依存が大きい。デモでは「連携ボタンはあるが Coming Soon」まで許容
2. **Web Push 通知（Phase 5）** — GitHub Actions トリガーは仕組みが独立しており後付けしやすい
3. AI提案（Phase 3）・進捗記録（Phase 4）はデモの核なので削らない

---

## 2. 技術スタック詳細

| 領域 | 採用 | 備考 |
|---|---|---|
| フレームワーク | Next.js 15（App Router）+ TypeScript | API Routes（Route Handlers）でサーバー処理を一元化 |
| スタイリング | Tailwind CSS v4 | ネイビー基調のデザイントークンを `globals.css` の `@theme` で定義 |
| PWA | Web App Manifest + 自前 Service Worker | Web Push に自前SWが必須のため、next-pwa 等のプラグインは使わず手書きで管理 |
| DB / 認証 | Supabase（`@supabase/supabase-js` + `@supabase/ssr`） | RLS（Row Level Security）を全テーブルで有効化 |
| AI | Gemini API（`@google/genai`、モデルは無料枠の flash 系） | JSON構造化出力（responseSchema）で週間プランを生成 |
| Web Push | `web-push` npm パッケージ（VAPID） | 購読情報は Supabase に保存 |
| 通知トリガー | GitHub Actions scheduled workflow（5分間隔） | `CRON_SECRET` 付きで Vercel の API を叩く |
| カレンダー | Google Calendar API（`googleapis`） | freebusy 取得＋イベント作成 |
| グラフ（進捗・管理画面） | Recharts | 軽量・無料 |

### 環境変数（Vercel / ローカル `.env.local`）

| 変数 | 用途 |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase クライアント |
| `SUPABASE_SERVICE_ROLE_KEY` | サーバー側処理（通知送信・管理画面集計） |
| `GEMINI_API_KEY` | Gemini API |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` | Web Push |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Google OAuth（Calendar スコープ） |
| `CRON_SECRET` | GitHub Actions → 通知APIの認証 |

---

## 3. ディレクトリ構成（目標形）

```
sporive/
├── docs/                        # 要件定義書・開発プラン
├── .github/workflows/
│   └── notify.yml               # 5分おきの通知トリガー（Phase 5）
├── public/
│   ├── manifest.webmanifest     # PWAマニフェスト
│   ├── sw.js                    # Service Worker（push受信・通知表示）
│   └── icons/                   # PWAアイコン
├── supabase/
│   └── migrations/              # SQLマイグレーション（スキーマ管理）
├── src/
│   ├── app/
│   │   ├── (auth)/              # ログイン・サインアップ・パスワード設定
│   │   ├── (user)/              # 利用者画面（スマホ専用・header/footer付き）
│   │   │   ├── home/            # ホーム：今日のトレーニング
│   │   │   ├── schedule/        # スケジュール：週間予定
│   │   │   ├── progress/        # 進捗：ログ・ストリーク
│   │   │   ├── menu/            # すべて：その他機能一覧
│   │   │   └── settings/        # 通知設定・アカウント設定
│   │   ├── admin/               # 管理者画面（PC/タブレット専用）
│   │   ├── api/                 # Route Handlers
│   │   │   ├── ai/              # Gemini 提案・改善案
│   │   │   ├── notifications/   # push購読登録・cron受け口
│   │   │   └── calendar/        # freebusy・イベント追加
│   │   └── device-guard.tsx     # デバイス判定（スマホ以外は誘導画面）
│   ├── components/              # 共通UI（Header, FooterTabs, ...）
│   ├── lib/
│   │   ├── supabase/            # client / server / middleware ヘルパー
│   │   ├── gemini.ts
│   │   ├── push.ts
│   │   └── calendar.ts
│   └── types/
└── middleware.ts                # 認証ガード
```

---

## 4. データベース設計（初期案）

Phase 2 でマイグレーションとして確定する。全テーブル RLS 有効・本人の行のみ読み書き可。

```
profiles              -- ユーザープロフィール（auth.users と 1:1）
  id (uuid, FK auth.users), display_name, birth_year, gender,
  goal (enum: lose_weight / gain_muscle / strength / senior_maintenance),
  is_admin (bool), created_at

training_plans        -- 週間トレーニング計画（AI提案 or 手動）
  id, user_id, week_start_date, status (draft/active/archived),
  source (ai/manual), created_at

plan_items            -- 計画内の各トレーニング項目
  id, plan_id, day_of_week, exercise_name, category,
  sets, reps, weight_kg, duration_min, sort_order

workout_logs          -- 実績ログ（進捗記録：セット数・重量・回数・時間）
  id, user_id, plan_item_id (nullable), performed_on,
  sets_done, reps_done, weight_kg, duration_min, note

push_subscriptions    -- Web Push 購読情報
  id, user_id, endpoint (unique), p256dh, auth, created_at

notification_settings -- 通知設定
  user_id (PK), daily_reminder_enabled, debt_reminder_enabled,
  notify_time (time), timezone

debts                 -- 負債（8月 Phase 7）
  id, user_id, plan_item_id, missed_on, sets_remaining,
  reps_remaining, resolved_at

streaks               -- 連続達成記録（8月 Phase 7）
  user_id (PK), current_streak, longest_streak, last_achieved_on

calendar_tokens       -- Google Calendar 用 refresh token（Phase 6）
  user_id (PK), refresh_token (暗号化), scope, updated_at

ai_proposal_logs      -- AI提案の分析用ログ（管理画面 Phase 9 で利用）
  id, user_id, goal, proposal_json, accepted (bool), created_at
```

---

## 5. フェーズ分割

### 🏗 Phase 0：プロジェクト基盤（デモ版）

Next.js プロジェクトの土台と、全画面共通の骨格を作る。

- Next.js 15 + TypeScript + Tailwind CSS v4 のセットアップ
- ネイビー基調のデザイントークン定義（アクセントカラーのパレットも仮決め）
- PWA マニフェスト・アイコン・Service Worker の雛形
- 固定 header（ベル・アカウントアイコン）＋固定 footer（4タブ：ホーム/スケジュール/進捗/すべて）のレイアウト
- デバイス判定：利用者画面はスマホ以外なら「スマホで開いてください」誘導画面
- 4タブそれぞれのプレースホルダーページ
- Vercel デプロイ設定・CI（lint / typecheck / build）

**ユーザー作業**：Vercel アカウントでリポジトリを Import（初回のみ）

### 🔐 Phase 1：認証（デモ版）

- Supabase Auth セットアップ（`@supabase/ssr` でセッション管理、middleware で認証ガード）
- Google OAuth サインアップ（Calendar スコープを同時要求、refresh token 保存準備）
- OAuth 後のパスワード設定画面（同一メールにパスワードログインを追加＝アイデンティティ連携）
- メール＋パスワードログイン
- 初回プロフィール入力（生年・目標など、AI提案の入力になる）
- アカウント設定画面（header アイコンから遷移）

**ユーザー作業**：Supabase プロジェクト作成、Google Cloud Console で OAuth クライアント作成・同意画面設定

### 🗄 Phase 2：DBスキーマ・データ層（デモ版）

- 上記 §4 のマイグレーション作成（`supabase/migrations/`）
- RLS ポリシー定義
- 型定義（Supabase 型生成）とデータアクセス層

**ユーザー作業**：Supabase へのマイグレーション適用（SQL Editor 貼り付け or CLI）

### 🤖 Phase 3：AIトレーニング計画提案（デモ版・コア）

- 目標・プロフィール・希望頻度を入力 → Gemini API で週間計画を JSON 生成
- シニア（年齢層）判定で低強度中心のプロンプトに切り替え
- 提案の確認・編集 UI（手動での計画作成もここで対応）
- 「登録」ボタン押下時に AI が改善案を提示 → 採用/無視を選択して確定
- 確定した計画を `training_plans` / `plan_items` に保存
- ホームタブ：今日の計画表示・実行画面

### 📊 Phase 4：進捗記録・スケジュール表示（デモ版・コア)

- トレーニング実行画面から実績を記録（セット数・重量・回数・時間）
- スケジュールタブ：週間予定の一覧・完了状態表示
- 進捗タブ：ログ一覧とグラフ（重量・回数の推移）、トレーニング頻度の表示

### 🔔 Phase 5：Web Push 通知（デモ版）

- Service Worker の push 受信・通知表示処理
- 購読登録 API（`push_subscriptions` に保存）と購読 UI
- 通知設定画面（当日予定通知 ON/OFF・時刻指定。負債リマインダーは Phase 7 で有効化）
- 送信 API `/api/notifications/dispatch`（`CRON_SECRET` 認証、その時刻に通知すべき利用者を判定して web-push 送信）
- GitHub Actions scheduled workflow（5分おきに dispatch を呼ぶ）

**ユーザー作業**：VAPID鍵の生成（コマンド提供）、GitHub リポジトリに `CRON_SECRET` 等のシークレット登録

### 📅 Phase 6：Google カレンダー連携（デモ版・最後）

- OAuth refresh token の保存（Phase 1 で取得済みの許可を利用）
- freebusy API で空き時間を取得し、AI提案のプロンプトに反映
- 計画確定時にトレーニング予定をカレンダーへ自動追加

**ユーザー作業**：Google Cloud Console で Calendar API 有効化

---

### ⬇️ ここから8月試験運用フェーズ

### 💰 Phase 7：負債管理・ストリーク

- 日次判定（通知dispatchと同じ cron 経路）で未達成分を `debts` に記録
- 補填ルール：未達成のセット数・回数をそのまま翌日の計画に加算表示
- リカバリー提案（AI）と負債一覧画面（「すべて」タブ配下）
- ストリーク計算・表示（進捗タブ）、負債リマインダー通知の有効化

### ✅ Phase 8：運動強度の妥当性検証

- ルールベースの閾値チェック（年齢層別上限・週あたり増加率上限）
- AI提案・手動計画の両方に適用し、判定理由を利用者に明示
- 閾値定義は設定ファイルで管理（将来のAIダブルチェック追加を見据えた構造）

### 📈 Phase 9：管理者画面

- `is_admin` によるアクセス制御、PC/タブレット専用レイアウト
- DAU/WAU・リテンション、達成率・負債発生率・負債解消率
- AI提案分析（人気メニューなど：`ai_proposal_logs` を集計）
- 発表用に推移グラフ中心のダッシュボード構成

---

## 6. スケジュール目安（7月デモ版）

| 週 | フェーズ |
|---|---|
| 7/7 週 | Phase 0 → Phase 1 |
| 7/13 週 | Phase 2 → Phase 3 |
| 7/20 週 | Phase 4 → Phase 5 |
| 7/27 週 | Phase 6・統合テスト・デモ準備（バッファ） |

---

## 7. 実装時の判断メモ

- 要件定義書 §8 に「Vercel Cron Jobs」の記載が残っていたが、§14 更新履歴（2026-07-05）のとおり **GitHub Actions scheduled workflow** が最新決定であり、本プランはそれに従う（docs/requirements.md 取り込み時に §8 を修正済み）
- タイムゾーンは Asia/Tokyo を既定とし、通知時刻判定は `notification_settings.timezone` で将来拡張可能にする
- Gemini のモデルは無料枠のレート制限を踏まえ flash 系を既定とし、モデル名は環境変数で差し替え可能にする
