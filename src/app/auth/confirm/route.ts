import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Supabase公式推奨の token_hash + verifyOtp によるメールリンク検証エンドポイント
 * （https://supabase.com/docs/guides/auth/passwords の PKCE flow 手順に準拠）。
 *
 * メールテンプレートを
 *   {{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery&next=/signup/set-password?reason=reset
 * の形式にカスタマイズした場合に使用する。code+code_verifier方式（/auth/callback）と
 * 異なりブラウザのCookieに依存しないため、メールを別ブラウザ・メールアプリ内蔵
 * ブラウザで開いても機能する。
 *
 * 現状はカスタムSMTP未設定のためテンプレートを編集できず、このルートは待機状態
 * （デフォルトテンプレートは /auth/callback 経由のcode方式でリダイレクトしてくる）。
 * カスタムSMTP設定後にテンプレートを上記形式へ変更すれば、こちらが使われる。
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const nextParam = searchParams.get("next");
  const next =
    nextParam && nextParam.startsWith("/") && !nextParam.startsWith("//")
      ? nextParam
      : "/home";

  if (tokenHash && type) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash: tokenHash,
    });
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=invalid_link`);
}
