import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateImprovementSuggestion, type WeeklyPlanDraft } from "@/lib/gemini";
import { getFeatureFlags } from "@/lib/feature-flags";
import { checkAiRateLimit } from "@/lib/ai-rate-limit";
import { WORKOUT_LIMITS } from "@/lib/workout-limits";

// Vercel無料プランの既定タイムアウト（10秒）ではGeminiの構造化JSON生成が
// 間に合わないことがあり、想定済みのエラーハンドリング（try/catch）を経由せず
// プラットフォームに強制終了されてしまうため、上限内で余裕を持たせる
export const maxDuration = 45;

// currentPlanはクライアント（認証済みユーザー）からの入力をそのままGemini APIの
// プロンプトへ埋め込むため、配列長・文字列長・数値範囲を検証しないと、巨大な
// ペイロードでリクエストごとのGemini APIコストを不必要に増大させられてしまう
// （コード監査で発見）。週7日×1日あたり数種目という実利用上の上限を踏まえた値。
const MAX_ITEMS = 50;
const MAX_EXERCISE_NAME_LENGTH = 100;
const MAX_CATEGORY_LENGTH = 50;
const MAX_SUMMARY_LENGTH = 500;

function isValidCurrentPlan(plan: WeeklyPlanDraft): boolean {
  if (typeof plan.summary !== "string" || plan.summary.length > MAX_SUMMARY_LENGTH) {
    return false;
  }
  if (!Array.isArray(plan.items) || plan.items.length > MAX_ITEMS) {
    return false;
  }
  return plan.items.every((item) => {
    if (
      !Number.isInteger(item.dayOfWeek) ||
      item.dayOfWeek < 0 ||
      item.dayOfWeek > 6
    ) {
      return false;
    }
    if (
      typeof item.exerciseName !== "string" ||
      !item.exerciseName ||
      item.exerciseName.length > MAX_EXERCISE_NAME_LENGTH
    ) {
      return false;
    }
    if (
      item.category != null &&
      (typeof item.category !== "string" || item.category.length > MAX_CATEGORY_LENGTH)
    ) {
      return false;
    }
    if (item.sets != null && (!Number.isFinite(item.sets) || item.sets < 0 || item.sets > WORKOUT_LIMITS.sets.max)) {
      return false;
    }
    if (item.reps != null && (!Number.isFinite(item.reps) || item.reps < 0 || item.reps > WORKOUT_LIMITS.reps.max)) {
      return false;
    }
    if (
      item.weightKg != null &&
      (!Number.isFinite(item.weightKg) || item.weightKg < 0 || item.weightKg > WORKOUT_LIMITS.weightKg.max)
    ) {
      return false;
    }
    if (
      item.durationMin != null &&
      (!Number.isFinite(item.durationMin) ||
        item.durationMin < 0 ||
        item.durationMin > WORKOUT_LIMITS.durationMin.max)
    ) {
      return false;
    }
    return true;
  });
}

/** 登録直前の計画（AI提案 or 手動作成）に対してAIが改善案を提示する */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "認証が必要です。" }, { status: 401 });
  }

  if (!(await checkAiRateLimit(supabase, "improve-plan"))) {
    return NextResponse.json(
      { error: "AI機能の利用回数が上限に達しました。しばらく時間をおいて再度お試しください。" },
      { status: 429 }
    );
  }

  const flags = await getFeatureFlags([
    "ai_master",
    "ai_improvement_suggestion",
  ]);
  if (!flags.ai_master || !flags.ai_improvement_suggestion) {
    return NextResponse.json(
      { error: "現在AI改善提案機能は一時停止中です。時間をおいて再度お試しください。" },
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
  const currentPlan = body.currentPlan as WeeklyPlanDraft | undefined;

  if (!currentPlan || !isValidCurrentPlan(currentPlan)) {
    return NextResponse.json(
      { error: "計画データが不正です。" },
      { status: 400 }
    );
  }

  try {
    const suggestion = await generateImprovementSuggestion({
      birthYear: profile.birth_year,
      goal: profile.goal,
      gender: profile.gender,
      currentPlan,
    });
    return NextResponse.json({ suggestion });
  } catch (error) {
    console.error("Gemini improvement suggestion failed", error);
    return NextResponse.json(
      { error: "改善案の生成に失敗しました。時間をおいて再度お試しください。" },
      { status: 502 }
    );
  }
}
