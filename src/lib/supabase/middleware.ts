import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/types/database";
import { getJstMinutesOfDay } from "@/lib/week";
import { isMaintenanceLockdownTime } from "@/lib/maintenance";
import { isEmergencyMaintenanceActive } from "@/lib/feature-flags";
import { getBlockingAnnouncement } from "@/lib/site-announcements";

const PUBLIC_PATHS = ["/login", "/signup", "/reset-password"];
/** MFA（TOTP）を有効にしている利用者が、ログイン後に認証コード入力を求められる画面 */
const MFA_CHALLENGE_PATH = "/mfa-challenge";
/**
 * パスワード未設定（Googleログインのみ）の利用者が、ログイン後に必ず
 * 通過させられるパスワード設定画面。/mfa-challenge と同様、ログインフローを
 * 完走するために必須の画面のため、メンテナンス系の除外リストに含める必要がある
 */
const SET_PASSWORD_PATH = "/signup/set-password";
/**
 * メンテナンス中でもログインフローを完走できなければならない画面群
 * （定期・緊急メンテナンス両方の除外リストで共通して使う）
 */
const LOGIN_FLOW_PATHS = ["/login", MFA_CHALLENGE_PATH, SET_PASSWORD_PATH];
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
 * - 未ログイン：利用者画面（(user)グループ）へのアクセスを /login へリダイレクト
 * - ログイン済みだがメール/パスワード未設定：/signup/set-password へ誘導
 * - プロフィール未登録：/onboarding/profile へ誘導
 */
