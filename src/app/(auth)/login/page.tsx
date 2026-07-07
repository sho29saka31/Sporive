import type { Metadata } from "next";
import Link from "next/link";
import GoogleAuthButton from "@/components/auth/GoogleAuthButton";
import PasswordLoginForm from "@/components/auth/PasswordLoginForm";

export const metadata: Metadata = { title: "ログイン" };

/** ログイン（requirements.md §4）：Google OAuth またはメール＋パスワード */
export default function LoginPage() {
  return (
    <div className="flex flex-col gap-6">
      <h2 className="text-lg font-bold text-navy-800">ログイン</h2>
      <GoogleAuthButton label="Googleでログイン" />
      <div className="flex items-center gap-3 text-xs text-navy-300">
        <div className="h-px flex-1 bg-navy-100" />
        または
        <div className="h-px flex-1 bg-navy-100" />
      </div>
      <PasswordLoginForm />
      <p className="text-center text-sm text-navy-400">
        アカウントをお持ちでない方は{" "}
        <Link href="/signup" className="font-medium text-navy-600 underline">
          新規登録
        </Link>
      </p>
    </div>
  );
}
