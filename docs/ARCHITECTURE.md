# Architecture（Sporive）

## 概要

Sporiveは、AIがパーソナライズしたトレーニング計画を提案する、スマホ専用のフィットネスPWA。Next.js（フロント＋API一体）とSupabase（DB）を中心に、すべて無料プランの範囲内で構成している。**ログイン・アカウント管理は `auth.saka2931.jp`（authリポジトリ）に一元化されており、Sporive自身は認証画面を持たない。**

## システム構成図（論理）

```
[利用者ブラウザ(スマホ)]        [管理者ブラウザ(PC/タブレット)]
        │                              │
        ▼                              ▼
   Next.js (Vercel, App Router)  ──── 同一デプロイ
        │  middleware.ts → updateSession()
        │     ├ 定期/緊急メンテナンス → /maintenance（rewrite・HTTP 503）
        │     ├ 未ログイン/MFA未完了 → auth.saka2931.jp へ return_to 付きで転送
        │     └ プロフィール未登録 → /onboarding/profile
        │
        ├── Route Handlers (src/app/api/*)
        │     ├─ /api/ai/{propose-plan,improve-plan,recovery}  → Gemini API
        │     ├─ /api/notifications/{subscribe,dispatch}       → Web Push (VAPID)
        │     ├─ /api/plan/validate    → ルールベース検証
        │     └─ /api/admin/export     → 管理者向けCSVエクスポート
        │
        ├── Supabase Auth (@supabase/ssr)  … セッションCookie(.saka2931.jp)はauthアプリが発行・共有
        │
        └── Supabase Postgres (saka2931-service プロジェクト, schema=sporive)
              ├─ profiles / training_plans / plan_items / workout_logs
              ├─ push_subscriptions / notification_settings / notification_logs
              ├─ debts / streaks / announcement_reads / ai_proposal_logs / ai_request_log
              ├─ pg_cron (10分間隔) → pg_net → /api/notifications/dispatch
              └─ RLS: maintenance_lockdown（緊急メンテナンス時にanon/authenticatedを拒否）

他システムとの連携:
   auth.saka2931.jp ── ログイン/登録/MFA/パスキー/アカウント削除、表示名 (GET/PATCH /api/profile)
   saka2931-infra プロジェクト (adac/statusと共有、読み取り専用)
     ├─ feature_flags         (機能フラグ。adacの管理画面から書き込み)
     └─ service_announcements (お知らせ。adacの管理画面から書き込み)
   service.saka2931.jp ── プライバシーポリシー・利用規約・お問い合わせ
   status.saka2931.jp  ── 稼働状況ページ（500/メンテナンス画面からリンク）
```

## リクエストの流れ（middleware）

`middleware.ts`（matcherは静的アセット・`robots.txt`・`sitemap.xml`・OGP画像などを除外）→ `src/lib/supabase/middleware.ts::updateSession()` が次の順で判定する。

1. **定期メンテナンス**（JST 2:30〜3:30）：`/privacy` `/terms` `/maintenance`・`/admin*`・`/api/*` 以外は `/maintenance` の画面を503で返す（トップ `/` も対象）
2. **緊急メンテナンス**（infraの`feature_flags`、`service='sporive'`）：同じ除外条件で `/maintenance` の画面を503で返す。稼働状況ページ（status）にはadac側のトリガーで「Sporiveの緊急メンテナンス」が自動で出入りする
3. `supabase.auth.getUser()` でセッション検証・更新
4. `/api/*` と静的パス（`/` `/privacy` `/terms` `/maintenance`）は認証判定をスキップ（APIは各Route Handlerが認証する。middlewareで転送するとfetchがJSONでなくHTMLを受け取るため）
5. 未ログイン → `https://auth.saka2931.jp/login?return_to=<現在のURL>`
6. TOTP登録済みでAAL2未達 → `auth.saka2931.jp/mfa-challenge?return_to=...`（通常はauth側で完結。保険として維持）
7. プロフィール（`sporive.profiles`）未登録 → `/onboarding/profile`。確認結果は `sporive-onboarded` Cookie（値=user.id）にキャッシュし、以降のDB往復を省く

## 主要な設計判断

