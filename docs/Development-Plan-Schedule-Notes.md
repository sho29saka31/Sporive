# Development Plan: Schedule & Notes（Sporive）

[Development Plan](Development-Plan.md) の一部。スケジュール目安・実装時の判断メモ(§6, §7)。

## 6. スケジュール目安（7月デモ版、策定時点）

| 週 | フェーズ |
|---|---|
| 7/7 週 | Phase 0 → Phase 1 |
| 7/13 週 | Phase 2 → Phase 3 |
| 7/20 週 | Phase 4 → Phase 5 |
| 7/27 週 | Phase 6・統合テスト・デモ準備（バッファ） |

Phase 7以降（8月試験運用・追加計画フェーズ）は週単位のスケジュールを定めず、要件の確定・実装完了順に進めた。

## 7. 実装時の判断メモ

- 通知トリガーは当初「GitHub Actions scheduled workflow」だったが、無料枠での遅延が大きく（実測で数十分規模）、[CHANGELOG](CHANGELOG.md)（2026-08-24）のとおり **Supabase pg_cron + pg_net** に移行した
- タイムゾーンは Asia/Tokyo を既定とし、通知時刻判定は `notification_settings.timezone` で将来拡張可能にした
- Gemini のモデル名は`GEMINI_MODEL`環境変数で指定する。コード側にデフォルト値は持たせず、未設定時はエラーとする（特定モデルの混雑時に暗黙のフォールバックへ切り替わらないようにするため）
- シニア判定の年齢閾値は65歳とした（要件定義書に明記がないため実装時に決定。低強度中心のAIプロンプトへの切り替えに使用）
- Supabaseの`identities`はメール/パスワードをOAuth登録後に`updateUser`で後付けしても更新されないため、パスワード設定済みかどうかの判定は`user_metadata.password_set`フラグで行う（Phase 1実装時に判明した仕様）
- `/api/*` はmiddlewareのルートガード対象外とし、認証チェックは各Route Handler自身に委ねる（middlewareでリダイレクトすると、APIの`fetch`呼び出しがJSONではなくHTMLリダイレクト応答を受け取ってしまうため）
- pg_cronジョブ（Phase 5、`0009_notify_pg_cron.sql`）が10分おきにSupabase内部からdispatch APIを呼び出し、その都度実際にSELECTクエリが発行されるため、副次的にSupabase無料プランの自動一時停止（7日間アクティビティなしで発生）を防止できている
- pg_net の `net.http_post` はデフォルトタイムアウトが2000msと短く、dispatch APIは対象利用者数分のDB問い合わせ・push送信を順に行うため超過しうる。`timeout_milliseconds := 15000` を明示指定して余裕を持たせている
- middlewareの認証ガード（`updateSession`）は、静的アセット・画像・favicon・SEO関連ルート（`robots.txt`・`sitemap.xml`・OGP画像・`apple-touch-icon`・ロゴ画像等）を除外パターンに含める必要がある。これらは未ログインの検索エンジン・SNSクローラーが直接アクセスするほか、`next/image`の最適化エンドポイントも内部的に同じパスへリクエストするため、除外しないと認証ガードに引っかかり`/login`へリダイレクトされる。実際にSearch Consoleのサイトマップ読み込みがHTMLとして失敗する不具合、ロゴ画像が`next/image`で読み込めない不具合として発覚し、修正した
