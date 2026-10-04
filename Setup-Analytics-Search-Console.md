# Setup: Analytics & Search Console（Sporive）

[Setup](Setup) の一部。Google Tag Manager経由のGoogle Analytics（GA4）計測、Google Search Consoleへのサイト登録手順（[Requirements SEO Analytics](Requirements-SEO-Analytics) 参照）。

## 1. Google Tag Manager（GTM）

1. https://tagmanager.google.com/ で新規コンテナを作成（プラットフォーム: ウェブ、コンテナ名は任意）
2. 発行されたコンテナID（`GTM-XXXXXXX`）を`NEXT_PUBLIC_GTM_CONTAINER_ID`としてVercelに設定（[Setup Vercel](Setup-Vercel) 参照）
3. GTM管理画面 → 「タグ」→ 新規作成 → タグの種類「Google アナリティクス: GA4 設定」を選択し、GA4の測定ID（`G-...`、2で取得）を入力
4. トリガーは「All Pages」を選択
5. 公開（Submit）し、GTMのプレビューモードでタグが正しく発火することを確認

SPA（クライアントサイド遷移）のため、ルート変更時にアプリ側が`dataLayer.push({ event: "page_view", ... })`でカスタムイベントを送信し、GTM側のトリガーでページビューを計測する仕組みになっている（実装済み、追加設定不要）。

## 2. Google Analytics（GA4）プロパティの作成

1. https://analytics.google.com/ でアカウント・プロパティを新規作成（プロパティ名: Sporive、タイムゾーン: 日本、通貨: 日本円）
2. 「ウェブ」のデータストリームを追加し、ウェブサイトURL（`https://sporive.saka2931.jp`）を登録
3. 発行された測定ID（`G-...`）を、上記1-3のGTM設定に使用する

## 3. Google Search Console

1. https://search.google.com/search-console/ で新しいプロパティを追加（プロパティタイプ: URLプレフィックス、`https://sporive.saka2931.jp`）
2. 所有権の確認方法として **「HTMLタグ」** 方式を選択する
   - 「Google タグ マネージャー」方式は、Next.js App RouterではGTMスニペットの厳密な設置要件（`<head>`直下への設置・`<body>`直後にコメント以外を挟まないこと）を満たせないため使用しない
3. 発行される`<meta name="google-site-verification" content="...">`のcontent値を、アプリのmetadata設定に反映する（Claudeに依頼して`layout.tsx`等に追加する）
4. デプロイ後、Search Console側で「確認」を実行
5. 左メニュー **サイトマップ** から `sitemap.xml` を送信する（Next.jsのMetadata Route機能で自動生成されるため、追加実装は不要）

### 既知の制約

無料の共有Vercelサブドメイン（例：`xxx.vercel.app`）で運用していた期間は、Googleのクロール優先度が下がる傾向があり、サイトマップの読み込みに時間がかかっていた。現在は独自ドメイン（`sporive.saka2931.jp`）に移行済みのため、この制約は解消している。

## トラブルシューティング

- **GTMのプレビューモードでタグが発火しない**：`NEXT_PUBLIC_GTM_CONTAINER_ID`がVercelに設定されRedeploy済みか確認
- **Search Consoleで「所有権を確認できません」と表示される**：metaタグの値が正しく反映されデプロイされているか、ブラウザの「ページのソースを表示」で確認
- **サイトマップが「取得できませんでした」と表示される**：`https://sporive.saka2931.jp/sitemap.xml`に直接アクセスして正しいXMLが返るか確認
