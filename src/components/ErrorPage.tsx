import Link from "next/link";

/** error.tsx・global-error.tsx共通の表示。Sporiveのネイビー基調デザインに合わせる */
export default function ErrorPage({
  code,
  title,
  desc,
  onRetry,
}: {
  code: string;
  title: string;
  desc: string;
  /** 指定時、「再読み込みする」ボタンを追加表示する */
  onRetry?: () => void;
}) {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-navy-50 px-6 py-12 text-navy-800">
      <div className="w-full max-w-lg rounded-xl border border-navy-100 bg-white p-8 text-center shadow-sm">
        <p className="text-sm font-bold uppercase tracking-wide text-accent-coral">{code}</p>
        <h1 className="mt-2 text-xl font-bold text-navy-900">{title}</h1>
        <p className="mt-4 whitespace-pre-line text-sm leading-relaxed text-navy-500">{desc}</p>
        <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            href="/"
            className="w-full rounded-lg bg-navy-700 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-navy-600 sm:w-auto"
          >
            ホームに戻る
          </Link>
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="w-full rounded-lg border border-navy-200 px-6 py-3 text-sm font-medium text-navy-600 transition-colors hover:bg-navy-50 sm:w-auto"
            >
              再読み込みする
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
