import type { Metadata } from "next";
import Link from "next/link";
import ResetPasswordForm from "@/components/auth/ResetPasswordForm";

export const metadata: Metadata = { title: "パスワード再設定" };

/** パスワードをお忘れの場合の自己申請フロー（requirements.md §4） */
export default function ResetPasswordPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-lg font-bold text-navy-800">
          パスワードをお忘れの場合
        </h2>
        <p className="mt-1 text-sm text-navy-400">
          登録済みのメールアドレスを入力してください。パスワード再設定用のリンクをお送りします。
        </p>
      </div>
      <ResetPasswordForm />
      <p className="text-center text-sm text-navy-400">
        <Link href="/login" className="font-medium text-navy-600 underline">
          ログインに戻る
        </Link>
      </p>
    </div>
  );
}
