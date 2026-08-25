![Sporive](public/logo-horizontal.png)

# Sporive

**AIがパーソナライズしたトレーニング計画を提案する、スマホ専用のフィットネスPWA。**

若者からシニアまで幅広い層を対象に、Google Gemini APIによるAI提案・進捗記録・Web Push通知・Googleカレンダー連携・負債管理（未達成分のリカバリー）など、継続的なトレーニング習慣を支える機能を、Next.js（フロント＋API）と Supabase（DB＋認証）を中心とした構成で、**すべて無料プランの範囲内**で実現しています。

[![Next.js](https://img.shields.io/badge/Next.js-16-000000?logo=nextdotjs&logoColor=white)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![Supabase](https://img.shields.io/badge/Supabase-DB%20%2B%20Auth-3FCF8E?logo=supabase&logoColor=white)](https://supabase.com/)
[![Vercel](https://img.shields.io/badge/Deploy-Vercel-000000?logo=vercel&logoColor=white)](https://vercel.com/)

---

## 目次

- [概要](#概要)
- [主な機能](#主な機能)
- [技術スタック](#技術スタック)
- [ディレクトリ構成](#ディレクトリ構成)
- [ドキュメント](#ドキュメント)
- [開発](#開発)

## 概要

| 画面 | 対応デバイス | 備考 |
|---|---|---|
| 利用者画面 | スマホ専用 | それ以外のデバイスでは「スマホで開いてください」という誘導画面を表示 |
| 管理者画面 | PC・タブレット専用 | `is_admin` / `is_super_admin`（上位権限）でアクセス制御 |

デザインはネイビーを基調に、進捗表現やカテゴリー分けにカラフルなアクセントカラーを用いています。

## 主な機能

### 利用者向け

- 🤖 **AIパーソナライズ提案** — 目標・希望頻度・カレンダーの空き時間から、Gemini APIが週間トレーニング計画をJSON生成。年齢層に応じて強度を調整（シニアは低強度中心）
- ✅ **運動強度の妥当性検証** — AI提案・手動計画の両方に、年齢層別上限・週あたり増加率上限のルールベースチェックを適用し、判定理由を明示
- 📅 **スケジュール管理・カレンダー連携** — 週間予定の一覧・完了状態表示、Googleカレンダーの空き時間を考慮した提案と、確定後の自動追加
- 📊 **進捗記録** — セット数・重量・回数・トレーニング時間のログとグラフ表示
- 🔥 **負債管理・連続達成記録** — 未達成分を「負債」として翌日に補填、AIによるリカバリー提案、ストリーク（連続達成日数）の表示
- 🔔 **通知（Web Push）** — 当日予定・負債リマインダー・再エンゲージメント（3日以上未記録）・週次レポート（Gemini生成）を種別ごとに時刻・曜日単位でカスタマイズ可能。非通知時間帯・非通知曜日にも対応
- 📢 **お知らせ** — 運営からのお知らせ・注意・警告をレベル別の配色で表示。予約投稿に対応し、警告レベルは指定ページへのアクセスを一時制限
- 🔐 **セキュリティ** — Google OAuth＋パスワードの併用ログイン、MFA（TOTP、認証アプリ）、全デバイス一括ログアウト

### 管理者向け（PC・タブレット専用）

- 📈 **アナリティクスダッシュボード** — DAU/WAU・リテンション、達成率・負債発生率・負債解消率、AI提案の分析（人気メニューなど）
- ⚙️ **高度な設定**（`is_super_admin`限定） — サイト機能（AI提案・通知・カレンダー連携・負債管理など）の一括ON/OFFフラグ、緊急メンテナンスモード、お知らせの作成・予約・編集・有効化管理
- 🛡 **定期メンテナンスモード** — 深夜帯に自動でクリーンアップジョブを実行し、その間は書き込みを停止

## 技術スタック

| 領域 | 採用技術 | 備考 |
|---|---|---|
| フロントエンド / API | [Next.js](https://nextjs.org/) 16（App Router, TypeScript） | フロントとサーバー処理（Route Handlers）を一元化 |
| スタイリング | [Tailwind CSS](https://tailwindcss.com/) v4 | ネイビー基調のデザイントークンを `@theme` で定義 |
| PWA | Web App Manifest + 自前 Service Worker | Web Pushの受信・表示に対応するため手書きで管理 |
| データベース / 認証 | [Supabase](https://supabase.com/)（PostgreSQL + Auth） | 全テーブルでRLS（行レベルセキュリティ）を有効化 |
| AI | [Google Gemini API](https://ai.google.dev/) | 構造化出力（JSON）でトレーニング計画・週次レポートを生成 |
| 通知 | Web Push（VAPID）+ Supabase pg_cron / pg_net | 10分間隔でSupabase内部から送信APIを呼び出し |
| カレンダー連携 | Google Calendar API | freebusy取得・イベント自動作成 |
| グラフ | [Recharts](https://recharts.org/) | 進捗・管理画面のダッシュボード表示 |
| ホスティング | [Vercel](https://vercel.com/) | 無料プランで運用 |

技術選定の詳細・比較検討は [docs/development-plan.md §2](docs/development-plan.md) を参照してください。

## ディレクトリ構成

```
sporive/
├── docs/                    # 要件定義書・開発プラン・セットアップ手順
├── supabase/migrations/     # SQLマイグレーション（スキーマ管理）
├── public/                  # PWAマニフェスト・アイコン・Service Worker
└── src/
    ├── app/
    │   ├── (auth)/          # ログイン・サインアップ・MFA・パスワード設定
    │   ├── (user)/          # 利用者画面（スマホ専用）
    │   │   ├── home/        # 今日のトレーニング実行
    │   │   ├── schedule/    # 週間予定・カレンダー連携
    │   │   ├── progress/    # 進捗ログ・ストリーク
    │   │   ├── debts/       # 負債管理
    │   │   ├── menu/        # その他機能一覧
    │   │   └── settings/    # 通知・アカウント設定
    │   ├── admin/           # 管理者画面（PC・タブレット専用）
    │   │   └── settings/    # 高度な設定（super-admin限定）
    │   └── api/             # Route Handlers（AI提案・通知・カレンダー等）
    ├── components/          # 共通UI
    └── lib/                 # Supabase / Gemini / Push / Calendar 連携ロジック
```

## ドキュメント

| ドキュメント | 内容 |
|---|---|
| [docs/requirements.md](docs/requirements.md) | 要件定義書（仕様の一次情報） |
| [docs/development-plan.md](docs/development-plan.md) | フェーズ分割された開発プラン・実装時の判断メモ |
| [docs/setup.md](docs/setup.md) | Supabase / Google Cloud 等、外部サービスのセットアップ手順 |

## 開発

```bash
npm install
cp .env.local.example .env.local   # Supabase等の値を設定（docs/setup.md 参照）
npm run dev    # http://localhost:3000
```

動作にはSupabase / Google Cloud のセットアップが必要です。手順は [docs/setup.md](docs/setup.md) を参照してください。

利用者画面はスマホ専用のため、ブラウザの開発者ツールでデバイスエミュレーション（スマホUA）を有効にして確認してください。管理者画面（`/admin`）はPC・タブレット表示で確認してください。

```bash
npm run lint       # ESLint
npx tsc --noEmit   # 型チェック
npm run build      # 本番ビルド
```
