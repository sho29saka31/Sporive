import type { Metadata } from "next";
import Link from "next/link";
import GoogleAuthButton from "@/components/auth/GoogleAuthButton";
import PasswordLoginForm from "@/components/auth/PasswordLoginForm";
import AuthRecoveryHandler from "@/components/auth/AuthRecoveryHandler";
import MagicLinkForm from "@/components/auth/MagicLinkForm";

const TITLE = "ログイン";
const DESCRIPTION =
  "Sporiveにログインして、AIパーソナライズトレーニング計画を確認・記録しましょう。";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "https://sporive.vercel.app/login" },
  // ログイン不要でアクセスできる公開ページのため、検索経由で直接たどり着けるようにする
  robots: { index: true, follow: true, noarchive: true },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: "https://sporive.vercel.app/login",
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
 * ログイン（requirements.md §4）：Google OAuth またはメール＋パスワード。
 * `?code=` 付きで届いた場合の /auth/callback への転送は middleware が行う。
 */
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <AuthRecoveryHandler initialError={error === "invalid_link"}>
      <div className="flex flex-col gap-6">
        <h2 className="text-lg font-bold text-navy-800">ログイン</h2>
        <GoogleAuthButton label="Googleでログイン" />
        <div className="flex items-center gap-3 text-xs text-navy-300">
          <div className="h-px flex-1 bg-navy-100" />
          または
          <div className="h-px flex-1 bg-navy-100" />
        </div>
        <PasswordLoginForm />
        <p className="text-center text-xs text-navy-400">
          <Link
            href="/reset-password"
            className="font-medium text-navy-600 underline"
          >
            パスワードをお忘れですか？
          </Link>
        </p>
        <MagicLinkForm />
        <p className="text-center text-sm text-navy-400">
          アカウントをお持ちでない方は{" "}
          <Link href="/signup" className="font-medium text-navy-600 underline">
            新規登録
          </Link>
        </p>
      </div>
    </AuthRecoveryHandler>
  );
}
