# Setup: Verification（Sporive）

[Setup](Setup) の一部。アプリ側の環境変数・動作確認・トラブルシューティング(§5, §6)。

## 5. アプリ側の環境変数

`.env.local.example` を `.env.local` にコピーし、Supabase の値を設定する。

```bash
cp .env.local.example .env.local
```

Vercel にデプロイする場合は、Vercel プロジェクトの `Settings → Environment Variables` にも設定する（Production / Preview / Development すべてにチェック）。保存後は **Redeploy** が必要。

環境変数の一覧は [Environment](ENVIRONMENT) を参照。各機能実装時に必要な変数が追加された場合は、その都度案内に従って追加する。

### VAPID鍵の生成（Web Push用）

```bash
npx web-push generate-vapid-keys
```

出力される Public Key / Private Key を、それぞれ`NEXT_PUBLIC_VAPID_PUBLIC_KEY`・`VAPID_PRIVATE_KEY`としてVercelに設定する（[Setup Vercel](Setup-Vercel) 参照）。

### CRON_SECRETのSupabase Vault登録

pg_cronジョブが`/api/notifications/dispatch`を呼び出す際の認証に使う値。Vercelの環境変数`CRON_SECRET`と同じ値を、Supabase側にも`cron_secret`という名前でVault登録する必要がある。

1. 適当な長さのランダム文字列を生成する（例：`openssl rand -hex 32`）。この値を`CRON_SECRET`としてVercelに設定
2. Supabaseダッシュボードの **SQL Editor** で以下を実行し、同じ値をVaultへ登録する：
   ```sql
   select vault.create_secret('<生成した値>', 'cron_secret');
   ```
3. 値を変更する場合は`vault.update_secret`を使う（`create_secret`は初回のみ）

## 6. 動作確認の流れ

1. `/signup` にアクセスし「Googleで始める」→ Google の同意画面 → 自動的に `/signup/set-password` へ
2. パスワードを設定（8文字以上、英大文字・小文字・数字・記号をそれぞれ1文字以上含む）→ `/onboarding/profile` で表示名・生年・目標を登録 → `/home` へ
3. 一度ログアウトし、`/login` から「Googleでログイン」または、設定したメール＋パスワードでログインできることを確認

### トラブルシューティング

- **Supabaseのダッシュボード自体が開けない／ログイン状態がおかしい**：ブラウザのCookieだけでなくlocalStorageにセッション情報が残っていることが多い。ブラウザの「サイトデータを削除（Clear site data）」で一括削除するか、シークレット/プライベートウィンドウで開く
- **Google同意後にlocalhostへ飛ばされて進めない**：[Setup Supabase](Setup-Supabase) §2「URL Configuration」のSite URL / Redirect URLsが未設定・誤りの可能性が高い
- **`weak_password` エラー**：Supabaseの Password Requirements とアプリ側のバリデーションが一致していない可能性がある（現在は一致させてある）
- **プロフィール登録・書き込み系操作が`permission denied for table`で失敗する**：[Runbook](RUNBOOK) のGRANT関連の項目を参照
