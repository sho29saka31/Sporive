import type { Metadata } from "next";
import Link from "next/link";
import { signOut } from "./actions";

export const metadata: Metadata = { title: "アカウント設定" };

const MENU = [
  {
    href: "/settings/account/profile",
    title: "プロフィール",
    description: "表示名・生年・性別・目標",
  },
  {
    href: "/settings/account/security",
    title: "セキュリティ",
    description: "メールアドレス・パスワード・セッション・アカウント削除",
  },
  {
    href: "/settings/account/notifications",
    title: "通知",
    description: "プッシュ通知の購読・当日予定通知・負債リマインダー",
  },
];

/** アカウント設定のハブ。各設定ページへの入口（requirements.md §4） */
export default function AccountSettingsPage() {
  return (
    <div className="py-6">
      <h1 className="text-xl font-bold">アカウント設定</h1>

      <div className="mt-4 flex flex-col gap-3">
        {MENU.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            prefetch={false}
            className="flex items-center justify-between rounded-xl bg-white p-4 shadow-sm transition-colors hover:bg-navy-50"
          >
            <div>
              <p className="text-sm font-bold text-navy-800">{item.title}</p>
              <p className="mt-0.5 text-xs text-navy-400">{item.description}</p>
            </div>
            <svg
              className="h-4 w-4 shrink-0 text-navy-300"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </Link>
        ))}
      </div>

      <div className="mt-6">
        <form action={signOut}>
          <button
            type="submit"
            className="w-full rounded-lg border border-navy-200 px-4 py-3 text-sm font-medium text-navy-600 transition-colors hover:bg-navy-50"
          >
            ログアウト
          </button>
        </form>
      </div>

      <p className="mt-6 text-center text-xs text-navy-300">
        <Link href="/terms" className="underline">
          利用規約
        </Link>
        {" ・ "}
        <Link href="/privacy" className="underline">
          プライバシーポリシー
        </Link>
      </p>
    </div>
  );
}
