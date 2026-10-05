![Sporive](public/logo-horizontal.png)

# Sporive

**AIがパーソナライズしたトレーニング計画を提案する、スマホ専用のフィットネスPWA。**

若者からシニアまで幅広い層を対象に、Google Gemini APIによるAI提案・進捗記録・Web Push通知・負債管理（未達成分のリカバリー）など、継続的なトレーニング習慣を支える機能を、Next.js（フロント＋API）と Supabase（DB＋認証）を中心とした構成で、**すべて無料プランの範囲内**で実現しています。

[![Next.js](https://img.shields.io/badge/Next.js-16-000000?logo=nextdotjs&logoColor=white)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![Supabase](https://img.shields.io/badge/Supabase-DB%20%2B%20Auth-3FCF8E?logo=supabase&logoColor=white)](https://supabase.com/)
[![Vercel](https://img.shields.io/badge/Deploy-Vercel-000000?logo=vercel&logoColor=white)](https://vercel.com/)

---

## ライセンスについて

本リポジトリはソースコードを公開しておりますが、再利用・複製・改変・再配布は許可していません。閲覧のみでの利用に限ります。

This repository provides the source code, but reuse, copying, modification, and redistribution are not permitted. Use is limited to viewing only.

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

- 🤖 **AIパーソナライズ提案** — 目標・希望頻度から、Gemini APIが週間トレーニング計画をJSON生成。年齢層に応じて強度を調整（シニアは低強度中心）
- ✅ **運動強度の妥当性検証** — AI提案・手動計画の両方に、年齢層別上限・週あたり増加率上限のルールベースチェックを適用し、判定理由を明示
- 📅 **スケジュール管理** — 週間予定の一覧・完了状態表示
- 📊 **進捗記録** — セット数・重量・回数・トレーニング時間のログとグラフ表示
- 🔥 **負債管理・連続達成記録** — 未達成分を「負債」として翌日に補填、AIによるリカバリー提案、ストリーク（連続達成日数）の表示
- 🔔 **通知（Web Push）** — 当日予定・負債リマインダー・再エンゲージメント（3日以上未記録）・週次レポート（Gemini生成）を種別ごとに時刻・曜日単位でカスタマイズ可能。非通知時間帯・非通知曜日にも対応
- 📢 **お知らせ** — adacの管理画面から配信される運営からのお知らせ・注意・警告をレベル別の配色で表示
- 🔐 **セキュリティ** — ログイン・MFA・パスキー・端末管理・アカウント削除は `auth.saka2931.jp` に一元化（Sporiveは未ログイン時に転送）

### 管理者向け（PC・タブレット専用）

- 📈 **アナリティクスダッシュボード** — DAU/WAU・リテンション、達成率・負債発生率・負債解消率、AI提案の分析（人気メニューなど）
- ⚙️ **高度な設定**（`is_super_admin`限定） — 利用者データの管理（削除）。機能フラグ・緊急メンテナンス・お知らせの管理はadacの管理画面に統合済み
- 🛡 **メンテナンスモード** — 定期（JST 2:30〜3:30、クリーンアップジョブ実行中）と緊急（adacから即時）の2種。どちらも `/maintenance` の画面を HTTP 503 で返し（URLは変えない）、緊急時はDB（RLS）でも直接アクセスを拒否し、稼働状況ページにも自動で反映する

## 技術スタック

| 領域 | 採用技術 | 備考 |
|---|---|---|
| フロントエンド / API | [Next.js](https://nextjs.org/) 16（App Router, TypeScript） | フロントとサーバー処理（Route Handlers）を一元化 |
| スタイリング | [Tailwind CSS](https://tailwindcss.com/) v4 | ネイビー基調のデザイントークンを `@theme` で定義 |
| PWA | Web App Manifest + 自前 Service Worker | Web Pushの受信・表示に対応するため手書きで管理 |
| データベース | [Supabase](https://supabase.com/)（PostgreSQL、`saka2931-service`の`sporive`スキーマ） | 全テーブルでRLS（行レベルセキュリティ）を有効化 |
| 認証 | `auth.saka2931.jp`（別リポジトリ`auth`、Supabase Auth） | `.saka2931.jp`スコープのCookieでSSO。Sporiveはセッションを読むのみ |
| AI | [Google Gemini API](https://ai.google.dev/) | 構造化出力（JSON）でトレーニング計画・週次レポートを生成 |
| 通知 | Web Push（VAPID）+ Supabase pg_cron / pg_net | 10分間隔でSupabase内部から送信APIを呼び出し |
| グラフ | [Recharts](https://recharts.org/) | 進捗・管理画面のダッシュボード表示 |
| ホスティング | [Vercel](https://vercel.com/) | 無料プランで運用 |

技術選定の詳細・比較検討は [docs/Development-Plan-Overview.md](docs/Development-Plan-Overview.md) を参照してください。

## ディレクトリ構成

```
sporive/
├── middleware.ts            # 認証転送・メンテナンス転送の入口
├── docs/                    # 要件定義・開発プラン・セットアップ・Architecture/API/ADR/Runbook等
├── supabase/migrations/     # SQLマイグレーション（スキーマ管理）
├── public/                  # PWAマニフェスト・アイコン・Service Worker
└── src/
    ├── app/
    │   ├── (auth)/          # ログイン・サインアップ・MFA・パスワード設定
    │   ├── (user)/          # 利用者画面（スマホ専用）
    │   │   ├── home/        # 今日のトレーニング実行
    │   │   ├── schedule/    # 週間予定
    │   │   ├── progress/    # 進捗ログ・ストリーク
    │   │   ├── debts/       # 負債管理
    │   │   ├── menu/        # その他機能一覧
    │   │   └── settings/    # 通知・アカウント設定
    │   ├── admin/           # 管理者画面（PC・タブレット専用）
    │   │   └── settings/    # 高度な設定（super-admin限定）
    │   ├── maintenance/     # メンテナンス表示（404/500は not-found.tsx / error.tsx）
    │   └── api/             # Route Handlers（AI提案・通知等）
    ├── components/          # 共通UI
    └── lib/                 # Supabase / Gemini / Push 連携ロジック
```

## ドキュメント

リポジトリは非公開のため、ドキュメントはGitHub Wikiではなく `docs/` で管理している（目次は [docs/Home.md](docs/Home.md)）。

| ドキュメント | 内容 |
|---|---|
| [docs/Home.md](docs/Home.md) | 目次・目的別ガイド |
| [docs/Requirements.md](docs/Requirements.md) | 要件定義書（仕様の一次情報。章ごとに分割） |
| [docs/Development-Plan.md](docs/Development-Plan.md) | フェーズ分割された開発プラン・実装時の判断メモ |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | 現在のシステム構成・middlewareの流れ・設計判断 |
| [docs/API.md](docs/API.md) | Route Handlers・Server Actions・認証との境界 |
| [docs/ADR.md](docs/ADR.md) | 設計判断の記録 |
| [docs/CHANGELOG.md](docs/CHANGELOG.md) | 変更履歴（仕様の最新はこちら） |
| [docs/Setup.md](docs/Setup.md) | 外部サービス（Supabase / Vercel / Gemini / Analytics）のセットアップ手順 |
| [docs/ENVIRONMENT.md](docs/ENVIRONMENT.md) | 環境変数・関連外部サービス |
| [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) | デプロイ・マイグレーション・ロールバック |
| [docs/RUNBOOK.md](docs/RUNBOOK.md) | 障害・トラブル対応 |

## 関連リポジトリ

| リポジトリ | 役割 |
|---|---|
| [auth](https://github.com/sho29saka31/auth) | ログイン・アカウント管理（`auth.saka2931.jp`）。Sporiveの認証はすべてここ |
| [adac](https://github.com/sho29saka31/adac) | 管理画面。機能フラグ・緊急メンテナンス・お知らせ・お問い合わせ・インシデント |
| [service](https://github.com/sho29saka31/service) | プライバシーポリシー・利用規約・お問い合わせ（`service.saka2931.jp`） |
| [status](https://github.com/sho29saka31/status) | 稼働状況ページ（`status.saka2931.jp`） |
| [legal-life](https://github.com/sho29saka31/legal-life) | 兄弟アプリ（同じ`saka2931-service`プロジェクトを共有） |

## 開発

```bash
npm install
cp .env.local.example .env.local   # Supabase等の値を設定（docs/ENVIRONMENT.md・docs/Setup.md 参照）
npm run dev    # http://localhost:3000
```

動作にはSupabase（`saka2931-service`）・Gemini APIキー・VAPID鍵などが必要です。手順は [docs/Setup.md](docs/Setup.md)、変数の一覧は [docs/ENVIRONMENT.md](docs/ENVIRONMENT.md) を参照してください。ログインは `auth.saka2931.jp` に転送されるため、ローカルでログイン状態を再現するには本番/プレビュー環境のCookie（`.saka2931.jp`）が必要です。

利用者画面はスマホ専用のため、ブラウザの開発者ツールでデバイスエミュレーション（スマホUA）を有効にして確認してください。管理者画面（`/admin`）はPC・タブレット表示で確認してください。

```bash
npm run lint       # ESLint
npx tsc --noEmit   # 型チェック
npm run build      # 本番ビルド
```
