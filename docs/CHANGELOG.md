# Changelog（Sporive）

要件定義書 §15 更新履歴・development-plan.md §7 実装時の判断メモ・本セッションでの作業を統合した変更履歴。日付は決定・実装が確定した日。

## 2026-10-06（ポニーテール再監査）
- 参照のない型 `SettingsActionState`（管理画面の設定アクション）を削除

## 2026-10-06（要件定義書・開発プランの内容レビュー）
- 実装との食い違いを修正した。管理者判定は、カスタムアクセストークンフックのJWTクレームではなく `profiles` を都度参照する方式で、フックはアプリから参照されない（`Setup-Supabase.md` の「フックの有効化が必須」を「不要」に、`ENVIRONMENT.md` から該当項目を削除）。`/terms`・`/privacy` はserviceへのリダイレクトで、SEO対象の公開ページはトップのみ。端末一覧はauthの `/account/devices` で実装済み。Phase 10の定期メンテナンス記述は当時のものと明記した

## 2026-10-05（.env.local.exampleをGitHubから削除）
- サンプルの環境変数ファイル `.env.local.example` を、GitHub上の全履歴から削除した（`git filter-repo` による履歴の書き換え。過去のコミットのSHAはすべて変わっている）。`.gitignore` で再追加を防ぎ、README・docsのセットアップ手順を `docs/ENVIRONMENT.md` の参照に変更した。履歴中に秘密の値（APIキー等）は含まれていなかった

## 2026-10-05（ドキュメント監査）
- READMEほかのメンテナンス記述を503の挙動に合わせた。`new_signup` フラグが止める範囲（初回プロフィール登録のみ）、管理者判定の方式（JWTクレームではなく `profiles` を都度参照）、`Development-Plan-Structure.md` の `profiles` 定義（表示名の削除・`goal` の型・`is_super_admin`）を実態に合わせた

## 2026-10-05（表示名をauthに統一）
- 表示名の読み書きをauthに一本化（#96）。本番DBでauthに名前が無かった3人をSporiveの名前で `auth_app.user_profiles` へ移行し、`sporive.profiles.display_name` 列を削除（`0035`。ADR-009の未完了事項が完了）

## 2026-10-05（メンテナンス画面を503で返す）
- 定期・緊急メンテナンスの `/maintenance` を、リダイレクト（最終的に200）からURLを変えないrewriteによる **HTTP 503＋`Retry-After: 600`** に変更（ADR-013）。外形監視が正常と誤判定していた問題の解消。稼働状況ページへの自動連動はadac側

## 2026-10-04（SMTP・漏洩検知・レート制限の反映）
- ドキュメント更新：Custom SMTP（Resend、Sender name `auth`）は設定済み、漏洩パスワード保護は有料プラン向けのため利用不可、メール送信のレート制限は未調整の可能性があり要確認、と反映

## 2026-10-04（ドキュメントの再編成）
- 非公開化に伴い、Wikiで管理していたドキュメント一式を `docs/` に取り込み（要件定義・開発プラン・セットアップ・標準ドキュメント）。内容を現行仕様（auth一元化・メンテナンス転送・エラーページ・SEO）に合わせて更新（ADR-012）

## 2026-10-04（メンテナンス表示の統一）
- 定期・緊急メンテナンスで、トップページ（`/`）も `/maintenance` へ転送するよう変更。除外は `/privacy` `/terms` `/maintenance` と `/admin*` `/api/*` のみ。専用のロックダウン用分岐・表示を削除（ADR-011）
- 緊急メンテナンスが `saka2931-service` のRLS（`maintenance_lockdown`）でも効くようになった（adac→infra→service同期。ADR-010）。`sporive` の全テーブルが対象で、管理者とservice_roleは対象外

## 2026-10-04（エラーページ）
- 404（`not-found.tsx`）・500系（`error.tsx` / `global-error.tsx`）・メンテナンス（`/maintenance`）の専用画面を追加（共通部品 `ErrorPage`）。500とメンテナンスには稼働状況ページ（status.saka2931.jp）へのリンクを表示

## 2026-09-20
- `CLAUDE.md` に ponytail（怠け者のシニア開発者）ルールセットを追加し、未使用ファイルを削除
- 認証機能移管後に残っていた削除済み `/login` `/signup` へのリンクを修正（ログイン後に404になる不具合。#92）

