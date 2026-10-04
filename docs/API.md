# API（Sporive）

Sporiveの外部から呼び出されるRoute Handlers（`src/app/api/`）・公開ルート一覧。すべて認証必須（明記のあるものを除く）。

> ログイン・サインアップ・パスワード再設定・MFA・パスキー・アカウント削除、およびその認証コールバック（`/auth/callback` `/auth/confirm`）は **auth.saka2931.jp** に移管済みで、Sporiveには存在しない。仕様は authリポジトリの `docs/API.md` を参照。

## AI

### `POST /api/ai/propose-plan`
プロフィール（生年・目標・性別）と希望頻度からGemini APIで週間トレーニング計画を新規提案する。

- 認証：必須（Supabaseセッション）
- 機能フラグ：`ai_master`・`ai_weekly_proposal`（いずれか無効なら503）
- Body: `{ weeklyFrequency: number(1-7), requestText?: string(最大300文字) }`
- Response: `{ plan: {...} }` または `{ error: string }`
- `maxDuration = 45`（Gemini構造化JSON生成がVercel無料プランの既定10秒を超えるため延長）

### `POST /api/ai/improve-plan`
登録直前の計画（AI提案 or 手動作成）に対して、AIが改善案を提示する（[Requirements AI Proposal](Requirements-AI-Proposal.md) 参照）。

- 認証：必須
- 機能フラグ：`ai_master`・`ai_improvement_suggestion`
- `maxDuration = 45`

### `POST /api/ai/recovery`
未消化の負債に対するAIリカバリー提案（Phase 7、[Requirements Progress Debts](Requirements-Progress-Debts.md) 参照）。

- 認証：必須
- 機能フラグ：`ai_master`・`ai_recovery_advice`・`debt_management`
- `maxDuration = 45`

## 通知

### `POST /api/notifications/subscribe`
Web Push購読情報（endpoint・p256dh・auth）を`push_subscriptions`に登録する。

- 認証：必須

### `POST /api/notifications/dispatch`
Supabase pg_cron + pg_net から10分間隔で呼び出される通知送信バッチ。当日予定・負債リマインダー・再エンゲージメント・週次レポートの対象者を判定し、Web Push送信する。

- 認証：`CRON_SECRET`（ヘッダー等で照合。Supabase Vaultの`cron_secret`と同一値）
- 呼び出し元：`supabase/migrations`内のpg_cronジョブ定義（`net.http_post`、timeout 15000ms）
- 外部からの直接呼び出しは想定しない

## 計画検証

### `POST /api/plan/validate`
AI提案・手動計画双方に対する運動強度の妥当性検証（ルールベース：年齢層別上限・週あたり増加率上限）。

- 認証：必須

## 管理者向け

### `GET /api/admin/export`
管理者向けデータエクスポート（CSV、[Requirements Admin](Requirements-Admin.md) 参照）。

- 認証：必須（`is_admin`または`is_super_admin`のみ）
- クエリパラメータ：
  - `type`：`summary`（日別サマリー）・`workout_logs`（実績ログ明細）・`debts`（負債明細）・`ai_proposals`（AI提案ログ明細）のいずれか
  - `from`・`to`：期間（`YYYY-MM-DD`）
- Excelでの日本語文字化け対策としてBOM付きUTF-8で返す。利用者の自由入力値（表示名・種目名・メモ等）はCSVインジェクション対策のためエスケープして出力

### `/admin/settings`（データ管理タブ）
「高度な設定」内のデータ管理画面。利用者単位でトレーニング計画・実績（`training_plans`/`plan_items`/`workout_logs`）、負債データ（`debts`）、AI提案ログ（`ai_proposal_logs`）、通知履歴（`notification_logs`）を削除できる。機能フラグ・お知らせのCRUDはadacの管理画面へ移管済みのため、このページには含まれない（要件定義書策定後に追加された機能のため [Requirements Admin](Requirements-Admin.md) には未記載）。

- 認証：`is_super_admin`（layout.tsxでガード）
- `SUPABASE_SERVICE_ROLE_KEY`経由（service_roleクライアント）で操作

## リダイレクト

