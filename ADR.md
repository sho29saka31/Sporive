# Architecture Decision Records（Sporive）

主要な技術的意思決定の記録。詳細な経緯は [Requirements](Requirements) §15・[Development Plan](Development-Plan) §7も参照。

## ADR-001: 通知送信トリガーに Supabase pg_cron + pg_net を採用（2026-08-24）

- **状況**：当初Vercel Cron Jobsを検討したが無料プランで実行頻度・個別時刻指定に制限があり不採用。GitHub Actions scheduled workflowを採用したが、無料枠では混雑時に実測で数十分規模の遅延が発生
- **決定**：Supabase内部のPostgresから直接`pg_net`経由でVercelのdispatch APIを呼び出す方式（`pg_cron`、10分間隔）に移行
- **結果**：外部キュー待ちの影響を受けなくなった。副次効果として、10分おきのDBアクセスがSupabase無料プランの自動一時停止（7日間無アクティビティで発生）を防止している

## ADR-002: MFAはTOTPのみ採用、電話番号方式は不採用

- **状況**：Supabase AuthのMFAには認証アプリ(TOTP)方式と電話番号(Advanced MFA Phone)方式がある
- **決定**：TOTPのみ採用。電話番号方式は$75/月〜＋SMS従量課金で有料のため不採用
- **結果**：全プランで無料のままMFAを実現

## ADR-003: カスタムSMTP（Resend）への切り替え（未実装）

- **状況**：Supabase既定のメール送信は1時間あたり数通に制限され本番運用に不向き
- **決定**：Resend（無料枠3,000通/月・100通/日）をカスタムSMTPとして採用する方針を決定
- **結果**：`saka2931-service`共有のためlegal-lifeの認証メールにも同一設定が適用される見込み
- **現状**：本セッション終了時点で未実装（Phase 12、[Setup Security Hardening](Setup-Security-Hardening) 参照）。Cloudflare Turnstile導入も同様に未実装

## ADR-004: Googleカレンダー連携の全廃（2026-09-14）

- **状況**：`.../auth/calendar`（Restrictedスコープ）を要求する未検証OAuthアプリに対し、Google Advanced Protection Programが保護対象ユーザーのサインイン自体をブロック（エラー400: policy_enforced）。スコープを`calendar.freebusy`+`calendar.events`に narrowing する案も検討したが、Sensitiveスコープの検証（正当化理由＋デモ動画）が必要になる
- **代替案**：スコープ narrowing による検証継続 vs 機能の全廃
- **決定**：全廃。カレンダー連携が担っていた「週間予定の確認」は既存の`/schedule`画面で完全に代替可能と判断（既存機能との重複が判明）
- **結果**：残存スコープ（email/profile/openid）はGoogleの分類上「非センシティブ」のため審査不要になり、Advanced Protectionユーザーのブロックが即座に解消

## ADR-005: `saka2931-service`プロジェクトをlegal-lifeと共有し、スキーマで分離

- **状況**：SupabaseはFreeプランのプロジェクト数に上限があり、5サービス分を個別プロジェクトで持てない
- **決定**：Sporiveとlegal-lifeを`saka2931-service`という1プロジェクトに統合し、`sporive`/`legal_life`スキーマで論理分離
- **教訓（2026-09-14に判明）**：`public`スキーマはSupabaseが`anon`/`authenticated`ロールへのGRANTを自動付与するが、カスタムスキーマは自動付与されない。RLSポリシーだけを移行しGRANT文の再発行を忘れたため、両サービスでプロフィール登録が失敗する障害が発生した。以後、カスタムスキーマ作成時は必ずGRANT + `alter default privileges`をセットで発行する

## ADR-006: Gemini使用モデルは環境変数必須・デフォルト値を持たない

- **状況**：コード側にモデル名のデフォルト値を持たせると、特定モデルの混雑時に意図しないフォールバックが暗黙に発生しうる
- **決定**：`GEMINI_MODEL`環境変数を必須とし、未設定時はエラーとする
- **結果**：運用中のモデル変更が明示的になる（現在の設定値：`gemini-3.5-flash-lite`）

## ADR-007: RLSポリシーの継続的な再監査でカラム単位・状態単位の欠陥を段階的に修正

