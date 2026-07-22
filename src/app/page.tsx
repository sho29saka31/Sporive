import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { headers, cookies } from "next/headers";
import QRCode from "qrcode";
import { isSmartphone } from "@/lib/device";

const SITE_URL = "https://sporive.vercel.app/";

const TITLE = "Sporive — AIパーソナライズ・トレーニング計画アプリ";
const DESCRIPTION =
  "Sporiveは、あなたの目標・年齢・体力に合わせてAIが週間トレーニング計画を提案するフィットネスPWAです。進捗記録、達成通知、Googleカレンダー連携で、無理なく続けられるトレーニング習慣をサポートします。";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "https://sporive.vercel.app/" },
  robots: { index: true, follow: true, noarchive: true },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: "https://sporive.vercel.app/",
    siteName: "Sporive",
    locale: "ja_JP",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
  },
};

const FEATURES = [
  {
    title: "AIパーソナライズ計画",
    description:
      "目標（減量・増量・筋力向上・シニア向け維持）と生年・性別をもとに、AIが1週間分のトレーニング計画を自動で提案します。",
  },
  {
    title: "進捗の記録とグラフ",
    description:
      "セット数・回数・重量・時間を記録し、回数や重量の推移をグラフで可視化。トレーニング頻度や連続達成日数も一目で確認できます。",
  },
  {
    title: "リマインダー通知",
    description:
      "その日のトレーニング予定を指定した時刻にプッシュ通知でお知らせ。やり残しがあるときはリマインドで取り返しをサポートします。",
  },
  {
    title: "Googleカレンダー連携",
    description:
      "カレンダーの予定を考慮してAIが無理のない日程を提案。確定した計画は自動でGoogleカレンダーに追加されます。",
  },
  {
    title: "負債管理・ストリーク",
    description:
      "達成できなかった分を「負債」として翌日以降に補填。連続達成記録（ストリーク）でモチベーションを維持します。",
  },
  {
    title: "運動強度の安全チェック",
    description:
      "年齢層に応じた推奨範囲をもとに、過度な重量・回数・急な負荷増加を自動でチェックし、無理のないトレーニングを促します。",
  },
];

const STEPS = [
  {
    step: "1",
    title: "Googleアカウントで登録",
    description: "数タップで登録完了。目標と簡単なプロフィールを入力します。",
  },
  {
    step: "2",
    title: "AIが計画を提案",
    description: "あなたに合った1週間分のトレーニング計画をAIが作成します。",
  },
  {
    step: "3",
    title: "記録して続ける",
    description:
      "実施した内容を記録し、通知と進捗グラフで習慣化をサポートします。",
  },
];

const STRUCTURED_DATA = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Sporive",
  applicationCategory: "HealthApplication",
  operatingSystem: "Web",
  description: DESCRIPTION,
  url: "https://sporive.vercel.app/",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "JPY",
  },
};

/**
 * 公開ランディングページ（トップページ）。
 * サービスの機能紹介を掲載し、Google OAuth審査で求められるホームページとしても機能する。
 * 未ログインでも閲覧可能（middlewareのPUBLIC_PATHSに"/"を含める）。
 * 利用はスマホ専用のため、スマホ以外（?demo-mobile-adminによるプレビュー中を除く）では
 * ログイン・新規登録ボタンの代わりにQRコードを表示し、スマホでの利用を促す。
 */
