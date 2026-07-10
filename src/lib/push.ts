import webpush from "web-push";

export type PushPayload = {
  title: string;
  body: string;
  url?: string;
};

export type PushSubscriptionRecord = {
  endpoint: string;
  p256dh: string;
  auth: string;
};

let vapidConfigured = false;

function ensureVapid() {
  if (vapidConfigured) return;
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) {
    throw new Error(
      "VAPID鍵が設定されていません（NEXT_PUBLIC_VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY）。"
    );
  }
  webpush.setVapidDetails("mailto:shokisakamoto@gmail.com", publicKey, privateKey);
  vapidConfigured = true;
}

/**
 * 1件のWeb Push購読へ通知を送信する。
 * 購読が失効している場合（410 Gone / 404）は "expired" を返すので、
 * 呼び出し側で push_subscriptions から削除すること。
 */
export async function sendPush(
  subscription: PushSubscriptionRecord,
  payload: PushPayload
): Promise<"sent" | "expired" | "failed"> {
  ensureVapid();
  try {
    await webpush.sendNotification(
      {
        endpoint: subscription.endpoint,
        keys: { p256dh: subscription.p256dh, auth: subscription.auth },
      },
      JSON.stringify(payload)
    );
    return "sent";
  } catch (e) {
    const statusCode = (e as { statusCode?: number }).statusCode;
    if (statusCode === 404 || statusCode === 410) {
      return "expired";
    }
    return "failed";
  }
}
