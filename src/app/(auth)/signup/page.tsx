import type { Metadata } from "next";
import Link from "next/link";
import GoogleAuthButton from "@/components/auth/GoogleAuthButton";

export const metadata: Metadata = { title: "新規登録" };

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
      <p className="text-center text-sm text-navy-400">
        すでにアカウントをお持ちの方は{" "}
        <Link href="/login" className="font-medium text-navy-600 underline">
          ログイン
        </Link>
      </p>
    </div>
  );
}
