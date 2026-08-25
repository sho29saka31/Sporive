import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "アクセス制限中" };

/**
 * 警告レベルのお知らせでブロックされたページの代替表示（要件定義書 §10-3）。
 * middleware.ts の rewrite でこのページの内容が表示される（URLは元のまま）。
 */
export default async function BlockedPage({
  searchParams,
}: {
  searchParams: Promise<{ title?: string }>;
}) {
  const { title } = await searchParams;

  return (
    <div className="flex flex-col items-center gap-4 py-16 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-accent-coral/10 text-accent-coral">
        <svg
          className="h-7 w-7"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 9v4" />
          <path d="M12 17h.01" />
          <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
        </svg>
      </div>
      <div>
        <p className="text-sm font-bold text-navy-800">
          このページは現在ご利用いただけません
        </p>
        <p className="mt-2 text-xs leading-relaxed text-navy-400">
          {title
            ? `お知らせ「${title}」により、一時的にアクセスを制限しています。`
            : "現在このページへのアクセスを一時的に制限しています。"}
          詳しくはお知らせをご確認ください。
        </p>
      </div>
      <div className="flex gap-3 text-xs">
        <Link
          href="/settings/notifications?tab=announcements"
          className="rounded-lg bg-navy-700 px-4 py-2 font-medium text-white"
        >
          お知らせを確認
        </Link>
        <Link
          href="/home"
          className="rounded-lg border border-navy-200 px-4 py-2 font-medium text-navy-600"
        >
          ホームへ戻る
        </Link>
      </div>
    </div>
  );
}
