import { cookies } from "next/headers";

/**
 * アカウント関連機能を一元化したauthアプリのオリジン。
 * ログイン・サインアップ・MFA・パスキー・パスワード変更・アカウント削除等は
 * すべてこちらに委譲する（Sporive自体は認証を持たない）。
 */
export const AUTH_APP_URL = "https://auth.saka2931.jp";

/**
 * authアプリの指定パスへ、現在のリクエストへ戻るための return_to 付きURLを組み立てる。
 * return_to は絶対URL（Sporive自身のオリジン）にする必要がある
 * （authアプリのresolveReturnTo()は相対パスを自身のオリジン基準で解決するため）。
 */
export function buildAuthAppUrl(path: string, request: { nextUrl: URL }): URL {
  const url = new URL(path, AUTH_APP_URL);
  const returnTo = `${request.nextUrl.origin}${request.nextUrl.pathname}${request.nextUrl.search}`;
  url.searchParams.set("return_to", returnTo);
  return url;
}

/**
 * トップページ等、NextRequestを持たないServer Componentからauthアプリの
 * ログイン・サインアップ画面へ直接リンクするためのURLを組み立てる。
 * `/login`・`/signup`はPhase Cで削除済みのため、`return_to`には「戻ってくる先」
 * として存在しないパスではなく`/home`（ログイン後のユーザーホーム）を指定する。
 */
function buildAuthAppEntryUrl(path: "/login" | "/signup", returnToPath: string): string {
  const url = new URL(path, AUTH_APP_URL);
  url.searchParams.set("return_to", `https://sporive.saka2931.jp${returnToPath}`);
  return url.toString();
}

export function buildLoginUrl(returnToPath: string = "/home"): string {
  return buildAuthAppEntryUrl("/login", returnToPath);
}

export function buildSignupUrl(returnToPath: string = "/home"): string {
  return buildAuthAppEntryUrl("/signup", returnToPath);
}

/**
 * 現在のリクエストのCookie（.saka2931.jpスコープの共有セッションCookieを含む）を
 * そのままauthアプリへのfetchに転送するためのヘッダー文字列を組み立てる。
 * サーバー間のfetchはブラウザのCORS制約を受けないため、authアプリ側の
 * ALLOWED_ORIGINSチェックは関係なく到達できる。
 */
async function buildCookieHeader(): Promise<string> {
  const cookieStore = await cookies();
  return cookieStore
    .getAll()
    .map((c) => `${c.name}=${c.value}`)
    .join("; ");
}

/** authアプリの GET /api/profile を呼び出し、display_name を取得する。失敗時は null。 */
export async function getDisplayName(): Promise<string | null> {
  try {
    const cookieHeader = await buildCookieHeader();
    const res = await fetch(`${AUTH_APP_URL}/api/profile`, {
      headers: { cookie: cookieHeader },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { display_name?: string | null };
    return typeof data.display_name === "string" ? data.display_name : null;
  } catch {
    return null;
  }
}

/** authアプリの PATCH /api/profile を呼び出し、display_name を更新する。 */
export async function updateDisplayName(displayName: string): Promise<boolean> {
  try {
    const cookieHeader = await buildCookieHeader();
    const res = await fetch(`${AUTH_APP_URL}/api/profile`, {
      method: "PATCH",
      headers: { cookie: cookieHeader, "content-type": "application/json" },
      body: JSON.stringify({ display_name: displayName }),
    });
    return res.ok;
  } catch {
    return false;
  }
}
