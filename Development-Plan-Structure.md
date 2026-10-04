# Development Plan: Structure（Sporive）

[Development Plan](Development-Plan) の一部。ディレクトリ構成・データベース設計の初期案(§3, §4)。現在の構成は [Architecture](ARCHITECTURE) を参照（本ページは策定時点の計画記録）。

## 3. ディレクトリ構成（目標形、策定時点）

```
sporive/
├── docs/                        # 要件定義書・開発プラン（現在はWikiへ移行）
├── supabase/migrations/
│   └── 0009_notify_pg_cron.sql  # pg_cron+pg_netによる10分おきの通知トリガー（Phase 5、2026-08-24移行）
├── public/
│   ├── manifest.webmanifest     # PWAマニフェスト
│   ├── sw.js                    # Service Worker（push受信・通知表示）
│   └── icons/                   # PWAアイコン
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
│   │   │   └── notifications/   # push購読登録・cron受け口
│   │   └── device-guard.tsx     # デバイス判定（スマホ以外は誘導画面）
│   ├── components/              # 共通UI（Header, FooterTabs, ...）
│   ├── lib/
│   │   ├── supabase/            # client / server / middleware ヘルパー
│   │   ├── gemini.ts
│   │   └── push.ts
│   └── types/
└── middleware.ts                # 認証ガード
```

## 4. データベース設計（初期案）

Phase 2 でマイグレーションとして確定した設計案。全テーブル RLS 有効・本人の行のみ読み書き可。

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

ai_proposal_logs      -- AI提案の分析用ログ（管理画面 Phase 9 で利用）
  id, user_id, goal, proposal_json, accepted (bool), created_at
```

> `calendar_tokens`テーブルはPhase 6で追加されたが、2026-09-14のGoogleカレンダー連携全廃に伴い削除済み（[ADR](ADR) ADR-004参照）。

### 4-1. 追加予定テーブル・カラム（Phase 10〜、策定時点の計画）

```
-- notification_settings に追加
  daily_reminder_time (time, default '08:00')
  debt_reminder_time (time, default '20:00')
  reengagement_enabled (bool, default true)
  weekly_report_enabled (bool, default false)
  weekly_report_time (time, default '09:00')
  quiet_hours_start / quiet_hours_end (time, nullable)
  quiet_days (smallint[], 空配列=無効)

profiles に追加
  is_super_admin (bool, default false)

feature_flags          -- 高度な設定「機能」タブ（現在はsaka2931-infraに統合）
  key (text, PK), enabled (bool), updated_by, updated_at

site_announcements     -- 高度な設定「お知らせ」タブ（現在はsaka2931-infraのservice_announcementsに統合）
  id, title, body, level (enum: info/notice/warning),
  affected_pages (text[], info/notice用), blocked_pages (text[], warning用),
  is_active (bool), created_by, created_at

announcement_reads     -- お知らせの既読管理
  user_id, announcement_id, read_at (PK: user_id + announcement_id)
```

実際に確定した現在のスキーマはリポジトリの `supabase/migrations/` を参照。
