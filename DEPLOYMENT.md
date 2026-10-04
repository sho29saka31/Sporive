# Deployment（Sporive）

## ホスティング

- **Vercel**（無料プラン）、GitHubリポジトリ連携による自動デプロイ
- 本番ドメイン：`sporive.saka2931.jp`
- `main`ブランチへのマージ（またはpush）でVercelが自動的に本番デプロイを実行
- PRごとにプレビューデプロイが作成される（Vercel GitHub Check経由でCIステータスが確認できる）

## デプロイフロー（通常）

1. `origin/main`から作業ブランチを作成
2. 実装・`npm run build`でローカル検証
3. コミット・push、draft PRを作成
4. Vercelのプレビューデプロイ・CIチェックがグリーンになったらdraftを解除
5. マージ（squash）→ `main`への反映でVercelが本番デプロイ
6. デプロイ後、実際の画面で動作確認

## 環境変数の設定

Vercelプロジェクトの **Settings → Environment Variables** に、[Environment](ENVIRONMENT) 記載の変数をProduction/Preview/Developmentすべてにチェックして設定する。環境変数追加・変更後は **Redeploy** が必要（自動反映されない）。

## データベースマイグレーション

- `supabase/migrations/`配下のSQLファイルを、Supabaseダッシュボードの **SQL Editor** でファイル名の番号順にすべて実行する
- Vercelのビルドプロセスでは自動適用されない（Supabase CLIの接続は未構成のため、マイグレーション適用は手動）
- 新しいマイグレーションファイルが追加されたら、その都度同じ手順で番号順に適用する
- 既に実行済みのSQLを誤って再実行すると`type already exists`等のエラーが出るが無害（実害の有無は`select * from <テーブル名>;`で確認できる）

## デプロイ前チェックリスト

- [ ] `npm run lint`
- [ ] `npx tsc --noEmit`
- [ ] `npm run build`
- [ ] 新規マイグレーションがあれば、Supabase SQL Editorで適用済みか確認
- [ ] 新規環境変数があれば、Vercelに設定済みか確認（設定後はRedeploy）
- [ ] Google OAuth関連の変更がある場合、Google Cloud Consoleの承認済みドメイン・リダイレクトURIとの整合を確認

## ロールバック

- Vercelダッシュボードの **Deployments** から、直前の正常なデプロイメントを選択して **Promote to Production** することで即座にロールバック可能
- DBマイグレーションはVercelのロールバックでは戻らない点に注意（破壊的変更を伴うマイグレーションは特に慎重に）

## Vercel APIアクセスに関する既知の制約

本セッション（Claude Code）からの`mcp__Vercel__*`ツールは、`get_project`/`list_projects`等が機能しないことが判明している（2026-09時点）。そのため、直接のVercel再デプロイ・環境変数操作はセッションから実行できず、git push経由のGitHub↔Vercel連携デプロイのみが可能。緊急の再デプロイが必要な場合は、ラベル付きの空コミットを`main`にpushする方法で代替できる。
