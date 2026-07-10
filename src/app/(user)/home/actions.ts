"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { validateWorkoutInput } from "@/lib/workout-limits";

export interface WorkoutLogInput {
  planItemId: string;
  performedOn: string;
  setsDone: number | null;
  repsDone: number | null;
  weightKg: number | null;
  durationMin: number | null;
}

/**
 * トレーニング実績を記録する。
 * 同じ利用者・plan_item・日付の記録がすでにあれば更新し、なければ新規作成する
 * （workout_logsにはDBレベルの一意制約がないため、事前にselectして判定する）。
 */
export async function logWorkout(input: WorkoutLogInput) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("認証が必要です。");
  }

  const validationError = validateWorkoutInput(input);
  if (validationError) {
    throw new Error(validationError);
  }

  const { data: existing } = await supabase
    .from("workout_logs")
    .select("id")
    .eq("user_id", user.id)
    .eq("plan_item_id", input.planItemId)
    .eq("performed_on", input.performedOn)
    .maybeSingle();

  const values = {
    sets_done: input.setsDone,
    reps_done: input.repsDone,
    weight_kg: input.weightKg,
    duration_min: input.durationMin,
  };

  if (existing) {
    const { error } = await supabase
      .from("workout_logs")
      .update(values)
      .eq("id", existing.id);
    if (error) throw new Error("記録の更新に失敗しました。");
  } else {
    const { error } = await supabase.from("workout_logs").insert({
      user_id: user.id,
      plan_item_id: input.planItemId,
      performed_on: input.performedOn,
      ...values,
    });
    if (error) throw new Error("記録の保存に失敗しました。");
  }

  revalidatePath("/home");
  revalidatePath("/schedule");
  revalidatePath("/progress");
}
