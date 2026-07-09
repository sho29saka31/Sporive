import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import GoogleAuthButton from "@/components/auth/GoogleAuthButton";
import PasswordLoginForm from "@/components/auth/PasswordLoginForm";
import AuthRecoveryHandler from "@/components/auth/AuthRecoveryHandler";
import MagicLinkForm from "@/components/auth/MagicLinkForm";

export const metadata: Metadata = { title: "ログイン" };

/** ログイン（requirements.md §4）：Google OAuth またはメール＋パスワード */
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; code?: string; type?: string }>;
}) {
  const { error, code, type } = await searchParams;

  // 過去に送信済みのメール（/auth/callback対応前）が /login?code=... を指している場合の
  // 救済。/auth/callback にそのまま転送し、PKCEのcode交換を行う。
  if (code) {
    const params = new URLSearchParams({ code });
    if (type) params.set("type", type);
    redirect(`/auth/callback?${params.toString()}`);
  }

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
