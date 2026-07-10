"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentWeekStartDate } from "@/lib/week";
import { syncPlanToCalendar, type CalendarDayPlan } from "@/lib/calendar";
import type { PlanItemDraft, WeeklyPlanDraft } from "@/lib/gemini";

/** 種目1件をカレンダーの説明用テキストにする（例：スクワット（3セット×10回×45kg 20分）） */
function toExerciseLine(item: PlanItemDraft): string {
  const parts = [
    item.sets ? `${item.sets}セット` : null,
    item.reps ? `${item.reps}回` : null,
    item.weightKg ? `${item.weightKg}kg` : null,
  ].filter(Boolean);
  const detail =
    parts.join("×") + (item.durationMin ? ` ${item.durationMin}分` : "");
  return detail ? `${item.exerciseName}（${detail.trim()}）` : item.exerciseName;
}

/**
 * 確認済みの週間計画を保存する。
 * 同じ週にすでに計画がある場合は削除して作り直す（plan_itemsはON DELETE CASCADE）。
 */
export async function saveTrainingPlan(
  plan: WeeklyPlanDraft,
  source: "ai" | "manual",
  goal: string,
  accepted: boolean
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("認証が必要です。");
  }

  const weekStartDate = getCurrentWeekStartDate();

  const { data: existing } = await supabase
    .from("training_plans")
    .select("id")
    .eq("user_id", user.id)
    .eq("week_start_date", weekStartDate)
    .maybeSingle();

  if (existing) {
    await supabase.from("training_plans").delete().eq("id", existing.id);
  }

  const { data: newPlan, error: planError } = await supabase
    .from("training_plans")
    .insert({
      user_id: user.id,
      week_start_date: weekStartDate,
      status: "active",
      source,
      summary: plan.summary || null,
    })
    .select("id")
    .single();

  if (planError || !newPlan) {
    throw new Error("計画の保存に失敗しました。");
  }

  if (plan.items.length > 0) {
    const items = plan.items.map((item, index) => ({
      plan_id: newPlan.id,
      day_of_week: item.dayOfWeek,
      exercise_name: item.exerciseName,
      category: item.category,
      sets: item.sets,
      reps: item.reps,
      weight_kg: item.weightKg,
      duration_min: item.durationMin,
      sort_order: index,
    }));

    const { error: itemsError } = await supabase
      .from("plan_items")
      .insert(items);

    if (itemsError) {
      throw new Error("計画項目の保存に失敗しました。");
    }
  }

  await supabase.from("ai_proposal_logs").insert({
    user_id: user.id,
    goal,
    proposal_json: plan,
    accepted,
  });

  // カレンダー連携済みならトレーニング予定をGoogleカレンダーへ自動追加（Phase 6）。
  // 同期失敗は計画保存の成功を妨げない（連携は補助機能のため）。
  const { data: calendarToken } = await supabase
    .from("calendar_tokens")
    .select("refresh_token")
    .eq("user_id", user.id)
    .maybeSingle();
  if (calendarToken) {
    const byDay = new Map<number, string[]>();
    for (const item of plan.items) {
      byDay.set(item.dayOfWeek, [
        ...(byDay.get(item.dayOfWeek) ?? []),
        toExerciseLine(item),
      ]);
    }
    const dayPlans: CalendarDayPlan[] = Array.from(byDay.entries()).map(
      ([dayOfWeek, exerciseLines]) => ({ dayOfWeek, exerciseLines })
    );
    try {
      await syncPlanToCalendar(
        calendarToken.refresh_token,
        weekStartDate,
        dayPlans
      );
    } catch (error) {
      console.error("Calendar sync failed", error);
    }
  }

  revalidatePath("/schedule");
  revalidatePath("/home");
}
