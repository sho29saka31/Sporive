import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Supabase Authのコールバック（PKCEフローの code 交換）。
 * Google OAuthに加え、パスワード再設定・マジックリンク・メールアドレス変更確認も
 * すべてこのルートを経由する（@supabase/ssr はデフォルトでPKCEフローを使うため、
 * これらのメールリンクは `?code=...` 形式でリダイレクトされる）。
 *
 * 注意：Supabaseのverifyエンドポイントはリダイレクト時に `code` のみを付与し、
 * `type` は付与しない。そのためフローごとの遷移先は、redirectTo に自前で付けた
 * `next` パラメータで判別する（公式ドキュメントの `next` パターンに準拠）。
 *
 * ここはmiddlewareの認証画面リダイレクト判定の対象外のため、ログイン中の
 * ブラウザでメールリンクを開いても code が握りつぶされずに処理される。
 *
 * Google OAuthの場合はCalendar の provider refresh token が発行されていれば
 * calendar_tokens に保存する（Phase 6 で利用。再同意を避けるためここで確保しておく）。
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const nextParam = searchParams.get("next");
  // オープンリダイレクト防止：アプリ内パスのみ許可
  const next =
    nextParam && nextParam.startsWith("/") && !nextParam.startsWith("//")
      ? nextParam
      : null;

  if (!code) {
    return NextResponse.redirect(`${origin}/login`);
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error || !data.session) {
    return NextResponse.redirect(`${origin}/login?error=invalid_link`);
  }

  if (next) {
    return NextResponse.redirect(`${origin}${next}`);
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
