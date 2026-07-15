import type { Metadata } from "next";
import Link from "next/link";
import GoogleAuthButton from "@/components/auth/GoogleAuthButton";

const TITLE = "新規登録";
const DESCRIPTION =
  "Sporiveに登録して、あなたの目標・年齢・体力に合わせたAIトレーニング計画を始めましょう。";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "https://sporive.vercel.app/signup" },
  // ログイン不要でアクセスできる公開ページのため、検索経由で直接たどり着けるようにする
  robots: { index: true, follow: true, noarchive: true },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: "https://sporive.vercel.app/signup",
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

/**
 * アカウント作成（requirements.md §4）。
 * Google OAuth のみで開始し、同意画面でカレンダーへのアクセス許可も求める。
 * OAuth後のパスワード設定は /signup/set-password（middlewareが自動誘導）。
 */
export default function SignupPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-lg font-bold text-navy-800">新規登録</h2>
        <p className="mt-1 text-sm text-navy-400">
          Googleアカウントで登録します。カレンダーへのアクセス許可もあわせて求められます。
        </p>
      </div>
      <GoogleAuthButton label="Googleで始める" consentPrompt />
      <p className="text-center text-xs text-navy-300">
        登録することで、
        <Link href="/terms" className="underline">
          利用規約
        </Link>
        および
        <Link href="/privacy" className="underline">
          プライバシーポリシー
        </Link>
        に同意したものとみなされます。
      </p>
      <p className="text-center text-sm text-navy-400">
        すでにアカウントをお持ちの方は{" "}
        <Link href="/login" className="font-medium text-navy-600 underline">
          ログイン
        </Link>
      </p>
    </div>
  );
}
