import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateWeeklyPlan } from "@/lib/gemini";
import { getFeatureFlags } from "@/lib/feature-flags";
import { checkAiRateLimit } from "@/lib/ai-rate-limit";

// Vercel無料プランの既定タイムアウト（10秒）ではGeminiの構造化JSON生成が
// 間に合わないことがあり、想定済みのエラーハンドリング（try/catch）を経由せず
// プラットフォームに強制終了されてしまうため、上限内で余裕を持たせる
export const maxDuration = 45;

const REQUEST_TEXT_MAX_LENGTH = 300;

/** プロフィール・希望頻度からAIが週間トレーニング計画を新規提案する */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "認証が必要です。" }, { status: 401 });
  }

  if (!(await checkAiRateLimit(supabase, "propose-plan"))) {
    return NextResponse.json(
      { error: "AI機能の利用回数が上限に達しました。しばらく時間をおいて再度お試しください。" },
      { status: 429 }
    );
  }

  const flags = await getFeatureFlags(["ai_master", "ai_weekly_proposal"]);
  if (!flags.ai_master || !flags.ai_weekly_proposal) {
    return NextResponse.json(
      { error: "現在AI提案機能は一時停止中です。時間をおいて再度お試しください。" },
      { status: 503 }
    );
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("birth_year, goal, gender")
    .eq("id", user.id)
    .single();

  if (!profile) {
    return NextResponse.json(
      { error: "プロフィールが未登録です。" },
      { status: 400 }
    );
  }

  const body = await request.json().catch(() => ({}));
  const weeklyFrequency = Number(body.weeklyFrequency);

  if (
    !Number.isInteger(weeklyFrequency) ||
    weeklyFrequency < 1 ||
    weeklyFrequency > 7
  ) {
    return NextResponse.json(
      { error: "希望頻度は1〜7の整数で指定してください。" },
      { status: 400 }
    );
  }

  const rawRequestText =
    typeof body.requestText === "string" ? body.requestText.trim() : "";
  if (rawRequestText.length > REQUEST_TEXT_MAX_LENGTH) {
    return NextResponse.json(
      { error: `要望は${REQUEST_TEXT_MAX_LENGTH}文字以内で入力してください。` },
      { status: 400 }
    );
  }
  const requestText = rawRequestText || null;

  try {
    const plan = await generateWeeklyPlan({
      birthYear: profile.birth_year,
      goal: profile.goal,
      gender: profile.gender,
      weeklyFrequency,
      requestText,
    });
    return NextResponse.json({ plan });
  } catch (error) {
    console.error("Gemini plan generation failed", error);
    return NextResponse.json(
      { error: "AI提案の生成に失敗しました。時間をおいて再度お試しください。" },
      { status: 502 }
    );
  }
}
