import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Google OAuth コールバック。
 * セッション確立後、Calendar の provider refresh token が発行されていれば
 * calendar_tokens に保存する（Phase 6 で利用。再同意を避けるためここで確保しておく）。
 * その後のログイン状態に応じた画面振り分けは middleware が行う。
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (!code) {
    return NextResponse.redirect(`${origin}/login`);
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error || !data.session) {
    return NextResponse.redirect(`${origin}/login`);
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
