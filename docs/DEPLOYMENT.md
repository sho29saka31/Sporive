# Deployment（Sporive）

## ホスティング

- **Vercel**（無料プラン）、GitHubリポジトリ連携による自動デプロイ
- 本番ドメイン：`sporive.saka2931.jp`
- `main`ブランチへのマージ（またはpush）でVercelが自動的に本番デプロイを実行
- PRごとにプレビューデプロイが作成される（Vercel GitHub Check経由でCIステータスが確認できる）

## デプロイフロー（通常）

1. `origin/main`から作業ブランチを作成
2. 実装・`npm run build`でローカル検証
3. コミット・push、draft PRを作成。**コミットの作者を確認**する（`git log origin/main..HEAD --format='%an <%ae>'`）。Vercelはヘッドコミットの作者がチームメンバーでないとデプロイを「Deployment was blocked」にする（gitの`user.name`/`user.email`は変更しない）
4. Vercelのプレビューデプロイ・CIチェックがグリーンになったらdraftを解除
5. マージ → `main`への反映でVercelが本番デプロイ。複数PRを順にマージする場合は、衝突が出ないか事前に確認する（マージコミット方式）
6. デプロイ後、実際の画面で動作確認

## 環境変数の設定

Vercelプロジェクトの **Settings → Environment Variables** に、[Environment](ENVIRONMENT.md) 記載の変数をProduction/Preview/Developmentすべてにチェックして設定する。環境変数追加・変更後は **Redeploy** が必要（自動反映されない）。

## データベースマイグレーション

- `supabase/migrations/`配下のSQLファイルを、Supabaseダッシュボードの **SQL Editor** でファイル名の番号順にすべて実行する（DDLは `set local lock_timeout = '4s';` を先頭に付けて、ロック待ちで固まらないようにする）
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

## 関連アプリとのデプロイ順序

- 認証まわり（`return_to`・Cookie・`/api/profile`）の変更は **authアプリ側を先に** デプロイする。Sporive単独の変更では本番のログイン導線は変わらない
- 緊急メンテナンスのDB層ロック（`maintenance_lockdown`）は `saka2931-service` 側のmigrationで管理され、Sporiveのデプロイとは独立している。`sporive` スキーマに新しいテーブルを追加するときは同じポリシーを付けること（[RUNBOOK](RUNBOOK.md)）
- cronの宛先URL（`sporive-notifications-dispatch`）は `0034_update_dispatch_cron_url.sql` で `https://sporive.saka2931.jp` に更新済み。ドメインを変える場合はcronも更新する

## Vercel APIアクセスに関する既知の制約

本セッション（Claude Code）からの`mcp__Vercel__*`ツールは、`get_project`/`list_projects`等が機能しないことが判明している（2026-09時点）。そのため、直接のVercel再デプロイ・環境変数操作はセッションから実行できず、git push経由のGitHub↔Vercel連携デプロイのみが可能。緊急の再デプロイが必要な場合は、ラベル付きの空コミットを`main`にpushする方法で代替できる。