## 2026-09-16（認証機能のauthアプリへの一元化、Phase C/E）
- ログイン・サインアップ・パスワード再設定・MFA・アカウント削除を `auth.saka2931.jp` へ移管。Sporive側のログイン関連ページ・`/auth/callback` `/auth/confirm`・関連コンポーネント・Turnstile依存と環境変数を削除（ADR-009）
- middleware：未ログイン/MFA未完了は auth へ `return_to` 付きで転送。プロフィール未登録は `/onboarding/profile`。端末の強制ログアウトを検知する `PushCleanupWatcher` を新設
- 表示名は auth の `/api/profile` 経由（`lib/authApp.ts`）。マジックリンクは廃止
- `service_role` に `sporive` スキーマの権限が無く、管理画面が500になる不具合を修正（`0033`、#91）
- **[Medium]** 管理者のTOTP登録が未必須で、パスワード1要素のみで `/api/admin/export` 等に到達できた点を修正（管理者ロールはTOTP登録を必須化）。`cleanup_old_notifications()` / `protect_admin_columns()` のEXECUTE権限が実DBで anon/authenticated に付与されたままだった点を再revoke（`0032`）
- 通知dispatch cronの宛先を旧 `sporive.vercel.app` から `sporive.saka2931.jp` に更新（`0034`）

## 2026-09-15
- メール+パスワードログインが、CAPTCHA（Turnstile）未実装のため常に失敗する重大な不具合を修正（のちに認証自体をauthアプリへ移管）

## 2026-09-14（AIレート制限）
- AI系エンドポイント（`propose-plan` / `improve-plan` / `recovery`）にユーザー単位・3エンドポイント合算（15回/60分）のレート制限を追加し、`improve-plan` の入力検証を強化（`0031`、ADR-008）

