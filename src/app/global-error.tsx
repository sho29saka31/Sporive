"use client";

import { useEffect } from "react";
import "./globals.css";

/**
 * root layout自体でエラーが発生した場合の最終フォールバック。
 * root layoutが描画されない状態で使われるため、<html>/<body>を含め
 * ページ全体を自前で用意する(ヘッダー等の共通コンポーネントには依存しない)。
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="ja">
      <body className="flex min-h-dvh items-center justify-center bg-navy-50 px-6 py-12 text-navy-800 antialiased">
        <div className="w-full max-w-lg rounded-xl border border-navy-100 bg-white p-8 text-center shadow-sm">
          <p className="text-sm font-bold uppercase tracking-wide text-accent-coral">
            500 Internal Server Error
          </p>
          <h1 className="mt-2 text-xl font-bold text-navy-900">サイト全体で問題が発生しました</h1>
          <p className="mt-4 whitespace-pre-line text-sm leading-relaxed text-navy-500">
            {
              "申し訳ありませんが、ページの表示中に問題が発生しました。\nお手数をおかけしますが、しばらくしてから再度アクセスしてください。"
            }
          </p>
          <div className="mt-6">
            <button
              type="button"
              onClick={reset}
              className="rounded-lg bg-navy-700 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-navy-600"
            >
              再読み込みする
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
