"use client";

import { useEffect } from "react";

/**
 * PWA用 Service Worker の登録（本番ビルドのみ）。
 * ページ読み込み中（documentがまだ安定していない状態）に register() を呼ぶと
 * "InvalidStateError: The document is in an invalid state" が発生することがあるため、
 * window の load イベント後まで登録を遅延させる。
 */
export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (
      process.env.NODE_ENV !== "production" ||
      !("serviceWorker" in navigator)
    ) {
      return;
    }

    function register() {
      navigator.serviceWorker.register("/sw.js").catch((err) => {
        console.error("Service Worker の登録に失敗しました:", err);
      });
    }

    if (document.readyState === "complete") {
      register();
      return;
    }

    window.addEventListener("load", register, { once: true });
    return () => window.removeEventListener("load", register);
  }, []);

  return null;
}
