# Sporive 開発プラン

作成日：2026-07-07
対象：[要件定義書](requirements.md) に基づく開発フェーズ分割とタスク分解

> 要件定義書 第14章の未決事項（デモ版のタスク分解）に対する回答となるドキュメント。
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
2. **Web Push 通知（Phase 5）** — 通知トリガー（pg_cron）は仕組みが独立しており後付けしやすい
3. AI提案（Phase 3）・進捗記録（Phase 4）はデモの核なので削らない

---

## 2. 技術スタック詳細

| 領域 | 採用 | 備考 |
|---|---|---|
| フレームワーク | Next.js 16（App Router）+ TypeScript | API Routes（Route Handlers）でサーバー処理を一元化。Phase 0 実装時点の最新安定版 16.2 を採用 |
| スタイリング | Tailwind CSS v4 | ネイビー基調のデザイントークンを `globals.css` の `@theme` で定義 |
| PWA | Web App Manifest + 自前 Service Worker | Web Push に自前SWが必須のため、next-pwa 等のプラグインは使わず手書きで管理 |
| DB / 認証 | Supabase（`@supabase/supabase-js` + `@supabase/ssr`） | RLS（Row Level Security）を全テーブルで有効化 |
| AI | Gemini API（`@google/genai`） | JSON構造化出力（responseSchema）で週間プランを生成。使用モデルは`GEMINI_MODEL`環境変数で指定（コード側にデフォルト値は持たず、未設定時はエラー）。現在の設定値：`gemini-3.5-flash-lite` |
| Web Push | `web-push` npm パッケージ（VAPID） | 購読情報は Supabase に保存 |
| 通知トリガー | Supabase pg_cron + pg_net（10分間隔） | `CRON_SECRET`（Supabase Vault保存）付きで Vercel の API を叩く。GitHub Actions scheduled workflowから2026-08-24に移行（無料枠での遅延が大きかったため） |
| カレンダー | Google Calendar API（`googleapis`） | freebusy 取得＋イベント作成 |
| グラフ（進捗・管理画面） | Recharts | 軽量・無料 |
| メール送信（計画） | Resend（カスタムSMTP） | Supabase既定のメール送信（1時間あたり数通に制限）を置き換える。無料枠：3,000通/月・100通/日 |
| CAPTCHA（計画） | Cloudflare Turnstile | hCaptchaより無料枠の制約がないため採用。Supabase Auth の Attack Protection 設定で有効化 |
| MFA（計画） | Supabase Auth TOTP | 認証アプリ方式のみ。電話番号方式（Advanced MFA Phone）は有料（$75/月〜）のため不採用 |

### 環境変数（Vercel / ローカル `.env.local`）

| 変数 | 用途 |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase クライアント |
| `SUPABASE_SERVICE_ROLE_KEY` | サーバー側処理（通知送信・管理画面集計） |
| `GEMINI_API_KEY` | Gemini API |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` | Web Push |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Google OAuth（Calendar スコープ） |
| `CRON_SECRET` | Supabase pg_cron → 通知APIの認証（Supabase Vaultに`cron_secret`として保存） |
| `RESEND_API_KEY`（計画） | Resend経由のメール送信（Supabase Auth SMTP設定） |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` / `TURNSTILE_SECRET_KEY`（計画） | Cloudflare Turnstile（CAPTCHA） |

---

## 3. ディレクトリ構成（目標形）

```
sporive/
├── docs/                        # 要件定義書・開発プラン
├── supabase/migrations/
│   └── 0009_notify_pg_cron.sql  # pg_cron+pg_netによる10分おきの通知トリガー（Phase 5、2026-08-24移行）
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

### 4-1. 追加予定テーブル・カラム（計画、Phase 10〜）

```
-- notification_settings に追加
  daily_reminder_time (time, default '08:00')
  debt_reminder_time (time, default '20:00')
  reengagement_enabled (bool, default true)
  weekly_report_enabled (bool, default false)
  weekly_report_time (time, default '09:00')
  quiet_hours_start / quiet_hours_end (time, nullable)
  quiet_days (smallint[], 空配列=無効)
  -- notify_time（共通1時刻）は種別ごとの時刻に置き換えるため廃止
  -- 週次レポートの曜日は日曜固定（カラム化しない）
  -- 再エンゲージメントは17:00固定（時刻カラム化しない、システム定数）

profiles に追加
  is_super_admin (bool, default false)

feature_flags          -- 高度な設定「機能」タブ
  key (text, PK), enabled (bool), updated_by, updated_at

site_announcements     -- 高度な設定「お知らせ」タブ
  id, title, body, level (enum: info/notice/warning),
  affected_pages (text[], info/notice用), blocked_pages (text[], warning用),
  is_active (bool), created_by, created_at

announcement_reads     -- お知らせの既読管理
  user_id, announcement_id, read_at (PK: user_id + announcement_id)
