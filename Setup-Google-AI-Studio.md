# Setup: Google AI Studio（Sporive）

[Setup](Setup) の一部。Gemini API（AIトレーニング提案・改善案・リカバリー提案・週次レポート生成に使用）のAPIキー取得手順。

## 1. APIキーの取得

1. https://aistudio.google.com/ にアクセスし、Googleアカウントでログイン
2. 左メニューの **Get API key** → **Create API key** を選択
3. 既存のGoogle Cloudプロジェクトを選択するか、新規プロジェクトを作成する（[Setup Google OAuth](Setup-Google-OAuth) で作成したものと同一プロジェクトでも、別プロジェクトでもよい）
4. 発行されたAPIキーを`GEMINI_API_KEY`としてVercelの環境変数に設定する（[Setup Vercel](Setup-Vercel) 参照）。チャット等での共有はしない

## 2. 利用モデルの指定

- `GEMINI_MODEL`環境変数で使用モデルを指定する（コード側にデフォルト値は持たせていないため必須。未設定時はエラー）
- 現在の設定値：`gemini-3.5-flash-lite`
- モデルの選択肢・料金体系は https://ai.google.dev/gemini-api/docs/models で確認できる

## 3. 無料枠について

- Google AI Studio経由のAPIキーは無料枠（Free tier）で発行され、分間・日間のリクエスト数に上限がある
- 無料枠の上限は使用モデルによって異なるため、https://ai.google.dev/gemini-api/docs/rate-limits で現在の上限を確認する
- 本番運用で無料枠の上限に達する場合は、Google Cloud側で課金を有効化したプロジェクトに切り替える必要がある（要判断、コスト方針の見直しを伴う）

## トラブルシューティング

- **AI提案・改善案の生成が`502`エラーで失敗する**：Gemini API自体の障害・レート制限の可能性。[Runbook](RUNBOOK) の「Gemini API呼び出しが失敗する」も参照
- **`GEMINI_MODEL`未設定でのデプロイ**：起動時ではなくAPI呼び出し時にエラーになる設計のため、デプロイ自体は成功する点に注意（実際にAI機能を呼び出して確認する）
