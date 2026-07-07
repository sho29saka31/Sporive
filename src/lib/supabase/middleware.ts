import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PUBLIC_PATHS = ["/login", "/signup"];
const STATIC_PATHS = ["/privacy", "/terms"];

/**
 * 認証セッションの更新とルートガードを行う。
 * - 未ログイン：利用者画面（(user)グループ）へのアクセスを /login へリダイレクト
 * - ログイン済みだがメール/パスワード未設定：/signup/set-password へ誘導
 * - プロフィール未登録：/onboarding/profile へ誘導
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
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

  if (isAuthCallback || STATIC_PATHS.includes(pathname)) {
    return supabaseResponse;
  }

  if (!user) {
    if (isPublicPath) return supabaseResponse;
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // ログイン済みユーザーが認証画面に来た場合はホームへ
  if (isPublicPath) {
    const url = request.nextUrl.clone();
    url.pathname = "/home";
    return NextResponse.redirect(url);
  }

  const hasPassword = user.identities?.some(
    (identity) => identity.provider === "email"
  );
  if (!hasPassword && pathname !== "/signup/set-password") {
    const url = request.nextUrl.clone();
    url.pathname = "/signup/set-password";
    return NextResponse.redirect(url);
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
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}
