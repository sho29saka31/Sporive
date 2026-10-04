# Requirements: SEO & Analytics（Sporive）

[Requirements](Requirements.md) の一部。SEO・アクセス解析(要件定義書 §13)。

## 13-1. 検索エンジン最適化（SEO）
- 認証必須ページ（ログイン後のみアクセスするページ）は`robots: { index: false, follow: false }`でnoindex。公開ページ（トップ・利用規約・プライバシーポリシー・ログイン・新規登録）のみ検索エンジンに公開する
- `robots.txt`・`sitemap.xml`をNext.jsのMetadata Route機能で生成し、Search Consoleに送信する
- 各公開ページにOGP・Twitter Card用の1200×630画像を自動生成する（アプリのアイコンデザインを反映）
- トップページに構造化データ（JSON-LD、SoftwareApplication schema）を追加する
- HTTPセキュリティヘッダー（`X-Content-Type-Options`・`X-Frame-Options`・`Referrer-Policy`・`Permissions-Policy`）を追加する

## 13-2. Google Search Console
- サイト所有権確認は「HTMLタグ」方式（`<meta name="google-site-verification">`）を採用する
  - 当初「Google タグ マネージャー」方式を検討したが、Next.js App RouterではGTMスニペットの厳密な設置要件（`<head>`直下への設置・`<body>`直後にコメント以外を挟まないこと）を満たせないため断念した
- **既知の制約（策定当時）**：当時使用していたVercelの無料共有サブドメイン（`sporive.vercel.app`）はGoogleのクロール優先度が下がる傾向があり、Search Console上でサイトマップが正しく読み込まれるまで時間がかかっていた（サーバー側の応答自体は正しいことを確認済み）。現在は独自ドメイン（`sporive.saka2931.jp`）に移行済みのため、この制約は解消している

## 13-3. アクセス解析
- Google Tag Manager（GTM）経由でGoogle Analytics（GA4）を計測する
- SPA（クライアントサイド遷移）のため、ルート変更時に`dataLayer.push({ event: "page_view", ... })`でカスタムイベントを送信し、GTM側のトリガーでページビューを計測する