```

---

## 5. フェーズ分割

### 🏗 Phase 0：プロジェクト基盤（デモ版）✅完了

Next.js プロジェクトの土台と、全画面共通の骨格を作る。

- Next.js 16 + TypeScript + Tailwind CSS v4 のセットアップ
- ネイビー基調のデザイントークン定義（アクセントカラーのパレットも仮決め）
- PWA マニフェスト・アイコン・Service Worker の雛形
- 固定 header（ベル・アカウントアイコン）＋固定 footer（4タブ：ホーム/スケジュール/進捗/すべて）のレイアウト
- デバイス判定：利用者画面はスマホ以外なら「スマホで開いてください」誘導画面
- 4タブそれぞれのプレースホルダーページ
- Vercel デプロイ設定・CI（lint / typecheck / build）

**ユーザー作業**：Vercel アカウントでリポジトリを Import（初回のみ）

### 🔐 Phase 1：認証（デモ版）✅完了

- Supabase Auth セットアップ（`@supabase/ssr` でセッション管理、middleware で認証ガード）
- Google OAuth サインアップ（Calendar スコープを同時要求、refresh token 保存準備）
- OAuth 後のパスワード設定画面（同一メールにパスワードログインを追加＝アイデンティティ連携）
- メール＋パスワードログイン
- 初回プロフィール入力（生年・目標など、AI提案の入力になる）
- アカウント設定画面（header アイコンから遷移）

**ユーザー作業**：Supabase プロジェクト作成、Google Cloud Console で OAuth クライアント作成・同意画面設定

### 🗄 Phase 2：DBスキーマ・データ層（デモ版）✅完了

- 上記 §4 のマイグレーション作成（`supabase/migrations/`）
- RLS ポリシー定義
- 型定義（Supabase 型生成）とデータアクセス層

**ユーザー作業**：Supabase へのマイグレーション適用（SQL Editor 貼り付け or CLI）

### 🤖 Phase 3：AIトレーニング計画提案（デモ版・コア）✅完了

- 目標・プロフィール・希望頻度を入力 → Gemini API で週間計画を JSON 生成
- シニア（年齢層）判定で低強度中心のプロンプトに切り替え
- 提案の確認・編集 UI（手動での計画作成もここで対応）
- 「登録」ボタン押下時に AI が改善案を提示 → 採用/無視を選択して確定
- 確定した計画を `training_plans` / `plan_items` に保存
- ホームタブ：今日の計画表示・実行画面

### 📊 Phase 4：進捗記録・スケジュール表示（デモ版・コア）✅完了

- トレーニング実行画面から実績を記録（セット数・重量・回数・時間）
- スケジュールタブ：週間予定の一覧・完了状態表示
- 進捗タブ：ログ一覧とグラフ（重量・回数の推移）、トレーニング頻度の表示

### 🔔 Phase 5：Web Push 通知（デモ版）✅完了

- Service Worker の push 受信・通知表示処理
- 購読登録 API（`push_subscriptions` に保存）と購読 UI
- 通知設定画面（当日予定通知 ON/OFF・時刻指定。負債リマインダーは Phase 7 で有効化）
- 送信 API `/api/notifications/dispatch`（`CRON_SECRET` 認証、その時刻に通知すべき利用者を判定して web-push 送信）
- Supabase pg_cron + pg_net（10分おきに dispatch を呼ぶ。当初はGitHub Actions scheduled workflowだったが、無料枠での遅延が大きく2026-08-24に移行）

**ユーザー作業**：VAPID鍵の生成（コマンド提供）、Supabase VaultへCRON_SECRETの登録（`select vault.create_secret(...)`）

### 📅 Phase 6：Google カレンダー連携（デモ版・最後）✅完了

- OAuth refresh token の保存（Phase 1 で取得済みの許可を利用）
- freebusy API で空き時間を取得し、AI提案のプロンプトに反映
- 計画確定時にトレーニング予定をカレンダーへ自動追加

**ユーザー作業**：Google Cloud Console で Calendar API 有効化

---

### ⬇️ ここから8月試験運用フェーズ

### 💰 Phase 7：負債管理・ストリーク ✅完了

- 日次判定（通知dispatchと同じ cron 経路）で未達成分を `debts` に記録
- 補填ルール：未達成のセット数・回数をそのまま翌日の計画に加算表示
- リカバリー提案（AI）と負債一覧画面（「すべて」タブ配下）
- ストリーク計算・表示（進捗タブ）、負債リマインダー通知の有効化

### ✅ Phase 8：運動強度の妥当性検証 ✅完了

- ルールベースの閾値チェック（年齢層別上限・週あたり増加率上限）
- AI提案・手動計画の両方に適用し、判定理由を利用者に明示
- 閾値定義は設定ファイルで管理（将来のAIダブルチェック追加を見据えた構造）

### 📈 Phase 9：管理者画面 ✅完了

- `is_admin` によるアクセス制御、PC/タブレット専用レイアウト
- DAU/WAU・リテンション、達成率・負債発生率・負債解消率
- AI提案分析（人気メニューなど：`ai_proposal_logs` を集計）
- 発表用に推移グラフ中心のダッシュボード構成

---

### ⬇️ ここから追加計画フェーズ（2026-08-24策定、未着手）

### 🔔 Phase 10：通知機能の再構成・定期メンテナンスモード（計画）

要件定義書 §8-1〜8-4 に対応。

- `notification_settings` に §4-1 のカラムを追加するマイグレーション
- 通知種別ごとの時刻・ON/OFF可否UI（`NotificationSettingsForm.tsx`の作り直し。時刻入力は10分刻み）
- 非通知時間帯・非通知曜日の判定ロジックを `dispatch` に追加
- 再エンゲージメント通知（3日以上未記録の判定）・週次レポート（Gemini呼び出し、日曜固定）を `dispatch` に追加
- `notification_logs` の30日超過分・期限切れ`push_subscriptions`を削除する定期クリーンアップジョブ（pg_cron、SQLのみ、Vercel API非経由）
- 定期メンテナンスモード：`middleware.ts`にJST 1:00〜2:30（お知らせバー）・2:30〜3:30（トップページ以外アクセス不可・ログイン不可、`/admin`配下は対象外）の時間帯判定を追加
- `/settings/notifications` を「お知らせ」画面に改名し、通知履歴／お知らせタブの切替UIを追加

### 🔑 Phase 11：管理者権限の拡張・高度な設定（計画）

要件定義書 §10-2〜10-3、§4-1（カスタムアクセストークンフック関連）に対応。

- `profiles.is_super_admin` 追加、カスタムアクセストークンフック（Postgres関数のAuth Hook）でJWTに`is_admin`・`is_super_admin`を埋め込み
- `feature_flags`・`site_announcements`・`announcement_reads` テーブルの作成
- `/admin/settings`（仮称）に「高度な設定」ページを新設。`is_super_admin`のJWTクレームでガード
  - 機能タブ：AI機能（マスター＋個別4機能）・運動強度チェック・新規ユーザー登録・通知機能全体・Googleカレンダー連携・緊急メンテナンスモード・負債管理機能の各フラグと、各機能側でのフラグ参照実装
  - お知らせタブ：タイトル・本文・レベル（お知らせ/注意/警告）・影響範囲ページ／開けなくするページの入力フォーム。レベルごとに専用スタイルで表示するコンポーネント
- 利用者側：お知らせバー（該当ページで警告時にブロック）、お知らせ履歴タブでの一覧・既読管理

### 🔒 Phase 12：認証セキュリティ強化（計画）

要件定義書 §4-1 に対応。

- Supabase Dashboard設定：JWT有効期限30分、リフレッシュトークンローテーション、Auth Rate Limits、メールテンプレート日本語化（コード変更なし、手順書を作成しユーザーが実施）
- Cloudflare Turnstile導入（要外部アカウント登録）
- Resend導入・カスタムSMTP設定（要外部アカウント登録）
- MFA（TOTP）：アカウント設定画面に有効化UIを追加
- ログイン中の端末一覧・全ログアウト：Supabase側API調査結果次第で仕様確定・実装

**ユーザー作業**：Cloudflare Turnstile・Resendのアカウント登録とAPIキー取得、Supabase Dashboardでの各種Auth設定変更

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

- 通知トリガーは当初「GitHub Actions scheduled workflow」だったが、無料枠での遅延が大きく（実測で数十分規模）、§15 更新履歴（2026-08-24）のとおり **Supabase pg_cron + pg_net** に移行した。本プランはそれに従う
- タイムゾーンは Asia/Tokyo を既定とし、通知時刻判定は `notification_settings.timezone` で将来拡張可能にする
- Gemini のモデル名は`GEMINI_MODEL`環境変数で指定する。コード側にデフォルト値は持たせず、未設定時はエラーとする（特定モデルの混雑時に暗黙のフォールバックへ切り替わらないようにするため。2026-07-22時点の実運用モデルは `gemini-3.5-flash-lite`）
- シニア判定の年齢閾値は65歳とした（要件定義書に明記がないため実装時に決定。低強度中心のAIプロンプトへの切り替えに使用）
- Supabaseの`identities`はメール/パスワードをOAuth登録後に`updateUser`で後付けしても更新されないため、パスワード設定済みかどうかの判定は`user_metadata.password_set`フラグで行う（Phase 1実装時に判明した仕様）
- `/api/*` はmiddlewareのルートガード対象外とし、認証チェックは各Route Handler自身に委ねる（middlewareでリダイレクトすると、APIの`fetch`呼び出しがJSONではなくHTMLリダイレクト応答を受け取ってしまうため）
- pg_cronジョブ（Phase 5、`0009_notify_pg_cron.sql`）が10分おきにSupabase内部からdispatch APIを呼び出し、その都度実際にSELECTクエリが発行されるため、副次的にSupabase無料プランの自動一時停止（7日間アクティビティなしで発生）を防止できている。専用のスリープ防止機構ではなく通知機能の副産物だが、実質的に対策済みとみなせる（GitHub Actions時代からの継続効果）
- pg_net の `net.http_post` はデフォルトタイムアウトが2000msと短く、dispatch APIは対象利用者数分のDB問い合わせ・push送信を順に行うため超過しうる。`timeout_milliseconds := 15000` を明示指定して余裕を持たせている（無料プランでもpg_cron/pg_netの利用自体に制限はないが、pg_netは200 req/秒までを想定した設計であり、レスポンスは6時間で自動削除される点に留意）
