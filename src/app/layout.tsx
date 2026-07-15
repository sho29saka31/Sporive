import type { Metadata, Viewport } from "next";
import { Noto_Sans_JP } from "next/font/google";
import { GoogleTagManager } from "@next/third-parties/google";
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
  title: {
    default: "Sporive",
    template: "%s | Sporive",
  },
  description:
    "AIによるパーソナライズされたトレーニング計画を提案するフィットネスPWA",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Sporive",
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
            {/* JS無効時のフォールバック（Googleの標準スニペット通り、body直後に設置） */}
            <noscript>
              <iframe
                src={`https://www.googletagmanager.com/ns.html?id=${GTM_CONTAINER_ID}`}
                height="0"
                width="0"
                style={{ display: "none", visibility: "hidden" }}
              />
            </noscript>
            <GoogleTagManager gtmId={GTM_CONTAINER_ID} />
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