export default async function LandingPage() {
  const userAgent = (await headers()).get("user-agent") ?? "";
  const forceMobilePreview =
    (await cookies()).get("force-mobile-preview")?.value === "1";
  const canUseButtons = isSmartphone(userAgent) || forceMobilePreview;

  const qrDataUrl = canUseButtons
    ? null
    : await QRCode.toDataURL(SITE_URL, {
        margin: 1,
        width: 200,
        color: { dark: "#132338", light: "#ffffff" },
      });

  return (
    <div className="min-h-dvh bg-white text-navy-800">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(STRUCTURED_DATA) }}
      />
      {/* ヘッダー */}
      <header className="border-b border-navy-100">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <Image src="/logo-wordmark.png" alt="Sporive" width={112} height={47} priority />
          {canUseButtons && (
            <Link
              href="/login"
              className="rounded-lg bg-navy-700 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-navy-600"
            >
              ログイン / 新規登録
            </Link>
          )}
        </div>
      </header>

      {/* ヒーロー */}
      <section className="bg-navy-800 text-white">
        <div className="mx-auto max-w-5xl px-6 py-20 text-center">
          <h1 className="text-3xl font-bold leading-tight sm:text-4xl">
            AIがあなたに合わせて
            <br className="sm:hidden" />
            トレーニング計画を提案
          </h1>
          <p className="mx-auto mt-4 max-w-2xl leading-relaxed text-navy-100">
            Sporive（スポライブ）は、目標・年齢・体力に合わせてAIが週間トレーニング計画を作成するフィットネスPWAです。
            記録・通知・カレンダー連携で、無理なく続けられるトレーニング習慣をサポートします。
          </p>
          {canUseButtons ? (
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                href="/signup"
                className="w-full rounded-lg bg-accent-sky px-6 py-3 text-sm font-bold text-navy-900 transition-opacity hover:opacity-90 sm:w-auto"
              >
                無料で始める
              </Link>
              <Link
                href="/login"
                className="w-full rounded-lg border border-navy-100/40 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-navy-700 sm:w-auto"
              >
                ログイン
              </Link>
            </div>
          ) : (
            qrDataUrl && (
              <div className="mt-8 flex flex-col items-center gap-3">
                <div className="rounded-xl bg-white p-4">
                  {/* eslint-disable-next-line @next/next/no-img-element -- QRCode.toDataURLが返すdata URIのためnext/imageの対象外 */}
                  <img
                    src={qrDataUrl}
                    alt="スマートフォンでSporiveを開くためのQRコード"
                    width={200}
                    height={200}
                  />
                </div>
                <p className="text-sm text-navy-100">
                  スマートフォンのカメラでQRコードを読み取って開いてください
                </p>
              </div>
            )
          )}
          <p className="mt-4 text-xs text-navy-200">
            スマートフォンでの利用のみ可能です。
          </p>
          {!canUseButtons && (
            <p className="mt-1 text-[10px] text-navy-300">
              QRコードは株式会社デンソーウェーブの登録商標です。
            </p>
          )}
        </div>
      </section>

      {/* 機能一覧 */}
      <section className="mx-auto max-w-5xl px-6 py-16">
        <h2 className="text-center text-2xl font-bold">主な機能</h2>
        <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((feature) => (
            <div
              key={feature.title}
              className="rounded-xl border border-navy-100 p-6 shadow-sm"
            >
              <h3 className="text-base font-bold text-navy-800">
                {feature.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-navy-500">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* 使い方 */}
      <section className="bg-navy-50">
        <div className="mx-auto max-w-5xl px-6 py-16">
          <h2 className="text-center text-2xl font-bold">使い方は3ステップ</h2>
          <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-3">
            {STEPS.map((step) => (
              <div key={step.step} className="text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-navy-700 text-lg font-bold text-white">
                  {step.step}
                </div>
                <h3 className="mt-4 text-base font-bold text-navy-800">
                  {step.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-navy-500">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      {canUseButtons && (
        <section className="mx-auto max-w-5xl px-6 py-16 text-center">
          <h2 className="text-2xl font-bold">今日からトレーニングを習慣に</h2>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-navy-500">
            登録は無料です。Googleアカウントですぐに始められます。
          </p>
          <Link
            href="/signup"
            className="mt-6 inline-block rounded-lg bg-navy-700 px-8 py-3 text-sm font-bold text-white transition-colors hover:bg-navy-600"
          >
            無料で始める
          </Link>
        </section>
      )}

      {/* フッター */}
      <footer className="border-t border-navy-100">
        <div className="mx-auto max-w-5xl px-6 pt-8">
          <Image
            src="/logo-horizontal.png"
            alt="Sporive"
            width={280}
            height={99}
            className="mx-auto h-auto w-64 sm:w-72"
          />
        </div>
        <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-4 px-6 py-8 text-xs text-navy-400 sm:flex-row">
          <span>© {new Date().getFullYear()} Sporive</span>
          <nav className="flex items-center gap-4">
            <Link href="/terms" className="underline hover:text-navy-600">
              利用規約
            </Link>
            <Link href="/privacy" className="underline hover:text-navy-600">
              プライバシーポリシー
            </Link>
            {canUseButtons && (
              <Link href="/login" className="underline hover:text-navy-600">
                ログイン
              </Link>
            )}
          </nav>
        </div>
      </footer>
    </div>
  );
}