## 2026-09-15（全リポジトリ横断セキュリティ監査、security-reviewスキル）
- **[High]** `middleware.ts`は`/api/**`を認可チェックの対象外としているため、`/api/admin/export`（管理者向けCSVエクスポート）がAAL2(TOTP)未通過のセッションでも呼び出せてしまっていた。middlewareのMFA判定ロジックを移植した`requireAdminApiSession()`をルートハンドラ内に追加(PR #87)
- **[Medium]** `/api/notifications/subscribe`で、RLSに拒否された場合の共有端末対応フォールバック（service_roleでの`upsert`）が、既存の`endpoint`が別ユーザーの購読であっても無条件に上書きしてしまい、他ユーザーのプッシュ通知購読を悪意ある第三者が自分のものに付け替えられる状態だった。service_roleでの付け替え前に現在の所有者を確認し、他ユーザー所有の場合は409を返すよう修正(PR #88)
- 依存パッケージ（`brace-expansion`/`browserslist`/`js-yaml`）の既知脆弱性を解消(PR #88)

## 2026-09-14（コード監査ラウンド6・ロジック/正確性観点）
- 週次レポートの集計期間が1日分ズレていた不具合を修正（先週の日曜が漏れ、今日の実績が紛れ込む）
- 進捗画面「今週のトレーニング日数」がホーム/スケジュール画面と異なるローリング7日窓になっていた表示不整合を修正
- 生年バリデーションのCURRENT_YEARがUTC基準・モジュールロード時一度きり評価だったため、UTC大晦日の数時間だけ許容範囲が1年ズレる不具合を修正（既存のgetCurrentJstYear()に統一。PR #85）

## 2026-09-14（包括ドキュメント監査ラウンド3）
- `next`を16.2.10から16.3.5へパッチアップグレードし、critical脆弱性（Windows RCE・Image Optimization API経由のRCE等）を解消

## 2026-09-14
- **Googleカレンダー連携機能を全廃**。未検証のOAuthアプリが制限付きスコープ（`.../auth/calendar`）を要求していたため、Google Advanced Protection Program加入ユーザーがGoogleサインイン自体をブロックされる実障害（エラー400: policy_enforced）が発生。`calendar_tokens`テーブル・関連コード（`lib/calendar.ts`、AI提案のカレンダー参照、計画確定時の自動追加）を削除。週間予定の確認は既存の`/schedule`画面に一本化
- `sporive`スキーマの`anon`/`authenticated`ロールへのテーブルGRANT漏れを修正（`saka2931-service`統合時にRLSポリシーのみ移行し、GRANT文自体を再発行し忘れていたため、プロフィール登録が失敗する障害が発生していた）
- ドキュメント整理：README・development-plan.mdからカレンダー記述を削除、要件定義書・開発プラン・セットアップ手順をGitHub Wikiへ移行

## 2026-08-25
- MFA（TOTP、認証アプリ）をアカウント設定＞セキュリティ画面に実装（PR #67）

## 2026-08-24
- 通知送信トリガーを GitHub Actions scheduled workflow から **Supabase pg_cron + pg_net**（10分間隔）に移行。無料枠のGitHub Actionsでは混雑時に実測で数十分規模の遅延が発生していたため
- 通知機能を8-1〜8-4に再構成（種別ごとの時刻・ON/OFF、非通知時間帯・曜日、30日保持の定期クリーンアップ、お知らせ画面のタブ切替）
- 定期メンテナンスモード（毎日1:00〜2:30予告・2:30〜3:30制限）を新設
- 管理者権限を`is_admin`/`is_super_admin`の2段階に分離し、「高度な設定」画面（機能フラグ・お知らせ管理）を新設
- 認証セキュリティ強化計画を策定（JWT有効期限短縮・リフレッシュトークンローテーション・Turnstile・Resend・MFA等）

## セキュリティレビュー（継続的な再監査、3〜6回目）
- 3回目：`profiles.is_admin`/`is_super_admin`への自己権限昇格を防止、`workout_logs`の所有者検証の非対称性を修正（他人の計画IDを指定した実績ログ偽造を防止）、`site_announcements`のSELECTポリシーを`is_active`・`scheduled_at`でフィルタ（非公開・予約中のお知らせの先読みを防止）
- 4回目：`debts`のUPDATEポリシーを強化（`resolved_at`以外の列の改ざんを防止）、頻出クエリ向けインデックスを追加
- 5回目：`workout_logs`にDBレベルの一意制約を追加（連打・再送による重複ログ作成を防止）
- 6回目：`debts`にDBレベルの一意制約を追加（cron同時実行による重複記録を防止）
- 詳細は [ADR](ADR.md) ADR-007を参照

## 不具合修正
- `push_subscriptions`にUPDATEポリシーがなく、同一端末での再購読（`upsert`のUPDATE分岐）が失敗していた不具合を修正
- `push_subscriptions`の1年経過クリーンアップが`created_at`基準だったため、作成後一度も更新されず現役の購読が365日経過時点で無条件に削除されていた不具合を修正（5回目の再監査で発見。本来は「1年以上更新されていない」購読のみを削除する意図だった）
- `saveTrainingPlan`の週間計画保存が非アトミックな3ステップ（insert→insert→delete）で行われており、連打・再送・複数タブでの同時保存時に計画が重複したり、計画編集のたびに実績ログ・負債の紐付けが失われる問題を修正（5回目の再監査で発見）。`upsert_training_plan`というSupabase関数（[Development Plan Structure](Development-Plan-Structure.md) 参照）による単一トランザクションのUPSERTに置き換え、`(user_id, week_start_date)`の一意制約も追加

## 2026-08〜（試験運用フェーズ、Phase 7〜9）
- 負債管理・連続達成記録（ストリーク）を実装
- 運動強度の妥当性検証（ルールベース、年齢層別上限・週あたり増加率上限）を実装
- 管理者ダッシュボード（DAU/WAU・リテンション・負債発生率等）を実装

## saka2931.jpインフラ統合（時期は各リポジトリのPRを参照）
- お知らせ機能をadacの管理画面へ一元化（`saka2931-infra`の`service_announcements`参照に変更、Sporive独自の管理UIは削除）
- 機能フラグを`saka2931-infra`の`feature_flags`参照に変更（Sporive独自の管理UIは削除）
- 注意：上記infra統合前にローカルで運用していた`sporive.feature_flags`/`sporive.site_announcements`テーブル（`0014`・`0016〜0019`・`0028`で作成・変更）は、削除マイグレーションを発行しておらずDB上に残存している。特に`0028`で追加した`notice_code`（8桁公開ID）生成機構はコードから一切参照されておらず（実際の詳細表示は`service_announcements.id`ベースの`?notice=<id>`方式）、完全に未使用
- Cookieドメインを`.saka2931.jp`に変更し、legal-lifeとのSSOに対応
- お問い合わせを`service.saka2931.jp/contact/sporive`に集約
- プライバシーポリシー・利用規約を`service.saka2931.jp`のページに集約

## 2026-07-05〜2026-07-23（デモ版フェーズ、Phase 0〜6）
- プロジェクト基盤・認証（Google OAuth＋パスワード併用）・DBスキーマ・AIトレーニング提案（Gemini API）・進捗記録・Web Push通知を実装
- 目標入力を4択の選択式から自由記述（Gemini APIで整形して保存）に変更
- AI提案時に「今回の要望」（自由記述、最大300文字、保存はしない一時入力）を追加
- SEO・アクセス解析（Search Console、GTM経由のGA4、OGP・構造化データ・セキュリティヘッダー）を実装

## 未解決・今後の検討事項
- 独自ドメインの取得検討（現状`sporive.saka2931.jp`で解決済みのため実質クローズ、要件定義書の記述は履歴として残存）
- Phase 12（認証セキュリティ強化）のうちSupabase Dashboard設定・Turnstile・Resend導入は未完了（[Setup](Setup.md)の§7参照）