- **フロントとAPIの一体化**：Next.js App RouterのRoute Handlersでサーバー処理を実装し、別バックエンドを持たない
- **認証はauthアプリに委譲**：Sporiveが持つのは「未ログインなら転送」と、アプリ固有データ（生年・目標・性別・権限）だけ。表示名は `lib/authApp.ts` が auth の `/api/profile` を呼んで読み書きする（Cookieをサーバー間fetchに転送）。詳細は [ADR](ADR.md) ADR-009
- **グラフ描画にRecharts**：進捗ログ・管理者ダッシュボードのグラフはRechartsで実装
- **PWA**：Web Push受信のため`next-pwa`等のプラグインは使わず、Service Worker（`public/sw.js`）を手書きで管理。キャッシュ戦略は持たず（`fetch`イベントリスナーなし）、`install`時に無条件`skipWaiting()`・`activate`時に`clients.claim()`する「即時更新・キャッシュなし」方式（本番ビルド時のみ、`window.load`後に遅延登録）。`push`イベントは`payload.title`/`body`/`url`を受け取り`icon`/`badge`は`/icons/icon-192.png`固定で表示、`notificationclick`は既存クライアントがあれば`navigate()`+`focus()`、無ければ`openWindow()`
- **スキーマ分離によるマルチテナント**：`saka2931-service`プロジェクトを legal-life・auth と共有し、`sporive`/`legal_life`/`auth_app`スキーマで論理分離（RLS + スキーマ単位のGRANTで越境アクセスを防止）
- **共有インフラの読み取り専用参照**：機能フラグ・お知らせは`saka2931-infra`（adac/statusと共有）のanonキー読み取り専用クライアント（`lib/supabase/infra.ts`）経由で取得。書き込みはadacの管理画面のみに限定
- **通知トリガーはDB内部完結**：Supabase pg_cron + pg_netにより、外部のスケジューラ（GitHub Actions等）に依存せず、Postgres自身が10分おきにVercelのAPIを呼び出す。無料プランでの実行遅延問題を解消
- **機能フラグの既定値**：`getFeatureFlags`は取得失敗時に「有効」を既定値とする（障害時に誤って機能停止しないため）。緊急メンテナンスだけは「無効」（=止めない）を既定値とする（誤って全サイトを止めないため）。いずれもフェイルオープン
- **緊急メンテナンスの二重化**：ページ転送（middleware）に加え、`saka2931-service` のRLS（`maintenance_lockdown`）がanon/authenticatedの直接アクセスを拒否する。管理者（`is_admin`/`is_super_admin`）とservice_roleは対象外。詳細は auth の `docs/ARCHITECTURE.md`

## 認証・SSOアーキテクチャ

- ログイン・サインアップ・パスワード再設定・MFA・パスキー・アカウント削除は **auth.saka2931.jp** が担当（Sporiveの旧 `/login` `/signup` `/auth/*` 等は削除済み）
- Cookieドメインは `.saka2931.jp`（`secure`, `sameSite=lax`）。auth・legal-lifeとセッションを共有し、SSOはSupabaseプロジェクトURLが同一であることのみに依存する
- 戻り先は auth の `resolveReturnTo()` が検証する。Sporive側は `buildAuthAppUrl()` / `buildLoginUrl()` / `buildSignupUrl()`（`lib/authApp.ts`）で `return_to` 付きURLを組み立てる
- 管理者判定：`requireAdminApiSession()` と `admin/layout.tsx` が、リクエストごとに `sporive.profiles` の `is_admin`・`is_super_admin` を読んで判定する（JWTクレームは使わないため、権限の付与・削除は次のリクエストから反映される。`sporive.custom_access_token_hook` はDBに残っているが、アプリのコードは参照しない）。管理者向けAPIは `requireAdminApiSession()` が **管理者のTOTP登録とAAL2を必須**として検証する（`/api/*` はmiddlewareの対象外のため）。画面側は、TOTP登録済みでAAL2未達の利用者をmiddlewareがauthの`/mfa-challenge`へ転送し、`admin/layout.tsx` が `is_admin`/`is_super_admin` を確認する
- 端末管理：`PushCleanupWatcher` が `auth_app.sessions` をSporive側でも登録・監視し、強制ログアウトを検知するとpush購読を削除してからサインアウトする

## SEO・公開ページ

- 公開対象は `/`（トップ）・`/terms`・`/privacy`。`/terms` `/privacy` は `service.saka2931.jp` の同名ページへのリダイレクト
- `robots.ts`：上記以外（`/home` `/schedule` `/progress` `/menu` `/debts` `/settings` `/admin` `/api` `/onboarding`）をDisallow、サイトマップは `sitemap.ts`（トップのみ）
- OGP画像は `opengraph-image.tsx`（`lib/og-image.tsx`で生成）、メタデータの基準URLは `https://sporive.saka2931.jp`
- エラー画面：`not-found.tsx`（404）・`error.tsx`/`global-error.tsx`（500系、`ErrorPage`共通部品）・`maintenance/page.tsx`（503）。500とメンテナンスには稼働状況ページへのリンクを表示

## ディレクトリ構成

```
sporive/
├── middleware.ts            # updateSession() の入口とmatcher
├── supabase/migrations/     # SQLマイグレーション（番号順に手動適用）
├── public/                  # PWAマニフェスト・アイコン・Service Worker
├── docs/                    # 要件定義・開発プラン・セットアップ・標準ドキュメント
└── src/
    ├── app/
    │   ├── (auth)/          # /onboarding/profile（アプリ固有プロフィールの登録のみ）
    │   ├── (user)/          # 利用者画面（スマホ専用）
    │   ├── admin/           # 管理者画面（PC・タブレット専用）
    │   ├── maintenance/     # メンテナンス表示
    │   ├── privacy/ terms/  # serviceへのリダイレクト
    │   └── api/             # Route Handlers
    ├── components/
    └── lib/                 # Supabase / Gemini / Push / authApp / feature-flags / maintenance
```

詳細な機能仕様は [Requirements](Requirements.md) を、フェーズ別の実装経緯は [Development Plan](Development-Plan.md) を参照。
