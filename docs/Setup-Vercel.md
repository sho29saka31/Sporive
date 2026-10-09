# Setup: Vercel（Sporive）

[Setup](Setup.md) の一部。Vercelプロジェクトの作成・環境変数設定・ドメイン接続。

## 1. プロジェクトのImport

1. https://vercel.com/ でアカウントを作成（GitHubアカウントでのサインインを推奨）
2. ダッシュボードの **Add New → Project** から、GitHubの`sho29saka31/Sporive`リポジトリを選択してImport
3. Framework Presetは自動的に**Next.js**が検出される。Build Command・Output Directory・Install Commandはデフォルトのままでよい
4. Root Directoryもリポジトリ直下のままでよい（サブディレクトリ構成ではない）

## 2. 環境変数の設定

Import画面（または作成後の **Settings → Environment Variables**）で、[Environment](ENVIRONMENT.md) 記載の変数をすべて設定する。

- Production / Preview / Development の**すべてにチェック**を入れる（プレビューデプロイでも同じ値を使う場合）
- `SUPABASE_SERVICE_ROLE_KEY`等の秘匿値は、値をコピーする際にチャットや他のツールに貼り付けないよう注意する
- 環境変数を追加・変更した場合、既存のデプロイには自動反映されない。**Deployments → 該当デプロイ → Redeploy** が必要

## 3. 独自ドメインの接続

1. **Settings → Domains** で `sporive.saka2931.jp` を追加
2. 表示されるDNSレコード（CNAMEまたはA/AAAA）を、ドメインのDNS管理画面（`saka2931.jp`のDNSプロバイダ）に追加
3. DNS反映後、Vercel側で自動的にHTTPS証明書が発行される

## 4. GitHub連携によるデプロイ

- `main`ブランチへのpush（PRマージ含む）で自動的に本番デプロイが実行される
- 他のブランチへのpush・PR作成では、そのブランチ専用のプレビューデプロイが作成される（PRにVercel botがコメントでURLを投稿）
- デプロイのビルドログは **Deployments** タブから確認できる

## 5. Vercel無料プランの制約

- サーバーレス関数の実行時間上限：既定10秒（`maxDuration`で個別に緩和可能、最大60秒程度。Sporiveでは Gemini API呼び出し系のRoute Handlerに`maxDuration = 45`を指定して対応）
- 詳細は [Deployment](DEPLOYMENT.md) も参照

## Vercel Analyticsの有効化

コードは `@vercel/analytics` を読み込み済み。Vercelのプロジェクトの **Analytics** タブで **Enable** をクリックすると計測が始まる（無料プランには月間のイベント数の上限あり）。

## トラブルシューティング

- **デプロイは成功するが画面が真っ白・エラーになる**：環境変数の設定漏れが多い。特に`NEXT_PUBLIC_`接頭辞の変数はビルド時に埋め込まれるため、追加後は必ずRedeployが必要
- **プレビューデプロイでSupabase認証が失敗する**：[Setup Supabase](Setup-Supabase.md) のURL Configuration（Redirect URLs）にプレビュードメインが未登録の可能性
