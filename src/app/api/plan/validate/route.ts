import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { validatePlanIntensity } from "@/lib/intensity";
import { addDays, getCurrentWeekStartDate } from "@/lib/week";
import type { PlanItemDraft } from "@/lib/gemini";

/**
 * 運動強度の妥当性検証API（Phase 8）。
 * 登録しようとしている計画（AI提案・手動の両方）に対してルールベースの
 * 閾値チェックを行い、判定理由の一覧を返す。
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "認証が必要です。" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("birth_year")
    .eq("id", user.id)
    .single();

  if (!profile) {
    return NextResponse.json(
      { error: "プロフィールが未登録です。" },
      { status: 400 }
    );
  }

  const body = (await request.json().catch(() => null)) as {
    items?: PlanItemDraft[];
  } | null;
  if (!body?.items || !Array.isArray(body.items)) {
    return NextResponse.json({ error: "計画が不正です。" }, { status: 400 });
  }

  // 前週の計画（増加率チェック用）
  const previousWeekStart = addDays(getCurrentWeekStartDate(), -7);
  const { data: prevPlan } = await supabase
    .from("training_plans")
    .select("id")
    .eq("user_id", user.id)
    .eq("week_start_date", previousWeekStart)
    .maybeSingle();

  let previousItems: PlanItemDraft[] | null = null;
  if (prevPlan) {
    const { data: prevItems } = await supabase
      .from("plan_items")
      .select("day_of_week, exercise_name, category, sets, reps, weight_kg, duration_min")
      .eq("plan_id", prevPlan.id);
    previousItems = (prevItems ?? []).map((item) => ({
      dayOfWeek: item.day_of_week,
      exerciseName: item.exercise_name,
      category: item.category,
      sets: item.sets,
      reps: item.reps,
      weightKg: item.weight_kg,
      durationMin: item.duration_min,
    }));
  }

  const warnings = validatePlanIntensity({
    birthYear: profile.birth_year,
    items: body.items,
    previousItems,
  });

  return NextResponse.json({ warnings });
}
