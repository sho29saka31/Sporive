// ブラウザ/OS/端末種別の簡易判定ロジック（正規表現ベース、外部ライブラリ不要）。
// authアプリのデバイス管理画面（/account/devices）にこの端末が表示される際の
// 表示情報として使う（PushCleanupWatcher からセッション登録時に送信する）。

export type UAInfo = { browser: string; os: string; device: string };

export function parseUA(): UAInfo {
  const ua = navigator.userAgent;
  let browser = "その他";
  if (ua.includes("Edg/")) browser = "Microsoft Edge";
  else if (ua.includes("OPR/") || ua.includes("Opera")) browser = "Opera";
  else if (ua.includes("Chrome/")) browser = "Google Chrome";
  else if (ua.includes("Firefox/")) browser = "Mozilla Firefox";
  else if (ua.includes("Safari/")) browser = "Safari";

  let os = "その他";
  if (/iPhone|iPad|iPod/.test(ua)) os = "iOS";
  else if (ua.includes("Android")) os = "Android";
  else if (ua.includes("Windows")) os = "Windows";
  else if (ua.includes("Mac OS X")) os = "macOS";
  else if (ua.includes("Linux")) os = "Linux";

  const device = /Mobi|Android|iPhone|iPad/i.test(ua) ? "スマートフォン/タブレット" : "PC";
  return { browser, os, device };
}
