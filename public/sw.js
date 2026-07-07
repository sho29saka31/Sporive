/**
 * Sporive Service Worker
 * Phase 0: インストール・有効化と Web Push 受信の雛形のみ。
 * Phase 5 で通知ペイロードの本実装、必要に応じてキャッシュ戦略を追加する。
 */

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

// Web Push 受信（Phase 5 で本実装）
self.addEventListener("push", (event) => {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch {
    payload = { title: "Sporive", body: event.data.text() };
  }

  event.waitUntil(
    self.registration.showNotification(payload.title ?? "Sporive", {
      body: payload.body ?? "",
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      data: { url: payload.url ?? "/home" },
    })
  );
});

// 通知タップでアプリを開く
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url ?? "/home";

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clients) => {
        for (const client of clients) {
          if ("focus" in client) {
            client.navigate(url);
            return client.focus();
          }
        }
        return self.clients.openWindow(url);
      })
  );
});