### `GET /privacy`, `GET /terms`
旧仕様（Sporive独自のプライバシーポリシー・利用規約ページ）からの互換用リダイレクト。既存のリンク・検索エンジンのインデックス・Google OAuth同意画面のリンク先を生かすため、それぞれ`https://service.saka2931.jp/privacy`・`https://service.saka2931.jp/terms`へ転送する（プライバシーポリシー・利用規約はserviceへ集約済み）。

## 公開ルート・メタ

| パス | 内容 |
|---|---|
| `/` | トップ（機能紹介）。未ログインでも表示。ログイン/登録ボタンは `auth.saka2931.jp` の `/login` `/signup`（`return_to=https://sporive.saka2931.jp/home`）へのリンク |
| `/maintenance` | メンテナンス表示（503）。定期・緊急メンテナンスの転送先。稼働状況ページへのリンクあり |
| `/sitemap.xml` `/robots.txt` | 公開対象はトップのみ。ログイン必須の画面は `robots` でDisallow |
| `/opengraph-image`（`/privacy` `/terms` 配下を含む） | OGP画像の動的生成 |
| 404 / 500 | `not-found.tsx` / `error.tsx` / `global-error.tsx`（共通部品 `ErrorPage`） |

## 認証との境界

- 未ログイン・MFA未完了は middleware が `https://auth.saka2931.jp/login`（`/mfa-challenge`）へ `return_to` 付きで転送する
- 表示名は auth の `GET/PATCH https://auth.saka2931.jp/api/profile`。Sporiveのサーバーコードが `lib/authApp.ts` の `getDisplayName()` / `updateDisplayName()` でCookieを転送して呼ぶ（失敗時は `null` / `false`）
- 端末の強制ログアウト検知用に、Sporiveのブラウザが `auth_app.sessions` を直接 upsert / 監視する（`PushCleanupWatcher`。RLSで本人の行のみ）

## Server Actions（参考、Route Handlerではないが外部境界として重要）

- `schedule/actions.ts` の `saveTrainingPlan` — 週間計画の保存（旧: 保存後に`syncPlanToCalendar`をafter()で実行していたが削除済み）
- `home/actions.ts` の `logWorkout` — 実績ログの記録。連続達成記録（ストリーク）・負債解消判定の起点となる中核アクション
- `debts/actions.ts` の `resolveDebt` — 負債の解消（補填実施）記録
- `settings/notifications/actions.ts` の `markAnnouncementRead` — お知らせの既読化
- `settings/account/notifications/actions.ts` の `saveNotificationSettings` — 通知設定（時刻・曜日・非通知時間帯等）の保存
- `onboarding/profile/actions.ts`・`settings/account/actions.ts`（`updateProfile`） — プロフィール登録・目標編集時に`lib/gemini.ts`の`summarizeGoal`を呼び出し、自由記述の目標をGemini APIで簡潔な文章に整形してから保存する。扱うのは生年・目標・性別のみで、表示名はauthに委譲する（[Requirements AI Proposal](Requirements-AI-Proposal.md) 参照）
- `admin/settings/actions.ts` — 「データ管理」タブからのトレーニングデータ・負債データ・AI提案ログ・通知履歴の削除（本ページ「管理者向け」節を参照）

## 内部で呼び出されるGemini生成関数（`lib/gemini.ts`、直接の外部エンドポイントではない）

- `generateWeeklyPlan` — `/api/ai/propose-plan`から呼び出し
- `generateImprovementSuggestion` — `/api/ai/improve-plan`から呼び出し
- `generateRecoveryAdvice` — `/api/ai/recovery`から呼び出し
- `summarizeGoal` — 上記Server Actionsから呼び出し
- `generateWeeklyReport` — `/api/notifications/dispatch`から呼び出し（週次レポート通知、[Requirements Notifications](Requirements-Notifications.md) §8-1参照）

## 認証方式

すべてのRoute HandlerはSupabaseセッションCookie（`@supabase/ssr`、`.saka2931.jp`スコープでauthアプリが発行）による認証。`/api/*`はNext.js middlewareのルートガード対象外とし、認証チェックは各Route Handler自身で行う（middlewareでリダイレクトすると`fetch`呼び出しがJSONではなくHTMLリダイレクト応答を受け取ってしまうため）。
