"use client";

import { useEffect, useState } from "react";

type Status =
  | "loading" // 初期判定中
  | "unsupported" // このブラウザでは利用不可
  | "denied" // 通知許可がブロックされている
  | "subscribed"
  | "unsubscribed"
  | "processing";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from(rawData, (c) => c.charCodeAt(0));
}

/** この端末でのWeb Push購読のON/OFF切り替え */
export default function PushSubscriptionToggle() {
  const [status, setStatus] = useState<Status>("loading");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function checkStatus() {
      if (
        !("serviceWorker" in navigator) ||
        !("PushManager" in window) ||
        !("Notification" in window)
      ) {
        setStatus("unsupported");
        return;
      }
      if (Notification.permission === "denied") {
        setStatus("denied");
        return;
      }
      try {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        setStatus(subscription ? "subscribed" : "unsubscribed");
      } catch {
        setStatus("unsupported");
      }
    }
    void checkStatus();
  }, []);

  async function subscribe() {
    setStatus("processing");
    setError(null);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setStatus(permission === "denied" ? "denied" : "unsubscribed");
        return;
      }
      const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!vapidKey) {
        setError("通知の設定が未完了です（VAPID鍵未設定）。");
        setStatus("unsubscribed");
        return;
      }
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey).buffer as ArrayBuffer,
      });
      const res = await fetch("/api/notifications/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(subscription.toJSON()),
      });
      if (!res.ok) throw new Error("subscribe failed");
      setStatus("subscribed");
    } catch {
      setError("通知の登録に失敗しました。時間をおいて再度お試しください。");
      setStatus("unsubscribed");
    }
  }

  async function unsubscribe() {
    setStatus("processing");
    setError(null);
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        await fetch("/api/notifications/subscribe", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: subscription.endpoint }),
        });
        await subscription.unsubscribe();
      }
      setStatus("unsubscribed");
    } catch {
      setError("通知の解除に失敗しました。時間をおいて再度お試しください。");
      setStatus("subscribed");
    }
  }

  if (status === "loading") {
    return <p className="text-xs text-navy-300">確認中...</p>;
  }
  if (status === "unsupported") {
    return (
      <p className="text-xs leading-relaxed text-navy-400">
        このブラウザはプッシュ通知に対応していません。iPhoneの場合は、Safariの共有メニューから「ホーム画面に追加」でアプリとして開くと利用できます。
      </p>
    );
  }
  if (status === "denied") {
    return (
      <p className="text-xs leading-relaxed text-navy-400">
        通知がブロックされています。端末またはブラウザの設定からSporiveの通知を許可してください。
      </p>
    );
  }

  const subscribed = status === "subscribed";
  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-navy-800">この端末で通知を受け取る</p>
          <p className="mt-0.5 text-xs text-navy-400">
            {subscribed ? "通知は有効です" : "通知は無効です"}
          </p>
        </div>
        <button
          type="button"
          onClick={subscribed ? unsubscribe : subscribe}
          disabled={status === "processing"}
          className={
            subscribed
              ? "rounded-lg border border-navy-200 px-4 py-2 text-xs font-medium text-navy-600 hover:bg-navy-50 disabled:opacity-60"
              : "rounded-lg bg-navy-700 px-4 py-2 text-xs font-medium text-white hover:bg-navy-600 disabled:opacity-60"
          }
        >
          {status === "processing" ? "処理中..." : subscribed ? "無効にする" : "有効にする"}
        </button>
      </div>
      {error && <p className="mt-2 text-xs text-accent-coral">{error}</p>}
    </div>
  );
}
