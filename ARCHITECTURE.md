# Architecture（Sporive）

## 概要

Sporiveは、AIがパーソナライズしたトレーニング計画を提案する、スマホ専用のフィットネスPWA。Next.js（フロント＋API一体）とSupabase（DB＋認証）を中心に、すべて無料プランの範囲内で構成している。

## システム構成図（論理）

```
[利用者ブラウザ(スマホ)]        [管理者ブラウザ(PC/タブレット)]
        │                              │
        ▼                              ▼
   Next.js (Vercel, App Router)  ──── 同一デプロイ
        │
        ├── Route Handlers (src/app/api/*)
        │     ├─ /api/ai/{propose-plan,improve-plan,recovery}  → Gemini API
        │     ├─ /api/notifications/*  → Web Push (VAPID)
        │     ├─ /api/plan/validate    → ルールベース検証
        │     └─ /api/admin/export     → 管理者向けCSVエクスポート
        │
        ├── Supabase Auth (@supabase/ssr)
        │     Cookieドメイン: .saka2931.jp (legal-lifeとSSO共有)
        │
        └── Supabase Postgres (saka2931-service プロジェクト, schema=sporive)
              ├─ profiles / training_plans / plan_items / workout_logs
              ├─ push_subscriptions / notification_settings / notification_logs
              ├─ debts / streaks / announcement_reads / ai_proposal_logs
              └─ pg_cron (10分間隔) → pg_net → /api/notifications/dispatch

外部連携（読み取り専用）:
   saka2931-infra プロジェクト (adac/statusと共有)
     ├─ feature_flags        (機能フラグ、adacの管理画面から書き込み)
     └─ service_announcements(お知らせ、adacの管理画面から書き込み)
```

## 主要な設計判断

- **フロントとAPIの一体化**：Next.js App RouterのRoute Handlersでサーバー処理を実装し、別バックエンドを持たない
- **グラフ描画にRecharts**：進捗ログ・管理者ダッシュボードのグラフはRechartsで実装
- **PWA**：Web Push受信のため`next-pwa`等のプラグインは使わず、Service Worker（`public/sw.js`）を手書きで管理。キャッシュ戦略は持たず（`fetch`イベントリスナーなし）、`install`時に無条件`skipWaiting()`・`activate`時に`clients.claim()`する「即時更新・キャッシュなし」方式（本番ビルド時のみ、`window.load`後に遅延登録）。`push`イベントは`payload.title`/`body`/`url`を受け取り`icon`/`badge`は`/icons/icon-192.png`固定で表示、`notificationclick`は既存クライアントがあれば`navigate()`+`focus()`、無ければ`openWindow()`
- **スキーマ分離によるマルチテナント**：`saka2931-service`プロジェクトを legal-life と共有し、`sporive`/`legal_life`スキーマで論理分離（RLS + スキーマ単位のGRANTで越境アクセスを防止）
- **共有インフラの読み取り専用参照**：機能フラグ・お知らせは`saka2931-infra`（adac/statusと共有）のanonキー読み取り専用クライアント（`lib/supabase/infra.ts`）経由で取得。書き込みはadacの管理画面のみに限定
- **通知トリガーはDB内部完結**：Supabase pg_cron + pg_netにより、外部のスケジューラ（GitHub Actions等）に依存せず、Postgres自身が10分おきにVercelのAPIを呼び出す。無料プランでの実行遅延問題を解消
- **フェイルオープンな機能フラグ**：`getFeatureFlags`は取得失敗時に「有効」を既定値とする（障害時に誤って機能停止しないため）。ただし緊急メンテナンスモードのみ「無効」を既定値とする（誤って全サイトを止めないため）

## 認証・SSOアーキテクチャ

- Supabase Auth（GoTrue）、Cookieドメインを`.saka2931.jp`に設定し、legal-lifeとログインセッションを共有
- `db.schema`オプション（PostgREST用）はセッションCookieの命名に影響しない。SSOはSupabaseプロジェクトURLが同一であることのみに依存
- MFA：TOTP（認証アプリ）のみ。カスタムアクセストークンフック（Postgres関数のAuth Hook）でJWTクレームに`is_admin`・`is_super_admin`を埋め込み、DB往復なしで管理者判定

## ディレクトリ構成

```
sporive/
├── supabase/migrations/     # SQLマイグレーション（スキーマ管理）
├── public/                  # PWAマニフェスト・アイコン・Service Worker
└── src/
    ├── app/
    │   ├── (auth)/          # ログイン・サインアップ・MFA・パスワード設定
    │   ├── (user)/          # 利用者画面（スマホ専用）
    │   ├── admin/           # 管理者画面（PC・タブレット専用）
    │   └── api/             # Route Handlers
    ├── components/
    └── lib/                 # Supabase / Gemini / Push 連携ロジック
```

詳細な機能仕様は [Requirements](Requirements) を、フェーズ別の実装経緯は [Development Plan](Development-Plan) を参照。
