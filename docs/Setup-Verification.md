# Setup: Verification（Sporive）

[Setup](Setup.md) の一部。アプリ側の環境変数・動作確認・トラブルシューティング(§5, §6)。

## 5. アプリ側の環境変数

`.env.local` を作成し、Supabase の値を設定する（[ENVIRONMENT](ENVIRONMENT.md) 参照。サンプルファイルはGitHubに置かない方針）。

```bash
touch .env.local
```

Vercel にデプロイする場合は、Vercel プロジェクトの `Settings → Environment Variables` にも設定する（Production / Preview / Development すべてにチェック）。保存後は **Redeploy** が必要。

環境変数の一覧は [Environment](ENVIRONMENT.md) を参照。各機能実装時に必要な変数が追加された場合は、その都度案内に従って追加する。

### VAPID鍵の生成（Web Push用）

```bash
npx web-push generate-vapid-keys
```

出力される Public Key / Private Key を、それぞれ`NEXT_PUBLIC_VAPID_PUBLIC_KEY`・`VAPID_PRIVATE_KEY`としてVercelに設定する（[Setup Vercel](Setup-Vercel.md) 参照）。

### CRON_SECRETのSupabase Vault登録

pg_cronジョブが`/api/notifications/dispatch`を呼び出す際の認証に使う値。Vercelの環境変数`CRON_SECRET`と同じ値を、Supabase側にも`cron_secret`という名前でVault登録する必要がある。

1. 適当な長さのランダム文字列を生成する（例：`openssl rand -hex 32`）。この値を`CRON_SECRET`としてVercelに設定
2. Supabaseダッシュボードの **SQL Editor** で以下を実行し、同じ値をVaultへ登録する：
   ```sql
   select vault.create_secret('<生成した値>', 'cron_secret');
   ```
3. 値を変更する場合は`vault.update_secret`を使う（`create_secret`は初回のみ）

## 6. 動作確認の流れ

1. 未ログインで `https://sporive.saka2931.jp/home` を開く → `auth.saka2931.jp/login?return_to=...` へ転送される
2. authアプリでログイン（パスワード / Google / パスキー）→ 初回は表示名の設定（`/signup/profile`）→ Sporiveへ戻り、初回は `/onboarding/profile` で生年・目標・性別を登録 → `/home`
3. 一度ログアウトし、再ログインできることを確認。ログイン済みで `auth.saka2931.jp/login` を直接開くと `/account`（または戻り先）へ転送される

### トラブルシューティング

- **Supabaseのダッシュボード自体が開けない／ログイン状態がおかしい**：ブラウザのCookieだけでなくlocalStorageにセッション情報が残っていることが多い。ブラウザの「サイトデータを削除（Clear site data）」で一括削除するか、シークレット/プライベートウィンドウで開く
- **Google同意後にlocalhostや別URLへ飛ばされて進めない**：Supabase の Site URL / Redirect URLs（authアプリ用の設定、authリポジトリの `docs/Setup.md` §1）が誤っている可能性が高い
- **`weak_password` エラー**：Supabaseの Password Requirements と、authアプリ側のバリデーションが一致していない可能性がある
- **プロフィール登録・書き込み系操作が`permission denied for table`で失敗する**：[Runbook](RUNBOOK.md) のGRANT関連の項目を参照
