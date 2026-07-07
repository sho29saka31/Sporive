"use client";

import { useEffect } from "react";

/** PWA用 Service Worker の登録（本番ビルドのみ） */
export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (
      process.env.NODE_ENV === "production" &&
      "serviceWorker" in navigator
    ) {
      navigator.serviceWorker.register("/sw.js").catch((err) => {
        console.error("Service Worker の登録に失敗しました:", err);
      });
    }
  }, []);

  return null;
}
