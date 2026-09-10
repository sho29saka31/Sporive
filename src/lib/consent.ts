declare global {
  interface Window {
    // dataLayerの型はcomponents/GtmPageview.tsxで既に宣言されているため、ここでは
    // gtagのみ追加宣言する(同一プロパティを異なる型で再宣言するとエラーになるため)。
    gtag: (...args: unknown[]) => void;
  }
}

// GTMコンテナ自体はSearch Consoleの所有権確認のため常にロードされるが(layout.tsx参照)、
// Google Consent Mode v2により、GTM内で設定するGA4等の計測タグの実際の発火・Cookie発行は
// ユーザーの同意状態に応じて制御される。GTM側では、各タグの「追加の同意事項の確認」設定で
// analytics_storage等を要求するよう設定すること。
export function initConsentDefaults() {
  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag(...args: unknown[]) {
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push(args);
  };
  window.gtag("consent", "default", {
    ad_storage: "denied",
    ad_user_data: "denied",
    ad_personalization: "denied",
    analytics_storage: "denied",
    functionality_storage: "denied",
    personalization_storage: "denied",
    security_storage: "granted",
    wait_for_update: 500,
  });
}

function setCookie(name: string, value: string, days: number) {
  const date = new Date();
  date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000);
  document.cookie = `${name}=${value};expires=${date.toUTCString()};path=/;SameSite=Lax`;
}

export function getCookie(name: string) {
  const nameEQ = name + "=";
  for (const c of document.cookie.split(";")) {
    const trimmed = c.trimStart();
    if (trimmed.startsWith(nameEQ)) return trimmed.slice(nameEQ.length);
  }
  return null;
}

export function grantConsent() {
  if (typeof window.gtag !== "function") initConsentDefaults();
  window.gtag("consent", "update", {
    ad_storage: "denied",
    ad_user_data: "denied",
    ad_personalization: "denied",
    analytics_storage: "granted",
    functionality_storage: "granted",
    personalization_storage: "granted",
  });
}

export function denyConsent() {
  if (typeof window.gtag !== "function") initConsentDefaults();
  window.gtag("consent", "update", {
    analytics_storage: "denied",
    functionality_storage: "denied",
    personalization_storage: "denied",
  });
}

export function acceptCookies() {
  setCookie("cookie_consent", "accepted", 365);
  grantConsent();
}

export function rejectCookies() {
  setCookie("cookie_consent", "rejected", 365);
  denyConsent();
}
