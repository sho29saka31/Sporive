import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/types/database";
import { getJstMinutesOfDay } from "@/lib/week";
import { isMaintenanceLockdownTime } from "@/lib/maintenance";
import { isEmergencyMaintenanceActive } from "@/lib/feature-flags";
import { buildAuthAppUrl } from "@/lib/authApp";

// 未ログインでも常に表示する静的ページ（トップの機能紹介・規約類）。
// ログイン済みでもリダイレクトせずそのまま表示する（Google審査用の公開ページ）。
const STATIC_PATHS = ["/", "/privacy", "/terms"];

const MOBILE_PREVIEW_COOKIE = "force-mobile-preview";
const MOBILE_PREVIEW_PARAM = "demo-mobile-admin";
/** プロフィール登録済み確認のキャッシュ（値はuser.id。セッションCookie） */
const ONBOARDED_COOKIE = "sporive-onboarded";

/**
 * URLに `?demo-mobile-admin` が付いている場合、PC等でもスマホ表示を確認できるように
 * Cookieを立てる（`?demo-mobile-admin=0` で解除）。DeviceGuardがこのCookieを判定に利用する。
 * maxAgeを指定しないセッションCookieとし、ブラウザを閉じると失効するようにする。
 */
function applyMobilePreviewParam(
  request: NextRequest,
  response: NextResponse
): NextResponse {
  const { searchParams } = request.nextUrl;
  if (!searchParams.has(MOBILE_PREVIEW_PARAM)) {
    return response;
  }

  if (searchParams.get(MOBILE_PREVIEW_PARAM) === "0") {
    response.cookies.set(MOBILE_PREVIEW_COOKIE, "", { maxAge: 0, path: "/" });
  } else {
    response.cookies.set(MOBILE_PREVIEW_COOKIE, "1", { path: "/" });
  }
  return response;
}

/**
 * 認証セッションの更新とルートガードを行う。
 * ログイン・サインアップ・パスワードリセット・MFA等はすべて `auth.saka2931.jp`
 * に一元化されているため、Sporive自身が持つのは以下のみ：
 * - 未ログイン／MFA未完了：authアプリへ `return_to` 付きでリダイレクト
 * - プロフィール未登録：/onboarding/profile へ誘導（Sporive固有データのためローカルに残す）
 */
export async function updateSession(request: NextRequest) {
  const { pathname: requestPath } = request.nextUrl;

  // 定期メンテナンスタイム（§8-3）：トップページ・管理者画面・APIルート以外への
  // アクセスは、認証状態にかかわらずトップページへ戻す。
  if (
    isMaintenanceLockdownTime(getJstMinutesOfDay()) &&
    !STATIC_PATHS.includes(requestPath) &&
    !requestPath.startsWith("/admin") &&
    !requestPath.startsWith("/api/")
  ) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    url.search = "";
    url.searchParams.set("maintenance", "1");
    return NextResponse.redirect(url);
  }

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient<Database, "sporive">(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      db: { schema: "sporive" },
      // legal-life・auth（*.saka2931.jp）とセッションCookieを共有し、SSOを実現する
      cookieOptions: {
        domain: ".saka2931.jp",
        path: "/",
        sameSite: "lax",
        secure: true,
      },
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          supabaseResponse = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            supabaseResponse.cookies.set(name, value, options);
          }
        },
      },
    }
  );

  // 緊急メンテナンスモード（要件定義書 §8-3, §10-3）：super-adminが機能フラグで
  // 任意のタイミングで即座に全サイトを止められる。
  if (
    !STATIC_PATHS.includes(requestPath) &&
    !requestPath.startsWith("/admin") &&
    !requestPath.startsWith("/api/") &&
    (await isEmergencyMaintenanceActive())
  ) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    url.search = "";
    url.searchParams.set("maintenance", "1");
    return NextResponse.redirect(url);
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isOnboardingPath = pathname.startsWith("/onboarding");
  const isAdminPath = pathname.startsWith("/admin");
  const isApiPath = pathname.startsWith("/api/");

  if (isApiPath || STATIC_PATHS.includes(pathname)) {
    return applyMobilePreviewParam(request, supabaseResponse);
  }

  if (!user) {
    return applyMobilePreviewParam(
      request,
      NextResponse.redirect(buildAuthAppUrl("/login", request))
    );
  }

  // MFA（TOTP）：多要素認証を有効にしている利用者はAAL2が必要。
  // ログイン自体はauthアプリで完結するため通常ここに来ることはないが、
  // 同一セッション（共有Cookie）でAAL状態が変化した場合の保険として維持する。
  const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  const mfaPending =
    !!aal && aal.nextLevel === "aal2" && aal.currentLevel !== aal.nextLevel;
  if (mfaPending) {
    return applyMobilePreviewParam(
      request,
      NextResponse.redirect(buildAuthAppUrl("/mfa-challenge", request))
    );
  }

  if (!isOnboardingPath && !isAdminPath) {
    // プロフィール登録済みの確認は毎リクエストのDB往復になるため、
    // 一度確認できたらセッションCookieに記録して以降はスキップする（読み込み速度対策）。
    // 値にuser.idを入れることで、同じブラウザでの別アカウント切り替えにも対応する。
    const onboardedCookie = request.cookies.get(ONBOARDED_COOKIE)?.value;
    if (onboardedCookie !== user.id) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("id", user.id)
        .maybeSingle();

      if (!profile) {
        const url = request.nextUrl.clone();
        url.pathname = "/onboarding/profile";
        return applyMobilePreviewParam(request, NextResponse.redirect(url));
      }
      supabaseResponse.cookies.set(ONBOARDED_COOKIE, user.id, { path: "/" });
    }
  }

  return applyMobilePreviewParam(request, supabaseResponse);
}
