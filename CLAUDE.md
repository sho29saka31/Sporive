# Sporive

AIパーソナライズトレーニング計画を提案するPWA。スマホ専用の利用者画面＋PC/タブレット専用の管理者画面。

## 言語ルール

- **思考（thinking）・回答・説明はすべて日本語で行うこと**
- コミットメッセージ・PRタイトル・PR本文も日本語を基本とする（コード・識別子・技術用語は英語のままでよい）

## 必読ドキュメント

- `docs/requirements.md` — 要件定義書（仕様の一次情報。§14更新履歴が最新の決定）
- `docs/development-plan.md` — フェーズ分割された開発プラン。実装はこのフェーズ順に進める

## 重要な決定事項

- 技術スタック：Next.js (App Router, TypeScript) / Tailwind CSS / Supabase (DB+Auth) / Gemini API / Web Push (VAPID) / Vercel 無料プラン
- 通知トリガーは **GitHub Actions scheduled workflow**（Vercel Cron は不採用）
- すべて無料プラン内で運用する（有料サービスを導入しない）
- 利用者画面はスマホ専用（他デバイスは誘導画面）、管理者画面はPC/タブレット専用
- 基調カラーはネイビー、アクセントにカラフルな配色
- UIテキストは日本語

## 進め方

- 未確定事項（要件定義書§13）で判断が必要な場合はユーザー（Shoki）に確認する
- 各フェーズを1つの作業単位（ブランチ/PR）として完結させる

## プロジェクトスキル（.claude/skills/）

- `update-teigisho` — 要件定義書（docs/requirements.md）の更新。使用時は必ず§14更新履歴に追記する
- `update-md` — 既存mdファイルの更新。対象が要件定義書の場合は update-teigisho の手順に従う
