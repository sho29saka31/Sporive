import type { createClient } from "@/lib/supabase/server";

/**
 * AI系エンドポイント（propose-plan・improve-plan・recovery）共有のレート制限。
 * ユーザー単位・全エンドポイント共有のスライディングウィンドウで、Gemini API
 * コストの際限のない増大を防ぐ（supabase/migrations/0031_ai_rate_limit.sql）。
 */
export async function checkAiRateLimit(
  supabase: Awaited<ReturnType<typeof createClient>>,
  endpoint: string
): Promise<boolean> {
  const { data, error } = await supabase.rpc("check_and_log_ai_request", {
    p_endpoint: endpoint,
  });
  if (error) {
    // レート制限インフラ側の障害でAI機能全体を止めないため、チェックに失敗した
    // 場合はリクエストを許可する（フェイルオープン）
    console.error("AI rate limit check failed", error);
    return true;
  }
  return data === true;
}
