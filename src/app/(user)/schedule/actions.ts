"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentWeekStartDate } from "@/lib/week";
import type { WeeklyPlanDraft } from "@/lib/gemini";

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

  revalidatePath("/schedule");
  revalidatePath("/home");
}
