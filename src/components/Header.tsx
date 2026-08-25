import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import { getUnreadAnnouncements } from "@/lib/site-announcements";

/**
 * 固定ヘッダー（requirements.md §9-1）
 * 通知設定・アカウント設定へのショートカットを常時表示する。
 * 未読のお知らせがある場合、ベルアイコンの右上にバッジを表示する。
 */
export default async function Header() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const hasUnreadAnnouncement = user
    ? (await getUnreadAnnouncements(supabase, user.id)).length > 0
    : false;

  return (
    <header className="fixed inset-x-0 top-0 z-50 h-header bg-navy-700 text-white shadow-md">
      <div className="mx-auto flex h-full max-w-md items-center justify-between px-4">
        <Link href="/home" prefetch={false}>
          <Image src="/logo-wordmark-white.png" alt="Sporive" width={112} height={47} priority />
        </Link>
        <div className="flex items-center gap-1">
          <Link
            href="/settings/notifications" prefetch={false}
            aria-label={hasUnreadAnnouncement ? "お知らせ（未読あり）" : "お知らせ"}
            className="relative flex h-10 w-10 items-center justify-center rounded-full transition-colors hover:bg-navy-600 active:bg-navy-500"
          >
            <svg
              className="h-6 w-6"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
            {hasUnreadAnnouncement && (
              <span
                aria-hidden="true"
                className="absolute right-1.5 top-1.5 h-2.5 w-2.5 rounded-full bg-accent-coral ring-2 ring-navy-700"
              />
            )}
          </Link>
          <Link
            href="/settings/account" prefetch={false}
            aria-label="アカウント設定"
            className="flex h-10 w-10 items-center justify-center rounded-full transition-colors hover:bg-navy-600 active:bg-navy-500"
          >
            <svg
              className="h-6 w-6"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          </Link>
        </div>
      </div>
    </header>
  );
}
