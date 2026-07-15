import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "すべて" };

const MENU_ITEMS = [
  {
    href: "/debts",
    title: "負債管理",
    description: "未達成分の確認・補填とAIリカバリー提案",
  },
  {
    href: "/settings/notifications",
    title: "通知履歴",
    description: "送信された通知の内容を確認",
  },
  {
    href: "/settings/account",
    title: "アカウント設定",
    description: "プロフィール・メール・パスワードの変更",
  },
];

/** すべてタブ：その他機能への一覧アクセス */
export default function MenuPage() {
  return (
    <div className="py-6">
      <h1 className="text-xl font-bold">すべて</h1>
      <div className="mt-4 flex flex-col gap-3">
        {MENU_ITEMS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="rounded-xl bg-white p-4 shadow-sm transition-colors hover:bg-navy-50"
          >
            <p className="text-sm font-bold text-navy-800">{item.title}</p>
            <p className="mt-0.5 text-xs text-navy-400">{item.description}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