export async function updateSession(request: NextRequest) {
  // Supabase Authのメールリンク（PKCE）は `?code=...` を付けてリダイレクトしてくる。
  // Dashboard の Redirect URLs 許可リスト外だった場合は Site URL（トップページ等）へ
  // フォールバックするため、どのパスに code が落ちても /auth/callback で確実に
  // 交換処理できるよう、ここで一括転送する。
  const { pathname: requestPath, searchParams: requestParams } =
    request.nextUrl;
  if (requestParams.has("code") && !requestPath.startsWith("/auth/")) {
    const url = request.nextUrl.clone();
    url.pathname = "/auth/callback";
    return NextResponse.redirect(url);
  }

  // 定期メンテナンスタイム（§8-3）：トップページ・管理者画面・APIルート・
  // ログインフロー（/login・/auth/・/mfa-challenge・/signup/set-password）
  // 以外へのアクセスは、認証状態にかかわらずトップページへ戻す。
  // ログインフローを除外しないと、セッション切れ・パスワード未設定
  // （Googleログインのみ）の管理者が/adminへ入り直そうとした際、
  // ログイン完走に必要な画面のどこかでここに弾かれてしまい、
  // 要件定義書§8-3の「管理者画面はメンテナンスタイム中も通常通り動作する」を
  // 満たせなくなる
  if (
    isMaintenanceLockdownTime(getJstMinutesOfDay()) &&
    requestPath !== "/" &&
    !LOGIN_FLOW_PATHS.includes(requestPath) &&
    !requestPath.startsWith("/auth/") &&
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

  // 緊急メンテナンスモード（要件定義書 §8-3, §10-3）：super-adminが機能フラグで
  // 任意のタイミングで即座に全サイトを止められる。定期メンテナンスとは異なり
  // 時間経過での自動解除がないため、ログインフロー（/login・/auth/・
  // /mfa-challenge・/signup/set-password）だけは除外する。これらを除外しないと、
  // セッション切れ・パスワード未設定（Googleログインのみ）・MFA有効な
  // super-adminが誰もログインできなくなり、解除する手段がなくなってサイトが
  // 恒久的にロックされてしまうため
  if (
    requestPath !== "/" &&
    !LOGIN_FLOW_PATHS.includes(requestPath) &&
    !requestPath.startsWith("/auth/") &&
    !requestPath.startsWith("/admin") &&
    !requestPath.startsWith("/api/") &&
    (await isEmergencyMaintenanceActive(supabase))
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
  const isPublicPath = PUBLIC_PATHS.includes(pathname);
  // /auth/callback（code交換）と /auth/confirm（token_hash検証）は
  // ルートガードの対象外（セッション確立前のエンドポイントのため）
  const isAuthCallback = pathname.startsWith("/auth/");
  const isOnboardingPath = pathname.startsWith("/onboarding");
  const isAdminPath = pathname.startsWith("/admin");
  const isApiPath = pathname.startsWith("/api/");
  const isMfaChallengePath = pathname === MFA_CHALLENGE_PATH;
  const isSetPasswordPath = pathname === SET_PASSWORD_PATH;

  if (isAuthCallback || isApiPath || STATIC_PATHS.includes(pathname)) {
    return applyMobilePreviewParam(request, supabaseResponse);
  }

  if (!user) {
    if (isPublicPath) return applyMobilePreviewParam(request, supabaseResponse);
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return applyMobilePreviewParam(request, NextResponse.redirect(url));
  }

  // MFA（TOTP、要件定義書 §4-1）：多要素認証を有効にしている利用者は、
  // パスワード/Googleログイン直後の時点ではAAL1（第一要素のみ）のセッションになる。
  // AAL2（第二要素）が必要なのに満たしていない場合は、認証コード入力画面以外への
  // アクセスを許可しない
  const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  const mfaPending =
    !!aal && aal.nextLevel === "aal2" && aal.currentLevel !== aal.nextLevel;
  if (mfaPending && !isMfaChallengePath) {
    const url = request.nextUrl.clone();
    // 認証コード入力後に元々アクセスしようとしていたページへ戻せるよう、
    // 管理者画面・パスワード再設定画面など/home以外を保持する
    // （定期メンテナンス中に/adminへアクセスした管理者や、パスワードを
    // 忘れてリセットリンクを踏んだMFA有効ユーザーが、MFA完了後に/homeへ
    // 飛ばされて元のフローに戻れなくなる問題への対処）
    const next = isAdminPath || isSetPasswordPath ? pathname : null;
    url.pathname = MFA_CHALLENGE_PATH;
    url.search = "";
    if (next) url.searchParams.set("next", next);
    return applyMobilePreviewParam(request, NextResponse.redirect(url));
  }
  // AAL2達成済み（またはMFA未設定）で認証コード入力画面に来た場合は、
  // nextパラメータがあればそこへ、なければホームへ。
  // 直接ブックマーク・戻るボタン等でアクセスされたケースも想定
  if (!mfaPending && isMfaChallengePath) {
    const next = request.nextUrl.searchParams.get("next");
    const url = request.nextUrl.clone();
    url.pathname =
      next && (next.startsWith("/admin") || next === SET_PASSWORD_PATH)
        ? next
        : "/home";
    url.search = "";
    return applyMobilePreviewParam(request, NextResponse.redirect(url));
  }

  // ログイン済みユーザーが認証画面に来た場合はホームへ。
  // ただし /login?error=...（認証リンクが無効だった場合のエラー表示）は
  // リダイレクトせず、エラーメッセージをユーザーに見せる。
  const hasAuthFlowParam = request.nextUrl.searchParams.has("error");
  if (isPublicPath && !(pathname === "/login" && hasAuthFlowParam)) {
    const url = request.nextUrl.clone();
    url.pathname = "/home";
    return applyMobilePreviewParam(request, NextResponse.redirect(url));
  }

  // Supabaseの identities は OAuth 以外の登録方法では更新されないため、
  // updateUser({ password }) 実行時に user_metadata へ明示的に立てるフラグで判定する。
  // 通常のアプリフローではMFA設定はパスワード設定済みのアカウントでしか行えないため
  // 両条件が同時に成立することはないが、Supabase側で直接MFA因子が追加された等の
  // 想定外のケースで両方の条件が真になった場合、/mfa-challenge と /signup/set-password
  // の間で無限リダイレクトになってしまう。MFA認証（本人確認）を優先させるため、
  // /mfa-challengeにいる間はこの判定をスキップする
  const hasPassword = user.user_metadata?.password_set === true;
  if (!hasPassword && pathname !== "/signup/set-password" && !isMfaChallengePath) {
    const url = request.nextUrl.clone();
    url.pathname = "/signup/set-password";
    return applyMobilePreviewParam(request, NextResponse.redirect(url));
  }

  // /signup/set-password は新規ユーザーのパスワード初回設定だけでなく、
  // 既存ユーザーがパスワードを忘れた際の再設定（?reason=reset）にも使われる
  // （その場合はhasPasswordが既にtrueのため214行目のガードでは弾かれない）。
  // お知らせブロック等でこの画面を塞ぐと、再設定中の利用者が新しいパスワードを
  // 設定できなくなるため、/mfa-challengeと同様に除外する
  if (
    hasPassword &&
    !isOnboardingPath &&
    !isAdminPath &&
    !isMfaChallengePath &&
    !isSetPasswordPath
  ) {
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

    // 警告レベルのお知らせによるページブロック（要件定義書 §10-3）。
    // URLはそのままに/blockedの内容を返す（redirectだとブロック対象ページ同士で
    // ループしうるため、rewriteでmiddlewareの再実行を避ける）
    const blocking = await getBlockingAnnouncement(supabase, pathname);
    if (blocking) {
      const url = request.nextUrl.clone();
      url.pathname = "/blocked";
      url.search = "";
      url.searchParams.set("title", blocking.title);
      return applyMobilePreviewParam(request, NextResponse.rewrite(url));
    }
  }

  return applyMobilePreviewParam(request, supabaseResponse);
}
