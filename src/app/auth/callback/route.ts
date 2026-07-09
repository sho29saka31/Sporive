import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Supabase Authのコールバック（PKCEフローの code 交換）。
 * Google OAuthに加え、パスワード再設定・マジックリンク・メールアドレス変更確認も
 * すべてこのルートを経由する（@supabase/ssr はデフォルトでPKCEフローを使うため、
 * これらのメールリンクはハッシュフラグメントではなく `?code=...&type=...` 形式で
 * リダイレクトされる）。
 *
 * ここをmiddlewareの認証画面リダイレクト判定より前段（/auth/callbackは対象外）で
 * 処理することで、「パスワード再設定リンクをログイン中のブラウザで開くと
 * middlewareに/homeへ弾かれてcodeが処理されないまま失われる」不具合を避けている。
 *
 * セッション確立後、type（recovery/email_change等）に応じて画面を振り分ける。
 * Google OAuthの場合はCalendar の provider refresh token が発行されていれば
 * calendar_tokens に保存する（Phase 6 で利用。再同意を避けるためここで確保しておく）。
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const type = searchParams.get("type");

  if (!code) {
    return NextResponse.redirect(`${origin}/login`);
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error || !data.session) {
    return NextResponse.redirect(`${origin}/login?error=invalid_link`);
  }

  if (type === "recovery") {
    return NextResponse.redirect(
      `${origin}/signup/set-password?reason=reset`
    );
  }
  if (type === "email_change") {
    return NextResponse.redirect(`${origin}/settings/account?email_changed=1`);
  }

  const providerRefreshToken = (
    data.session as unknown as { provider_refresh_token?: string }
  ).provider_refresh_token;

  if (providerRefreshToken) {
    await supabase.from("calendar_tokens").upsert({
      user_id: data.session.user.id,
      refresh_token: providerRefreshToken,
      scope: "https://www.googleapis.com/auth/calendar",
      updated_at: new Date().toISOString(),
    });
  }

  return NextResponse.redirect(`${origin}/home`);
}
