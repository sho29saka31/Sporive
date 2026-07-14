import Link from "next/link";

/** 設定サブページ共通のヘッダー（アカウント設定へ戻るリンク付き） */
export default function SettingsHeader({ title }: { title: string }) {
  return (
    <div className="flex items-center gap-2">
      <Link
        href="/settings/account"
        prefetch={false}
        aria-label="アカウント設定へ戻る"
        className="rounded-lg p-1 text-navy-400 hover:bg-navy-100 hover:text-navy-600"
      >
        <svg
          className="h-5 w-5"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="15 18 9 12 15 6" />
        </svg>
      </Link>
      <h1 className="text-xl font-bold">{title}</h1>
    </div>
  );
}