- **状況**：既存のRLSポリシー（`0005_rls_hardening.sql`）は基本的に行の所有者（`auth.uid() = id`等）のみをチェックしており、カラム単位・状態単位の制限がなかった。複数回にわたる再監査で以下を発見：
  1. **3回目**：`profiles`の`is_admin`/`is_super_admin`をログイン済み利用者が直接`true`に更新するだけで自分自身を管理者に昇格できた。`workout_logs`は`plan_item_id`が本人の`training_plans`に属するかを検証しておらず、他人の計画IDを指定した実績ログ偽造が可能だった。`site_announcements`のSELECTポリシーが`using (true)`で、非公開・予約中のお知らせを先読みできた
  2. **4回目**：`debts`のUPDATEポリシーが`auth.uid() = user_id`のみで、本人の負債行に対してであれば`resolved_at`以外の列（`plan_item_id`・`missed_on`・`sets_remaining`・`reps_remaining`）も自由に書き換えられ、消化量の改ざんや管理者集計・日次バッチの前提を崩しうる状態だった
  3. **5回目**：`workout_logs`にDBレベルの一意制約がなく、`logWorkout`の「事前SELECT→INSERT/UPDATE」がトランザクション保護されていないため、連打・オフライン復帰時の再送で同一利用者・同一種目・同一日のログが重複作成される競合状態があった
  4. **6回目**：`debts`も同様に`(user_id, plan_item_id, missed_on)`のDBレベル一意制約がなく、`daily-check.ts`の冪等性ガード（アプリ側のcheck-then-insert）だけでは、cronの同時実行（pg_netのリトライ等）で理論上重複記録が起こりうる状態だった
- **決定**：
  1. `protect_admin_columns()`（BEFORE INSERT/UPDATEトリガー）で`is_admin`/`is_super_admin`を`service_role`以外からは変更不可にする
  2. `workout_logs`のINSERT/UPDATEポリシーに`plan_item_id`の所有者検証`exists`句を追加
  3. `site_announcements`のSELECTポリシーを`is_active`・`scheduled_at`でフィルタ
  4. `debts`のUPDATEポリシーに、`resolved_at`以外の列が更新前の値と一致することを要求する`with check`を追加（PostgreSQLのRLSにUPDATE用のOLD参照がないため、行のidで自己結合して比較）
  5. `workout_logs`・`debts`にDBレベルの一意制約を追加し、アプリ側の非アトミックなcheck-then-insertをDB側でも保証する
- **結果**：行レベルの所有権チェックだけでは、権限昇格・偽装・非公開データの先読み・競合状態による重複を防げないという教訓（legal-lifeでも同種の脆弱性が別途発見・修正されている）。新しいテーブル・カラムを追加する際は、所有者本人が更新・参照してよい範囲をカラム単位・状態単位で検証し、check-then-insertパターンにはDBレベルの一意制約を併用する

## ADR-008: AI系エンドポイントにユーザー単位・全エンドポイント共有のレート制限を追加

- **状況**：コード監査で、`/api/ai/propose-plan`・`/api/ai/improve-plan`・`/api/ai/recovery`の3エンドポイントに呼び出し回数の制限が一切ないことが判明。認証済み利用者であれば、UIを介さず直接APIを連打することでGemini API呼び出しを際限なく発生させられ、「無料プランのみで運用する」という前提（要件定義書の重要な決定事項）を利用者側から突き崩せる状態だった
- **決定**：
  1. `sporive.ai_request_log`テーブルと、SECURITY DEFINER関数`sporive.check_and_log_ai_request(p_endpoint, p_max_requests default 15, p_window_minutes default 60)`を新設し、チェックと記録を単一のDB関数呼び出し内でアトミックに行う（`supabase/migrations/0031_ai_rate_limit.sql`）
  2. 上限は3エンドポイント合算のユーザー単位スライディングウィンドウとし、個別に上限を持たせない（1利用者が短時間に複数のAI機能を跨いで叩くケースも対象に含めるため）
  3. レート制限インフラ側の障害（DB接続エラー等）でAI機能全体を止めないよう、チェック自体が失敗した場合はフェイルオープン（許可）とする（`src/lib/ai-rate-limit.ts`）
  4. 上限到達時はHTTP 429で日本語エラーメッセージを返す
  5. `ai_request_log`の古いレコードを削除する`sporive.cleanup_old_ai_request_log()`と、既存の通知クリーンアップジョブ（`0 18 * * *`）に影響を与えないよう時刻をずらした専用cronジョブ`sporive-ai-request-log-cleanup`（`10 18 * * *`）を新設。既存の`cleanup_old_notifications()`関数は変更しない
- **結果**：AI機能の呼び出しコストに上限がかかり、要件定義書の「無料プランのみで運用する」という制約を利用者側の連打から守れるようになった。あわせて`improve-plan`エンドポイントの`currentPlan`（利用者からの入力をそのままGeminiプロンプトへ埋め込む）に配列長・文字列長・数値範囲の検証を追加し、巨大ペイロードによる単発リクエストあたりのコスト増大も防止した
