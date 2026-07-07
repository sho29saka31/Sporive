/**
 * スマホ以外のデバイスでアクセスした場合の誘導画面（requirements.md §9-3）
 */
export default function MobileOnlyGuide() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 bg-navy-800 px-8 text-center text-white">
      <svg
        className="h-16 w-16 text-accent-sky"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
        <line x1="12" y1="18" x2="12.01" y2="18" />
      </svg>
      <h1 className="text-2xl font-bold">Sporive</h1>
      <p className="leading-relaxed text-navy-100">
        Sporive はスマートフォン専用のアプリです。
        <br />
        お手数ですが、スマートフォンでこのページを開いてください。
      </p>
    </main>
  );
}
