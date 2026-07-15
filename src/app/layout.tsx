import type { Metadata, Viewport } from "next";
import { Noto_Sans_JP } from "next/font/google";
import { Suspense } from "react";
import ServiceWorkerRegister from "@/components/ServiceWorkerRegister";
import GtmPageview from "@/components/GtmPageview";
import "./globals.css";

const GTM_CONTAINER_ID = process.env.NEXT_PUBLIC_GTM_CONTAINER_ID;

const notoSansJp = Noto_Sans_JP({
  variable: "--font-noto-sans-jp",
  subsets: ["latin"],
  // アプリ内で実際に使用しているウェイトのみに限定し、生成・配信されるフォントファイルを削減する
  weight: ["400", "500", "700"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://sporive.vercel.app"),
  title: {
    default: "Sporive",
    template: "%s | Sporive",
  },
  description:
    "AIによるパーソナライズされたトレーニング計画を提案するフィットネスPWA",
  applicationName: "Sporive",
  keywords: [
    "トレーニング",
    "フィットネス",
    "AI",
    "パーソナライズ",
    "ワークアウト管理",
    "運動記録",
    "PWA",
  ],
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Sporive",
  },
  // トレーニング記録の重量・回数等の数字が、iOS Safari等で電話番号として
  // 自動リンク化されるのを防ぐ
  formatDetection: {
    telephone: false,
  },
  verification: {
    google: "Oi-fSlcoKbljQWcxJniM5N46R0yIDSow6zPFkx3eemE",
  },
  // 既定は非公開扱い（noindex）。公開ページ（/, /terms, /privacy）は各ページのmetadataで上書きする。
  // noarchive/nosnippetはnoindexなら実質no-opだが、robots.txtと同様の二重対策として明示する
  robots: {
    index: false,
    follow: false,
    nosnippet: true,
    noarchive: true,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#1b3049",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja" className={`${notoSansJp.variable} h-full antialiased`}>
      <body className="min-h-full font-sans">
        {GTM_CONTAINER_ID && (
          <>
            {/*
              App Routerのroot layoutに手動で<head>を追加しても、Next.jsの
              メタデータ生成が上書きしてしまい初期HTMLに反映されない。
              また next/script はstrategyに関わらずハイドレーション後に
              クライアント側でDOM挿入されるケースがあり、いずれもSearch Consoleの
              「Google タグ マネージャー」による所有権確認が
              「スニペットが正しい場所に配置されていない」で失敗する原因になる。
              <body>直下に生のscriptタグとして出力すれば、Next.jsの
              読み込み戦略に関係なく必ず初期HTMLに含まれる。
            */}
            {/* eslint-disable-next-line @next/next/next-script-for-ga -- 上記コメントの通り意図的 */}
            <script
              dangerouslySetInnerHTML={{
                __html: `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
                  new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
                  j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
                  'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
                  })(window,document,'script','dataLayer','${GTM_CONTAINER_ID}');`,
              }}
            />
            {/* JS無効時のフォールバック（Googleの標準スニペット通り、body直後に設置） */}
            <noscript>
              <iframe
                src={`https://www.googletagmanager.com/ns.html?id=${GTM_CONTAINER_ID}`}
                height="0"
                width="0"
                style={{ display: "none", visibility: "hidden" }}
              />
            </noscript>
            <Suspense fallback={null}>
              <GtmPageview />
            </Suspense>
          </>
        )}
        <ServiceWorkerRegister />
        {children}
      </body>
    </html>
  );
}
