# Sporive

AIパーソナライズトレーニング計画を提案するPWA。スマホ専用の利用者画面＋PC/タブレット専用の管理者画面。

## 言語ルール

- **思考（thinking）・回答・説明はすべて日本語で行うこと**
- コミットメッセージ・PRタイトル・PR本文も日本語を基本とする（コード・識別子・技術用語は英語のままでよい）

## 必読ドキュメント

リポジトリは非公開のため、これらのドキュメントはGitHub Wikiではなく**リポジトリ内の `docs/`** で管理する（目次: `docs/Home.md`）。

- `docs/Requirements.md`（と `Requirements-*.md`）— 要件定義書（仕様の一次情報）。**最新の決定は `docs/CHANGELOG.md`**
- `docs/Development-Plan.md`（と `Development-Plan-*.md`）— フェーズ分割された開発プラン・実装時の判断メモ
- `docs/ARCHITECTURE.md` — 現在のシステム構成。`docs/ADR.md` — 設計判断
- `docs/Setup.md` — 外部サービス（Supabase / Vercel / Gemini / Analytics）のセットアップ手順（ユーザー作業）。認証関連の設定は authリポジトリの `docs/Setup.md`

※ ログイン・アカウント関連の仕様は `auth.saka2931.jp`（authリポジトリ）に移管済み。

## 重要な決定事項

- 技術スタック：Next.js (App Router, TypeScript) / Tailwind CSS / Supabase (DB+Auth) / Gemini API / Web Push (VAPID) / Vercel 無料プラン
- 通知トリガーは **Supabase pg_cron + pg_net**（GitHub Actions scheduled workflowは遅延が大きく2026-08-24に移行、Vercel Cronは不採用）
- すべて無料プラン内で運用する（有料サービスを導入しない）
- 利用者画面はスマホ専用（他デバイスは誘導画面）、管理者画面はPC/タブレット専用
- 基調カラーはネイビー、アクセントにカラフルな配色
- UIテキストは日本語

## 進め方

- 未確定事項（`docs/Requirements-Future-Work.md`「今後の検討事項」）で判断が必要な場合はユーザー（Shoki）に確認する
- 各フェーズを1つの作業単位（ブランチ/PR）として完結させる

## プロジェクトスキル（.claude/skills/）

- `update-teigisho` — 要件定義書（docs/Requirements*.md）の更新。使用時は必ず docs/CHANGELOG.md に追記する
- `update-md` — 既存mdファイルの更新。対象が要件定義書の場合は update-teigisho の手順に従う
- `check-plan` — 開発プランの各Phaseに対する進捗状況の確認・表示（表示のみ、変更なし）
- `deploy-merge` — Claude が作成した PR のマージ。CI・コンフリクト等のマージ前チェックを行い、マージ後は Vercel デプロイ状態を確認

## Ponytail: 怠け者のシニア開発者モード

出典: https://github.com/DietrichGebert/ponytail(「最高のコードは書かないコード」という思想に基づくコーディング規約)

コードを書く前に、以下の優先順位のはしごを上から順に検討し、条件を満たした段階でそれ以上のコードは書かない。

1. **そもそも必要か**(YAGNI) — 依頼されていない機能・抽象化・boilerplateを足さない
2. **コードベースに既にあるか** — 既存の実装・パターンを再利用する
3. **標準ライブラリで足りるか**
4. **プラットフォームのネイティブ機能で足りるか**
5. **既にインストール済みの依存関係で足りるか**
6. **1行で書けるか**
7. ここまでで解決しなければ、初めて必要最小限のコードを書く

その他の原則:
- 追加より削除を優先する。全体を理解した上での最短の差分を選ぶ
- 意図的なトレードオフはコメントでその限界を明記する
- 「怠ける」対象は上記のみ。以下は絶対に省略しない: 問題の理解、信頼境界での入力検証、データ損失を防ぐエラーハンドリング、セキュリティ、アクセシビリティ、明示的に依頼された機能
