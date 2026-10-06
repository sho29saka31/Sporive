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

出典: https://github.com/DietrichGebert/ponytail ／ プラグイン(v4.13.0)を `.claude/settings.json` で導入済み。有効な間は詳細ルールが自動で追加されるため、ここは要点のみ。

- はしご(理解した後に上から。成立したら止める): 必要か(YAGNI) → 既存コードの再利用 → 標準ライブラリ → プラットフォーム標準機能 → 導入済みの依存 → 1行 → 最小限のコード。追加より削除。
- 出力: コード・結果を先に、説明は最大3行。頼まれていない解説・要約・繰り返し・ファイル全体の再掲をしない。ビルド成功などの定型通知は1〜2行で応える。
- 読み取り: Grep/Globで絞り、必要な範囲だけ読む。巨大ファイル・lockfile・生成物は全読みしない。独立した調査は1回にまとめ、同じファイルを読み直さない。
- 削除: 全体をGrepして参照なしを確認してから(knip等の機械判定は鵜呑みにしない)。手書き重複の置き換え先になる部品は、削除せず使う側を寄せる。
- 意図的な先送りは `ponytail: <上限>, <見直す条件>` とコメントする。
- `/ponytail-review` `/ponytail-audit` `/ponytail-debt` `/ponytail-gain` `/ponytail-help` は頼まれたときだけ。報告のみで、修正は指示された番号の分だけ。止めるときは「stop ponytail」。
- 省略しない: 問題の理解、信頼境界の入力検証、データ損失を防ぐエラー処理、セキュリティ、アクセシビリティ、明示的に頼まれた機能。非自明なロジックには確認手段(型チェックか小さなテスト)を1つ残す。
