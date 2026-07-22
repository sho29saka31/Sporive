import Link from "next/link";
import Image from "next/image";

/**
 * 固定ヘッダー（requirements.md §9-1）
 * 通知設定・アカウント設定へのショートカットを常時表示する。
 */
export default function Header() {
  return (
    <header className="fixed inset-x-0 top-0 z-50 h-header bg-navy-700 text-white shadow-md">
      <div className="mx-auto flex h-full max-w-md items-center justify-between px-4">
        <Link href="/home" prefetch={false}>
          <Image src="/logo-wordmark-white.png" alt="Sporive" width={112} height={47} priority />
        </Link>
        <div className="flex items-center gap-1">
          <Link
            href="/settings/notifications" prefetch={false}
            aria-label="通知履歴"
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
              <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
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
