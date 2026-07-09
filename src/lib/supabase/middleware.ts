import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/types/database";

const PUBLIC_PATHS = ["/login", "/signup", "/reset-password"];
const STATIC_PATHS = ["/privacy", "/terms"];

const MOBILE_PREVIEW_COOKIE = "force-mobile-preview";
const MOBILE_PREVIEW_PARAM = "demo-mobile-admin";

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
 * - 未ログイン：利用者画面（(user)グループ）へのアクセスを /login へリダイレクト
 * - ログイン済みだがメール/パスワード未設定：/signup/set-password へ誘導
 * - プロフィール未登録：/onboarding/profile へ誘導
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
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

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isPublicPath = PUBLIC_PATHS.includes(pathname);
  const isAuthCallback = pathname.startsWith("/auth/callback");
  const isOnboardingPath = pathname.startsWith("/onboarding");
  const isAdminPath = pathname.startsWith("/admin");
  const isApiPath = pathname.startsWith("/api/");

  if (isAuthCallback || isApiPath || STATIC_PATHS.includes(pathname)) {
    return applyMobilePreviewParam(request, supabaseResponse);
  }

  if (!user) {
    if (isPublicPath) return applyMobilePreviewParam(request, supabaseResponse);
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return applyMobilePreviewParam(request, NextResponse.redirect(url));
  }

  // ログイン済みユーザーが認証画面に来た場合はホームへ。
  // ただし /login に error や code 等の認証フロー由来のパラメータが付いている場合は
  // リダイレクトしない。ここで/homeへ流してしまうと、パスワード再設定リンクが
  // 無効だった場合のエラー表示（/login?error=invalid_link）や、万一 /auth/callback
  // を経由せず /login に code が直接付いて届いた場合の処理が、既存セッションを
  // 持つブラウザで握りつぶされてしまう（実際に発生した不具合の原因）。
  const hasAuthFlowParam =
    request.nextUrl.searchParams.has("error") ||
    request.nextUrl.searchParams.has("code");
  if (isPublicPath && !(pathname === "/login" && hasAuthFlowParam)) {
    const url = request.nextUrl.clone();
    url.pathname = "/home";
    return applyMobilePreviewParam(request, NextResponse.redirect(url));
  }

  // Supabaseの identities は OAuth 以外の登録方法では更新されないため、
  // updateUser({ password }) 実行時に user_metadata へ明示的に立てるフラグで判定する
  const hasPassword = user.user_metadata?.password_set === true;
  if (!hasPassword && pathname !== "/signup/set-password") {
    const url = request.nextUrl.clone();
    url.pathname = "/signup/set-password";
    return applyMobilePreviewParam(request, NextResponse.redirect(url));
  }

  if (hasPassword && !isOnboardingPath && !isAdminPath) {
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
  }

  return applyMobilePreviewParam(request, supabaseResponse);
}
